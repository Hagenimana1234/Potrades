import prisma from '../utils/database';
import tradingService from './trading.service';
import walletService from './wallet.service';
import logger from '../utils/logger';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  InsufficientBalanceError,
} from '../utils/errors';
import { CopyTraderStatus, CopyRelationshipStatus, WalletType } from '@prisma/client';
import { Decimal } from 'decimal.js';

export class CopyTradingService {
  /**
   * Apply to become a copy trader
   */
  async applyAsCopyTrader(userId: string, data: {
    minCopyAmount: number;
    maxCopyAmount: number;
    profitSharePercent: number;
    displayName?: string;
    bio?: string;
  }) {
    // Check if already a copy trader
    const existing = await prisma.copyTrader.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictError('User is already a copy trader');
    }

    // Validate amounts
    if (data.minCopyAmount >= data.maxCopyAmount) {
      throw new ValidationError('Min copy amount must be less than max copy amount');
    }

    if (data.profitSharePercent < 0 || data.profitSharePercent > 50) {
      throw new ValidationError('Profit share must be between 0 and 50%');
    }

    const copyTrader = await prisma.copyTrader.create({
      data: {
        userId,
        status: CopyTraderStatus.PENDING,
        minCopyAmount: data.minCopyAmount,
        maxCopyAmount: data.maxCopyAmount,
        profitSharePercent: data.profitSharePercent,
        displayName: data.displayName,
        bio: data.bio,
      },
    });

    logger.info(`User ${userId} applied as copy trader`);

    return copyTrader;
  }

  /**
   * Admin: Approve copy trader
   */
  async approveCopyTrader(copyTraderId: string, adminId: string) {
    const copyTrader = await prisma.copyTrader.update({
      where: { id: copyTraderId },
      data: {
        status: CopyTraderStatus.ACTIVE,
        approvedAt: new Date(),
        approvedBy: adminId,
      },
    });

    logger.info(`Copy trader ${copyTraderId} approved by admin ${adminId}`);

    return copyTrader;
  }

  /**
   * Admin: Suspend copy trader
   */
  async suspendCopyTrader(copyTraderId: string, adminId: string) {
    const copyTrader = await prisma.copyTrader.update({
      where: { id: copyTraderId },
      data: { status: CopyTraderStatus.SUSPENDED },
    });

    // Stop all active copy relationships
    await prisma.copyRelationship.updateMany({
      where: {
        masterTraderId: copyTraderId,
        status: CopyRelationshipStatus.ACTIVE,
      },
      data: {
        status: CopyRelationshipStatus.STOPPED,
        stoppedAt: new Date(),
      },
    });

    logger.info(`Copy trader ${copyTraderId} suspended by admin ${adminId}`);

    return copyTrader;
  }

  /**
   * Get all public copy traders with stats
   */
  async getPublicCopyTraders(filters?: {
    minWinRate?: number;
    minTotalTrades?: number;
    sortBy?: 'winRate' | 'totalProfit' | 'totalTrades';
    limit?: number;
    offset?: number;
  }) {
    const {
      minWinRate = 0,
      minTotalTrades = 10,
      sortBy = 'winRate',
      limit = 50,
      offset = 0,
    } = filters || {};

    const where: any = {
      status: CopyTraderStatus.ACTIVE,
      isPublic: true,
      totalTrades: { gte: minTotalTrades },
      winRate: { gte: minWinRate },
    };

    const orderBy: any = {};
    orderBy[sortBy] = 'desc';

    const [copyTraders, total] = await Promise.all([
      prisma.copyTrader.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              followers: true,
            },
          },
        },
      }),
      prisma.copyTrader.count({ where }),
    ]);

    return {
      copyTraders,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get copy trader details
   */
  async getCopyTraderDetails(copyTraderId: string) {
    const copyTrader = await prisma.copyTrader.findUnique({
      where: { id: copyTraderId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            followers: true,
          },
        },
      },
    });

    if (!copyTrader) {
      throw new NotFoundError('Copy trader not found');
    }

    return copyTrader;
  }

  /**
   * Follow a copy trader
   */
  async followCopyTrader(
    followerId: string,
    copyTraderId: string,
    config: {
      copyMode: 'FIXED' | 'PERCENT';
      copyAmount?: number;
      copyPercent?: number;
      maxDailyLoss?: number;
    }
  ) {
    // Validate copy trader
    const copyTrader = await prisma.copyTrader.findUnique({
      where: { id: copyTraderId },
    });

    if (!copyTrader) {
      throw new NotFoundError('Copy trader not found');
    }

    if (copyTrader.status !== CopyTraderStatus.ACTIVE) {
      throw new ValidationError('Copy trader is not active');
    }

    if (copyTrader.userId === followerId) {
      throw new ValidationError('Cannot follow yourself');
    }

    // Check if already following
    const existing = await prisma.copyRelationship.findUnique({
      where: {
        followerId_masterTraderId: {
          followerId,
          masterTraderId: copyTraderId,
        },
      },
    });

    if (existing && existing.status === CopyRelationshipStatus.ACTIVE) {
      throw new ConflictError('Already following this copy trader');
    }

    // Validate config
    if (config.copyMode === 'FIXED' && !config.copyAmount) {
      throw new ValidationError('Copy amount required for FIXED mode');
    }

    if (config.copyMode === 'PERCENT' && !config.copyPercent) {
      throw new ValidationError('Copy percent required for PERCENT mode');
    }

    if (config.copyAmount) {
      if (config.copyAmount < copyTrader.minCopyAmount.toNumber()) {
        throw new ValidationError(
          `Minimum copy amount is ${copyTrader.minCopyAmount.toString()}`
        );
      }
      if (config.copyAmount > copyTrader.maxCopyAmount.toNumber()) {
        throw new ValidationError(
          `Maximum copy amount is ${copyTrader.maxCopyAmount.toString()}`
        );
      }
    }

    // Create or reactivate relationship
    const relationship = await prisma.copyRelationship.upsert({
      where: {
        followerId_masterTraderId: {
          followerId,
          masterTraderId: copyTraderId,
        },
      },
      create: {
        followerId,
        masterTraderId: copyTraderId,
        status: CopyRelationshipStatus.ACTIVE,
        copyMode: config.copyMode,
        copyAmount: config.copyAmount,
        copyPercent: config.copyPercent,
        maxDailyLoss: config.maxDailyLoss,
      },
      update: {
        status: CopyRelationshipStatus.ACTIVE,
        copyMode: config.copyMode,
        copyAmount: config.copyAmount,
        copyPercent: config.copyPercent,
        maxDailyLoss: config.maxDailyLoss,
        startedAt: new Date(),
        stoppedAt: null,
      },
    });

    logger.info(`User ${followerId} started following copy trader ${copyTraderId}`);

    return relationship;
  }

  /**
   * Stop following a copy trader
   */
  async unfollowCopyTrader(followerId: string, copyTraderId: string) {
    const relationship = await prisma.copyRelationship.findUnique({
      where: {
        followerId_masterTraderId: {
          followerId,
          masterTraderId: copyTraderId,
        },
      },
    });

    if (!relationship) {
      throw new NotFoundError('Copy relationship not found');
    }

    await prisma.copyRelationship.update({
      where: { id: relationship.id },
      data: {
        status: CopyRelationshipStatus.STOPPED,
        stoppedAt: new Date(),
      },
    });

    logger.info(`User ${followerId} stopped following copy trader ${copyTraderId}`);
  }

  /**
   * Get user's copy relationships (who they're following)
   */
  async getUserCopyRelationships(userId: string) {
    return prisma.copyRelationship.findMany({
      where: { followerId: userId },
      include: {
        masterTrader: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Execute copy trade when master places a trade
   */
  async executeCopyTrades(masterTradeId: string, masterTrade: any) {
    // Get active followers
    const relationships = await prisma.copyRelationship.findMany({
      where: {
        masterTraderId: masterTrade.userId,
        status: CopyRelationshipStatus.ACTIVE,
      },
      include: {
        follower: true,
        masterTrader: true,
      },
    });

    if (relationships.length === 0) {
      return;
    }

    logger.info(
      `Executing ${relationships.length} copy trades for master trade ${masterTradeId}`
    );

    // Execute copy trades for each follower
    for (const relationship of relationships) {
      try {
        // Calculate copy amount
        let copyAmount: number;

        if (relationship.copyMode === 'FIXED') {
          copyAmount = relationship.copyAmount?.toNumber() || 0;
        } else {
          // PERCENT mode
          const percent = relationship.copyPercent?.toNumber() || 100;
          const masterAmount = new Decimal(masterTrade.amount.toString());
          copyAmount = masterAmount.times(percent).dividedBy(100).toNumber();
        }

        // Check daily loss limit
        if (relationship.maxDailyLoss) {
          const todayLoss = await this.getTodayLoss(relationship.followerId);
          if (todayLoss >= relationship.maxDailyLoss.toNumber()) {
            logger.warn(
              `Max daily loss reached for follower ${relationship.followerId}, skipping copy trade`
            );
            continue;
          }
        }

        // Get follower's wallet
        const followerWallet = await walletService.getWallet(
          relationship.followerId,
          masterTrade.wallet.type
        );

        // Check if follower has sufficient balance
        const balance = new Decimal(followerWallet.balance.toString());
        if (balance.lessThan(copyAmount)) {
          logger.warn(
            `Insufficient balance for follower ${relationship.followerId}, skipping copy trade`
          );
          continue;
        }

        // Place copy trade
        await tradingService.placeTrade({
          userId: relationship.followerId,
          assetId: masterTrade.assetId,
          walletType: masterTrade.wallet.type,
          direction: masterTrade.direction,
          amount: copyAmount,
          expirySeconds: masterTrade.expirySeconds,
          isCopyTrade: true,
          masterTradeId,
        });

        // Update copy stats
        await prisma.copyRelationship.update({
          where: { id: relationship.id },
          data: {
            totalCopied: { increment: 1 },
          },
        });

        logger.info(
          `Copy trade executed for follower ${relationship.followerId}, amount: ${copyAmount}`
        );
      } catch (error) {
        logger.error(
          `Failed to execute copy trade for follower ${relationship.followerId}:`,
          error
        );
        // Continue with other followers
      }
    }
  }

  /**
   * Update copy trader stats after trade settlement
   */
  async updateCopyTraderStats(userId: string, trade: any) {
    const copyTrader = await prisma.copyTrader.findUnique({
      where: { userId },
    });

    if (!copyTrader) {
      return;
    }

    const won = trade.status === 'WON';
    const profit = new Decimal(trade.profit?.toString() || '0');

    await prisma.copyTrader.update({
      where: { id: copyTrader.id },
      data: {
        totalTrades: { increment: 1 },
        wonTrades: won ? { increment: 1 } : undefined,
        lostTrades: !won && trade.status === 'LOST' ? { increment: 1 } : undefined,
        totalProfit: { increment: profit.toNumber() },
        totalVolume: { increment: trade.amount.toNumber() },
        winRate:
          copyTrader.totalTrades > 0
            ? (copyTrader.wonTrades / (copyTrader.totalTrades + 1)) * 100
            : 0,
      },
    });

    logger.info(`Updated stats for copy trader ${copyTrader.id}`);
  }

  /**
   * Get today's loss for a follower
   */
  private async getTodayLoss(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await prisma.trade.aggregate({
      where: {
        userId,
        isCopyTrade: true,
        createdAt: { gte: today },
        status: 'LOST',
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount?.toNumber() || 0;
  }

  /**
   * Get followers of a copy trader
   */
  async getCopyTraderFollowers(copyTraderId: string) {
    return prisma.copyRelationship.findMany({
      where: {
        masterTraderId: copyTraderId,
        status: CopyRelationshipStatus.ACTIVE,
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }
}

export default new CopyTradingService();
