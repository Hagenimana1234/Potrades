import prisma from '../utils/database';
import tradingService from './trading.service';
import walletService from './wallet.service';
import logger from '../utils/logger';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  
} from '../utils/errors';
import { CopyTraderStatus, CopyRelationshipStatus } from '@prisma/client';
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

  /**
   * Get my copy trader profile (if I'm a copy trader)
   */
  async getMyCopyTraderProfile(userId: string) {
    const copyTrader = await prisma.copyTrader.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
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
      return null;
    }

    // Get active followers
    const activeFollowers = await prisma.copyRelationship.count({
      where: {
        masterTraderId: copyTrader.id,
        status: CopyRelationshipStatus.ACTIVE,
      },
    });

    // Get recent trades
    const recentTrades = await prisma.trade.findMany({
      where: {
        userId,
        status: { in: ['WON', 'LOST', 'DRAW'] },
      },
      orderBy: { closedAt: 'desc' },
      take: 10,
      include: {
        asset: {
          select: {
            symbol: true,
            name: true,
          },
        },
      },
    });

    return {
      ...copyTrader,
      activeFollowers,
      recentTrades,
    };
  }

  /**
   * Update copy trader profile
   */
  async updateCopyTraderProfile(userId: string, data: {
    displayName?: string;
    bio?: string;
    avatar?: string;
    minCopyAmount?: number;
    maxCopyAmount?: number;
    profitSharePercent?: number;
    isPublic?: boolean;
  }) {
    const copyTrader = await prisma.copyTrader.findUnique({
      where: { userId },
    });

    if (!copyTrader) {
      throw new NotFoundError('Copy trader profile not found');
    }

    // Validate amounts if provided
    if (data.minCopyAmount !== undefined && data.maxCopyAmount !== undefined) {
      if (data.minCopyAmount >= data.maxCopyAmount) {
        throw new ValidationError('Min copy amount must be less than max copy amount');
      }
    }

    // Validate profit share
    if (data.profitSharePercent !== undefined) {
      if (data.profitSharePercent < 0 || data.profitSharePercent > 50) {
        throw new ValidationError('Profit share must be between 0 and 50%');
      }
    }

    const updated = await prisma.copyTrader.update({
      where: { userId },
      data: {
        displayName: data.displayName,
        bio: data.bio,
        avatar: data.avatar,
        minCopyAmount: data.minCopyAmount,
        maxCopyAmount: data.maxCopyAmount,
        profitSharePercent: data.profitSharePercent,
        isPublic: data.isPublic,
      },
    });

    logger.info(`Copy trader ${copyTrader.id} profile updated`);

    return updated;
  }

  /**
   * Pause copy relationship
   */
  async pauseCopyRelationship(followerId: string, copyTraderId: string) {
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

    if (relationship.status !== CopyRelationshipStatus.ACTIVE) {
      throw new ValidationError('Can only pause active relationships');
    }

    await prisma.copyRelationship.update({
      where: { id: relationship.id },
      data: {
        status: CopyRelationshipStatus.PAUSED,
      },
    });

    logger.info(`User ${followerId} paused copy relationship with ${copyTraderId}`);
  }

  /**
   * Resume copy relationship
   */
  async resumeCopyRelationship(followerId: string, copyTraderId: string) {
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

    if (relationship.status !== CopyRelationshipStatus.PAUSED) {
      throw new ValidationError('Can only resume paused relationships');
    }

    await prisma.copyRelationship.update({
      where: { id: relationship.id },
      data: {
        status: CopyRelationshipStatus.ACTIVE,
      },
    });

    logger.info(`User ${followerId} resumed copy relationship with ${copyTraderId}`);
  }

  /**
   * Update copy relationship settings
   */
  async updateCopyRelationship(
    followerId: string,
    copyTraderId: string,
    config: {
      copyMode?: 'FIXED' | 'PERCENT';
      copyAmount?: number;
      copyPercent?: number;
      maxDailyLoss?: number;
    }
  ) {
    const relationship = await prisma.copyRelationship.findUnique({
      where: {
        followerId_masterTraderId: {
          followerId,
          masterTraderId: copyTraderId,
        },
      },
      include: {
        masterTrader: true,
      },
    });

    if (!relationship) {
      throw new NotFoundError('Copy relationship not found');
    }

    // Validate config
    if (config.copyMode === 'FIXED' && config.copyAmount !== undefined) {
      const copyTrader = relationship.masterTrader;
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

    await prisma.copyRelationship.update({
      where: { id: relationship.id },
      data: {
        copyMode: config.copyMode,
        copyAmount: config.copyAmount,
        copyPercent: config.copyPercent,
        maxDailyLoss: config.maxDailyLoss,
      },
    });

    logger.info(`Copy relationship updated for follower ${followerId}`);
  }

  /**
   * Get performance metrics for a copy trader
   */
  async getCopyTraderPerformance(copyTraderId: string, days: number = 30) {
    const copyTrader = await this.getCopyTraderDetails(copyTraderId);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get trades in the period
    const trades = await prisma.trade.findMany({
      where: {
        userId: copyTrader.userId,
        createdAt: { gte: startDate },
        status: { in: ['WON', 'LOST', 'DRAW'] },
      },
      orderBy: { closedAt: 'desc' },
      include: {
        asset: {
          select: {
            symbol: true,
            type: true,
          },
        },
      },
    });

    // Calculate daily P&L
    const dailyPnL: Record<string, number> = {};
    trades.forEach((trade) => {
      const date = new Date(trade.closedAt || trade.createdAt).toISOString().split('T')[0];
      if (!dailyPnL[date]) dailyPnL[date] = 0;
      dailyPnL[date] += trade.profit?.toNumber() || 0;
    });

    // Asset distribution
    const assetStats: Record<string, { trades: number; profit: number }> = {};
    trades.forEach((trade) => {
      const symbol = trade.asset.symbol;
      if (!assetStats[symbol]) {
        assetStats[symbol] = { trades: 0, profit: 0 };
      }
      assetStats[symbol].trades++;
      assetStats[symbol].profit += trade.profit?.toNumber() || 0;
    });

    // Calculate streak
    let currentStreak = 0;
    let bestStreak = 0;
    let worstStreak = 0;
    let streak = 0;
    let lastStatus: string | null = null;

    const sortedTrades = [...trades].sort((a, b) =>
      new Date(a.closedAt || a.createdAt).getTime() - new Date(b.closedAt || b.createdAt).getTime()
    );

    sortedTrades.forEach((trade) => {
      if (trade.status === 'WON') {
        if (lastStatus === 'WON') {
          streak++;
        } else {
          if (lastStatus === 'LOST' && streak < 0) {
            worstStreak = Math.min(worstStreak, streak);
          }
          streak = 1;
        }
        lastStatus = 'WON';
      } else if (trade.status === 'LOST') {
        if (lastStatus === 'LOST') {
          streak--;
        } else {
          if (lastStatus === 'WON' && streak > 0) {
            bestStreak = Math.max(bestStreak, streak);
          }
          streak = -1;
        }
        lastStatus = 'LOST';
      }
    });

    if (streak > 0) {
      bestStreak = Math.max(bestStreak, streak);
      currentStreak = streak;
    } else if (streak < 0) {
      worstStreak = Math.min(worstStreak, streak);
      currentStreak = streak;
    }

    return {
      period: {
        days,
        startDate,
        endDate: new Date(),
      },
      trades: {
        total: trades.length,
        won: trades.filter((t) => t.status === 'WON').length,
        lost: trades.filter((t) => t.status === 'LOST').length,
        draw: trades.filter((t) => t.status === 'DRAW').length,
      },
      profit: {
        total: trades.reduce((sum, t) => sum + (t.profit?.toNumber() || 0), 0),
        average: trades.length > 0
          ? trades.reduce((sum, t) => sum + (t.profit?.toNumber() || 0), 0) / trades.length
          : 0,
        best: Math.max(...trades.map((t) => t.profit?.toNumber() || 0), 0),
        worst: Math.min(...trades.map((t) => t.profit?.toNumber() || 0), 0),
      },
      streaks: {
        current: currentStreak,
        best: bestStreak,
        worst: worstStreak,
      },
      dailyPnL,
      assetStats,
      recentTrades: trades.slice(0, 20),
    };
  }

  /**
   * Get follower statistics for a copy trader
   */
  async getFollowerStatistics(copyTraderId: string) {
    const relationships = await prisma.copyRelationship.findMany({
      where: { masterTraderId: copyTraderId },
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
    });

    const active = relationships.filter((r) => r.status === CopyRelationshipStatus.ACTIVE);
    const paused = relationships.filter((r) => r.status === CopyRelationshipStatus.PAUSED);
    const stopped = relationships.filter((r) => r.status === CopyRelationshipStatus.STOPPED);

    const totalCopiedTrades = relationships.reduce((sum, r) => sum + r.totalCopied, 0);
    const totalProfit = relationships.reduce((sum, r) => sum + r.totalProfit.toNumber(), 0);

    return {
      total: relationships.length,
      active: active.length,
      paused: paused.length,
      stopped: stopped.length,
      totalCopiedTrades,
      totalProfit,
      relationships: active.map((r) => ({
        id: r.id,
        follower: r.follower,
        copyMode: r.copyMode,
        copyAmount: r.copyAmount,
        copyPercent: r.copyPercent,
        totalCopied: r.totalCopied,
        totalProfit: r.totalProfit,
        startedAt: r.startedAt,
      })),
    };
  }
}

export default new CopyTradingService();
