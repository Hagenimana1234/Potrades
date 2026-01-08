import prisma from '../utils/database';
import walletService from './wallet.service';
import {
  TradingError,
  NotFoundError,
  ValidationError,
  InsufficientBalanceError,
} from '../utils/errors';
import { Decimal } from 'decimal.js';
import logger from '../utils/logger';
import { TradeDirection, TradeStatus, WalletType } from '@prisma/client';
import { add } from 'date-fns';

export interface PlaceTradeParams {
  userId: string;
  assetId: string;
  walletType: WalletType;
  direction: TradeDirection;
  amount: number;
  expirySeconds: number;
  isCopyTrade?: boolean;
  masterTradeId?: string;
}

export class TradingService {
  /**
   * Place a new trade
   */
  async placeTrade(params: PlaceTradeParams) {
    const {
      userId,
      assetId,
      walletType,
      direction,
      amount,
      expirySeconds,
      isCopyTrade = false,
      masterTradeId,
    } = params;

    // Validate asset
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    if (!asset.isActive) {
      throw new TradingError('Asset is not active for trading');
    }

    // Validate amount
    const amountDecimal = new Decimal(amount);
    const minAmount = new Decimal(asset.minTradeAmount.toString());
    const maxAmount = new Decimal(asset.maxTradeAmount.toString());

    if (amountDecimal.lessThan(minAmount)) {
      throw new ValidationError(
        `Minimum trade amount is ${asset.minTradeAmount.toString()}`
      );
    }

    if (amountDecimal.greaterThan(maxAmount)) {
      throw new ValidationError(
        `Maximum trade amount is ${asset.maxTradeAmount.toString()}`
      );
    }

    // Validate against risk limits
    await this.validateTradeAgainstRiskLimits(userId, amount);

    // Get wallet
    const wallet = await walletService.getWallet(userId, walletType);

    // Check balance
    const availableBalance = new Decimal(wallet.balance.toString());
    if (availableBalance.lessThan(amountDecimal)) {
      throw new InsufficientBalanceError(
        `Insufficient balance. Required: ${amount}, Available: ${availableBalance.toString()}`
      );
    }

    // Get current price
    const currentPrice = await this.getCurrentPrice(assetId);
    if (!currentPrice) {
      throw new TradingError('Unable to get current price');
    }

    // Calculate expiry time
    const openedAt = new Date();
    const expiresAt = add(openedAt, { seconds: expirySeconds });

    // Create trade and lock balance in transaction
    const trade = await prisma.$transaction(async (tx) => {
      // Lock balance
      await walletService.lockBalance(wallet.id, amount);

      // Create trade
      const newTrade = await tx.trade.create({
        data: {
          userId,
          walletId: wallet.id,
          assetId,
          direction,
          amount,
          payoutPercent: asset.payoutPercent,
          expirySeconds,
          status: TradeStatus.OPEN,
          openPrice: currentPrice,
          openedAt,
          expiresAt,
          isCopyTrade,
          masterTradeId,
        },
        include: {
          asset: {
            select: {
              symbol: true,
              name: true,
            },
          },
          wallet: {
            select: {
              type: true,
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'TRADE_PLACED',
          entity: 'Trade',
          entityId: newTrade.id,
          details: {
            assetId,
            symbol: asset.symbol,
            direction,
            amount,
            openPrice: currentPrice,
            expirySeconds,
          },
        },
      });

      return newTrade;
    });

    logger.info(
      `Trade placed: ${trade.id} | User: ${userId} | Asset: ${asset.symbol} | Direction: ${direction} | Amount: ${amount} | Price: ${currentPrice}`
    );

    return trade;
  }

  /**
   * Settle a trade when it expires
   */
  async settleTrade(tradeId: string) {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        asset: true,
        wallet: true,
        user: true,
      },
    });

    if (!trade) {
      throw new NotFoundError('Trade not found');
    }

    if (trade.status !== TradeStatus.OPEN) {
      throw new TradingError('Trade is not open');
    }

    // Get close price
    const closePrice = await this.getCurrentPrice(trade.assetId);
    if (!closePrice) {
      throw new TradingError('Unable to get closing price');
    }

    const openPrice = new Decimal(trade.openPrice!.toString());
    const closePriceDecimal = new Decimal(closePrice);
    const tradeAmount = new Decimal(trade.amount.toString());
    const payoutPercent = new Decimal(trade.payoutPercent.toString());

    // Determine win/loss
    let won = false;
    let status = TradeStatus.LOST;

    if (trade.direction === TradeDirection.UP) {
      won = closePriceDecimal.greaterThan(openPrice);
    } else {
      won = closePriceDecimal.lessThan(openPrice);
    }

    // Handle draw (price didn't change)
    if (closePriceDecimal.equals(openPrice)) {
      status = TradeStatus.DRAW;
    } else {
      status = won ? TradeStatus.WON : TradeStatus.LOST;
    }

    // Calculate profit
    let profit = new Decimal(0);
    let profitPercent = new Decimal(0);

    if (status === TradeStatus.WON) {
      // Profit = trade_amount * (payout_percent / 100)
      profit = tradeAmount.times(payoutPercent).dividedBy(100);
      profitPercent = payoutPercent;
    } else if (status === TradeStatus.LOST) {
      // Loss = -trade_amount
      profit = tradeAmount.neg();
      profitPercent = new Decimal(-100);
    } else if (status === TradeStatus.DRAW) {
      // Refund (no profit or loss)
      profit = new Decimal(0);
      profitPercent = new Decimal(0);
    }

    const closedAt = new Date();

    // Update trade and settle wallet in transaction
    await prisma.$transaction(async (tx) => {
      // Update trade
      await tx.trade.update({
        where: { id: tradeId },
        data: {
          status,
          closePrice,
          closedAt,
          profit: profit.toNumber(),
          profitPercent: profitPercent.toNumber(),
        },
      });

      // Settle wallet
      await walletService.settleTrade(
        trade.userId,
        trade.walletId,
        tradeId,
        tradeAmount.toNumber(),
        profit.toNumber()
      );

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: trade.userId,
          action: 'TRADE_SETTLED',
          entity: 'Trade',
          entityId: tradeId,
          details: {
            status,
            openPrice: openPrice.toNumber(),
            closePrice: closePrice,
            profit: profit.toNumber(),
            profitPercent: profitPercent.toNumber(),
          },
        },
      });
    });

    logger.info(
      `Trade settled: ${tradeId} | Status: ${status} | Profit: ${profit.toString()} | Close Price: ${closePrice}`
    );

    return {
      tradeId,
      status,
      won,
      profit: profit.toNumber(),
      closePrice,
    };
  }

  /**
   * Cancel a trade (before settlement)
   */
  async cancelTrade(tradeId: string, userId: string) {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { wallet: true },
    });

    if (!trade) {
      throw new NotFoundError('Trade not found');
    }

    if (trade.userId !== userId) {
      throw new ValidationError('Unauthorized');
    }

    if (trade.status !== TradeStatus.PENDING) {
      throw new TradingError('Can only cancel pending trades');
    }

    await prisma.$transaction(async (tx) => {
      // Update trade status
      await tx.trade.update({
        where: { id: tradeId },
        data: { status: TradeStatus.CANCELLED },
      });

      // Unlock balance if it was locked
      if (trade.status === TradeStatus.OPEN || trade.status === TradeStatus.PENDING) {
        await walletService.unlockBalance(trade.walletId, trade.amount.toNumber());
      }
    });

    logger.info(`Trade cancelled: ${tradeId}`);
  }

  /**
   * Manually close an open trade before expiry
   */
  async closeTrade(tradeId: string, userId: string) {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        asset: true,
        wallet: true,
      },
    });

    if (!trade) {
      throw new NotFoundError('Trade not found');
    }

    if (trade.userId !== userId) {
      throw new ValidationError('Unauthorized to close this trade');
    }

    if (trade.status !== TradeStatus.OPEN) {
      throw new TradingError('Can only close open trades');
    }

    // Settle the trade immediately
    const result = await this.settleTrade(tradeId);

    logger.info(`Trade manually closed: ${tradeId} | Result: ${result.status}`);

    return result;
  }

  /**
   * Get or create user risk limits
   */
  async getUserRiskLimits(userId: string) {
    let riskLimit = await prisma.riskLimit.findUnique({
      where: { userId },
    });

    // If no custom limits, return defaults
    if (!riskLimit) {
      return {
        userId,
        maxTradeAmount: null, // null means no limit
        maxDailyLoss: null,
        maxOpenTrades: null,
        maxDailyTrades: null,
        cooldownSeconds: null,
        isActive: true,
      };
    }

    return riskLimit;
  }

  /**
   * Update user risk limits
   */
  async updateUserRiskLimits(userId: string, limits: {
    maxTradeAmount?: number | null;
    maxDailyLoss?: number | null;
    maxOpenTrades?: number | null;
    maxDailyTrades?: number | null;
    cooldownSeconds?: number | null;
  }) {
    const existingLimit = await prisma.riskLimit.findUnique({
      where: { userId },
    });

    if (existingLimit) {
      return await prisma.riskLimit.update({
        where: { userId },
        data: {
          maxTradeAmount: limits.maxTradeAmount,
          maxDailyLoss: limits.maxDailyLoss,
          maxOpenTrades: limits.maxOpenTrades,
          maxDailyTrades: limits.maxDailyTrades,
          cooldownSeconds: limits.cooldownSeconds,
        },
      });
    } else {
      return await prisma.riskLimit.create({
        data: {
          userId,
          maxTradeAmount: limits.maxTradeAmount,
          maxDailyLoss: limits.maxDailyLoss,
          maxOpenTrades: limits.maxOpenTrades,
          maxDailyTrades: limits.maxDailyTrades,
          cooldownSeconds: limits.cooldownSeconds,
          isActive: true,
        },
      });
    }
  }

  /**
   * Validate trade against risk limits
   */
  async validateTradeAgainstRiskLimits(userId: string, amount: number): Promise<boolean> {
    const riskLimit = await prisma.riskLimit.findUnique({
      where: { userId },
    });

    if (!riskLimit || !riskLimit.isActive) {
      return true; // No limits
    }

    // Check max trade amount
    if (riskLimit.maxTradeAmount && amount > riskLimit.maxTradeAmount.toNumber()) {
      throw new ValidationError(
        `Trade amount exceeds your risk limit of ${riskLimit.maxTradeAmount.toString()}`
      );
    }

    // Check max open trades
    if (riskLimit.maxOpenTrades) {
      const openTradesCount = await prisma.trade.count({
        where: {
          userId,
          status: TradeStatus.OPEN,
        },
      });

      if (openTradesCount >= riskLimit.maxOpenTrades) {
        throw new ValidationError(
          `You have reached your maximum open trades limit of ${riskLimit.maxOpenTrades}`
        );
      }
    }

    // Check max daily trades
    if (riskLimit.maxDailyTrades) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayTradesCount = await prisma.trade.count({
        where: {
          userId,
          createdAt: { gte: startOfDay },
        },
      });

      if (todayTradesCount >= riskLimit.maxDailyTrades) {
        throw new ValidationError(
          `You have reached your maximum daily trades limit of ${riskLimit.maxDailyTrades}`
        );
      }
    }

    // Check max daily loss
    if (riskLimit.maxDailyLoss) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayLoss = await prisma.trade.aggregate({
        where: {
          userId,
          createdAt: { gte: startOfDay },
          status: { in: [TradeStatus.WON, TradeStatus.LOST] },
        },
        _sum: { profit: true },
      });

      const currentLoss = todayLoss._sum.profit?.toNumber() || 0;
      if (currentLoss < 0 && Math.abs(currentLoss) >= riskLimit.maxDailyLoss.toNumber()) {
        throw new ValidationError(
          `You have reached your maximum daily loss limit of ${riskLimit.maxDailyLoss.toString()}`
        );
      }
    }

    return true;
  }

  /**
   * Get current price for an asset
   */
  async getCurrentPrice(assetId: string): Promise<number | null> {
    // Get most recent price
    const priceRecord = await prisma.price.findFirst({
      where: { assetId },
      orderBy: { timestamp: 'desc' },
    });

    return priceRecord ? priceRecord.price.toNumber() : null;
  }

  /**
   * Get user trades
   */
  async getUserTrades(
    userId: string,
    walletType?: WalletType,
    status?: TradeStatus,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = { userId };

    if (walletType) {
      const wallet = await walletService.getWallet(userId, walletType);
      where.walletId = wallet.id;
    }

    if (status) {
      where.status = status;
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          asset: {
            select: {
              symbol: true,
              name: true,
              type: true,
            },
          },
          wallet: {
            select: {
              type: true,
            },
          },
        },
      }),
      prisma.trade.count({ where }),
    ]);

    return {
      trades,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get trade statistics
   */
  async getUserTradeStats(userId: string, walletType?: WalletType) {
    const where: any = { userId };

    if (walletType) {
      const wallet = await walletService.getWallet(userId, walletType);
      where.walletId = wallet.id;
    }

    const [totalTrades, wonTrades, lostTrades, profitSum] = await Promise.all([
      prisma.trade.count({
        where: {
          ...where,
          status: { in: [TradeStatus.WON, TradeStatus.LOST, TradeStatus.DRAW] },
        },
      }),
      prisma.trade.count({
        where: { ...where, status: TradeStatus.WON },
      }),
      prisma.trade.count({
        where: { ...where, status: TradeStatus.LOST },
      }),
      prisma.trade.aggregate({
        where: {
          ...where,
          status: { in: [TradeStatus.WON, TradeStatus.LOST] },
        },
        _sum: { profit: true },
      }),
    ]);

    const winRate = totalTrades > 0 ? (wonTrades / totalTrades) * 100 : 0;
    const totalProfit = profitSum._sum.profit?.toNumber() || 0;

    return {
      totalTrades,
      wonTrades,
      lostTrades,
      drawTrades: totalTrades - wonTrades - lostTrades,
      winRate: Math.round(winRate * 100) / 100,
      totalProfit,
    };
  }

  /**
   * Get open trades (for monitoring)
   */
  async getOpenTrades(userId?: string) {
    const where: any = { status: TradeStatus.OPEN };

    if (userId) {
      where.userId = userId;
    }

    return prisma.trade.findMany({
      where,
      include: {
        asset: {
          select: {
            symbol: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { expiresAt: 'asc' },
    });
  }

  /**
   * Get trades that need settlement
   */
  async getTradesForSettlement() {
    return prisma.trade.findMany({
      where: {
        status: TradeStatus.OPEN,
        expiresAt: {
          lte: new Date(),
        },
      },
      include: {
        asset: true,
        wallet: true,
      },
    });
  }

  /**
   * Admin: Get all trades with filters
   */
  async adminGetTrades(filters: {
    userId?: string;
    assetId?: string;
    status?: TradeStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const {
      userId,
      assetId,
      status,
      startDate,
      endDate,
      limit = 100,
      offset = 0,
    } = filters;

    const where: any = {};

    if (userId) where.userId = userId;
    if (assetId) where.assetId = assetId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          asset: {
            select: {
              symbol: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          wallet: {
            select: {
              type: true,
            },
          },
        },
      }),
      prisma.trade.count({ where }),
    ]);

    return {
      trades,
      total,
      limit,
      offset,
    };
  }

  /**
   * Calculate platform exposure
   */
  async calculatePlatformExposure() {
    const openTrades = await prisma.trade.findMany({
      where: { status: TradeStatus.OPEN },
      select: {
        amount: true,
        payoutPercent: true,
        direction: true,
        asset: {
          select: {
            symbol: true,
          },
        },
      },
    });

    const totalExposure = openTrades.reduce((sum, trade) => {
      const maxPayout =
        trade.amount.toNumber() * (1 + trade.payoutPercent.toNumber() / 100);
      return sum + maxPayout;
    }, 0);

    const exposureByAsset = openTrades.reduce((acc: any, trade) => {
      const symbol = trade.asset.symbol;
      if (!acc[symbol]) {
        acc[symbol] = { up: 0, down: 0, total: 0 };
      }

      const maxPayout =
        trade.amount.toNumber() * (1 + trade.payoutPercent.toNumber() / 100);

      if (trade.direction === TradeDirection.UP) {
        acc[symbol].up += maxPayout;
      } else {
        acc[symbol].down += maxPayout;
      }
      acc[symbol].total += maxPayout;

      return acc;
    }, {});

    return {
      totalExposure,
      openTradesCount: openTrades.length,
      exposureByAsset,
    };
  }
}

export default new TradingService();
