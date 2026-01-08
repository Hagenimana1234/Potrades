import { prisma } from '../lib/prisma';
import { SignalType, SignalStatus, Prisma } from '@prisma/client';
import { ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Signals Service
 * Manages trading signals, subscriptions, and performance tracking
 * Signals can be created by admins/analysts and subscribed to by users
 */

interface CreateSignalInput {
  assetId: string;
  type: SignalType;
  entryPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  title: string;
  description?: string;
  timeframe?: string;
  tags?: string[];
  expiresAt?: Date;
}

interface UpdateSignalInput {
  type?: SignalType;
  status?: SignalStatus;
  targetPrice?: number;
  stopLoss?: number;
  title?: string;
  description?: string;
  timeframe?: string;
  tags?: string[];
  expiresAt?: Date;
  exitPrice?: number;
}

interface SignalFilters {
  assetId?: string;
  type?: SignalType;
  status?: SignalStatus;
  timeframe?: string;
  tags?: string[];
  createdBy?: string;
}

class SignalsService {
  /**
   * Create a new trading signal
   * Only admins, analysts, or approved signal providers can create signals
   */
  async createSignal(createdBy: string, input: CreateSignalInput) {
    // Validate asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: input.assetId },
    });

    if (!asset || !asset.isActive) {
      throw new ValidationError('Invalid or inactive asset');
    }

    // Validate price levels
    if (input.type === SignalType.BUY) {
      if (input.targetPrice && input.targetPrice <= input.entryPrice) {
        throw new ValidationError('Target price must be higher than entry price for BUY signals');
      }
      if (input.stopLoss && input.stopLoss >= input.entryPrice) {
        throw new ValidationError('Stop loss must be lower than entry price for BUY signals');
      }
    } else if (input.type === SignalType.SELL) {
      if (input.targetPrice && input.targetPrice >= input.entryPrice) {
        throw new ValidationError('Target price must be lower than entry price for SELL signals');
      }
      if (input.stopLoss && input.stopLoss <= input.entryPrice) {
        throw new ValidationError('Stop loss must be higher than entry price for SELL signals');
      }
    }

    const signal = await prisma.signal.create({
      data: {
        createdBy,
        assetId: input.assetId,
        type: input.type,
        entryPrice: new Prisma.Decimal(input.entryPrice),
        targetPrice: input.targetPrice ? new Prisma.Decimal(input.targetPrice) : null,
        stopLoss: input.stopLoss ? new Prisma.Decimal(input.stopLoss) : null,
        title: input.title,
        description: input.description,
        timeframe: input.timeframe,
        tags: input.tags || [],
        expiresAt: input.expiresAt,
      },
      include: {
        asset: true,
      },
    });

    logger.info(`Signal created: ${signal.id} | Type: ${signal.type} | Asset: ${asset.symbol}`);

    return signal;
  }

  /**
   * Get all signals with filtering and pagination
   */
  async getSignals(filters: SignalFilters = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const where: Prisma.SignalWhereInput = {
      ...(filters.assetId && { assetId: filters.assetId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.timeframe && { timeframe: filters.timeframe }),
      ...(filters.createdBy && { createdBy: filters.createdBy }),
      ...(filters.tags && filters.tags.length > 0 && {
        tags: { hasSome: filters.tags },
      }),
    };

    const [signals, total] = await Promise.all([
      prisma.signal.findMany({
        where,
        skip,
        take: limit,
        include: {
          asset: true,
          subscribers: {
            select: {
              userId: true,
              autoCopy: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.signal.count({ where }),
    ]);

    return {
      signals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get active signals only
   */
  async getActiveSignals(assetId?: string, limit = 20) {
    const where: Prisma.SignalWhereInput = {
      status: SignalStatus.ACTIVE,
      ...(assetId && { assetId }),
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    const signals = await prisma.signal.findMany({
      where,
      take: limit,
      include: {
        asset: true,
        subscribers: {
          select: {
            userId: true,
            autoCopy: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return signals;
  }

  /**
   * Get signal by ID
   */
  async getSignalById(signalId: string) {
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
      include: {
        asset: true,
        subscribers: {
          select: {
            userId: true,
            autoCopy: true,
            copyAmount: true,
            subscribedAt: true,
          },
        },
      },
    });

    if (!signal) {
      throw new NotFoundError('Signal not found');
    }

    // Increment view count
    await prisma.signal.update({
      where: { id: signalId },
      data: { viewCount: { increment: 1 } },
    });

    return signal;
  }

  /**
   * Update a signal
   * Can update details, status, or close the signal
   */
  async updateSignal(signalId: string, createdBy: string, input: UpdateSignalInput) {
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
      include: { asset: true },
    });

    if (!signal) {
      throw new NotFoundError('Signal not found');
    }

    if (signal.createdBy !== createdBy) {
      throw new ValidationError('You can only update your own signals');
    }

    // If closing the signal, calculate performance
    let profitPercent: Prisma.Decimal | undefined;
    if (input.status === SignalStatus.CLOSED && input.exitPrice) {
      const entry = signal.entryPrice.toNumber();
      const exit = input.exitPrice;

      if (signal.type === SignalType.BUY) {
        profitPercent = new Prisma.Decimal(((exit - entry) / entry) * 100);
      } else if (signal.type === SignalType.SELL) {
        profitPercent = new Prisma.Decimal(((entry - exit) / entry) * 100);
      }
    }

    const updatedSignal = await prisma.signal.update({
      where: { id: signalId },
      data: {
        ...(input.type && { type: input.type }),
        ...(input.status && { status: input.status }),
        ...(input.targetPrice !== undefined && { targetPrice: new Prisma.Decimal(input.targetPrice) }),
        ...(input.stopLoss !== undefined && { stopLoss: new Prisma.Decimal(input.stopLoss) }),
        ...(input.title && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.timeframe !== undefined && { timeframe: input.timeframe }),
        ...(input.tags && { tags: input.tags }),
        ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
        ...(input.exitPrice !== undefined && { exitPrice: new Prisma.Decimal(input.exitPrice) }),
        ...(profitPercent && { profitPercent }),
        ...(input.status === SignalStatus.CLOSED && { closedAt: new Date() }),
      },
      include: {
        asset: true,
      },
    });

    logger.info(`Signal updated: ${signal.id} | Status: ${updatedSignal.status}`);

    return updatedSignal;
  }

  /**
   * Close a signal with exit price
   */
  async closeSignal(signalId: string, createdBy: string, exitPrice: number) {
    return this.updateSignal(signalId, createdBy, {
      status: SignalStatus.CLOSED,
      exitPrice,
    });
  }

  /**
   * Delete a signal
   * Only allowed if signal has no subscribers or is not CLOSED
   */
  async deleteSignal(signalId: string, createdBy: string) {
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
      include: {
        subscribers: true,
      },
    });

    if (!signal) {
      throw new NotFoundError('Signal not found');
    }

    if (signal.createdBy !== createdBy) {
      throw new ValidationError('You can only delete your own signals');
    }

    if (signal.subscribers.length > 0 && signal.status !== SignalStatus.CANCELLED) {
      throw new ValidationError('Cannot delete signal with active subscribers. Cancel it instead.');
    }

    await prisma.signal.delete({
      where: { id: signalId },
    });

    logger.info(`Signal deleted: ${signalId}`);
  }

  /**
   * Subscribe to a signal
   */
  async subscribeToSignal(userId: string, signalId: string, autoCopy = false, copyAmount?: number) {
    const signal = await prisma.signal.findUnique({
      where: { id: signalId },
    });

    if (!signal) {
      throw new NotFoundError('Signal not found');
    }

    if (signal.status !== SignalStatus.ACTIVE) {
      throw new ValidationError('Can only subscribe to active signals');
    }

    // Check if already subscribed
    const existing = await prisma.signalSubscription.findUnique({
      where: {
        userId_signalId: {
          userId,
          signalId,
        },
      },
    });

    if (existing) {
      throw new ValidationError('Already subscribed to this signal');
    }

    const subscription = await prisma.signalSubscription.create({
      data: {
        userId,
        signalId,
        autoCopy,
        copyAmount: copyAmount ? new Prisma.Decimal(copyAmount) : null,
      },
    });

    // Increment copy count
    await prisma.signal.update({
      where: { id: signalId },
      data: { copyCount: { increment: 1 } },
    });

    logger.info(`User ${userId} subscribed to signal ${signalId} | AutoCopy: ${autoCopy}`);

    return subscription;
  }

  /**
   * Unsubscribe from a signal
   */
  async unsubscribeFromSignal(userId: string, signalId: string) {
    const subscription = await prisma.signalSubscription.findUnique({
      where: {
        userId_signalId: {
          userId,
          signalId,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    await prisma.signalSubscription.delete({
      where: {
        userId_signalId: {
          userId,
          signalId,
        },
      },
    });

    // Decrement copy count
    await prisma.signal.update({
      where: { id: signalId },
      data: { copyCount: { decrement: 1 } },
    });

    logger.info(`User ${userId} unsubscribed from signal ${signalId}`);
  }

  /**
   * Update subscription settings
   */
  async updateSubscription(userId: string, signalId: string, autoCopy: boolean, copyAmount?: number) {
    const subscription = await prisma.signalSubscription.findUnique({
      where: {
        userId_signalId: {
          userId,
          signalId,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    const updated = await prisma.signalSubscription.update({
      where: {
        userId_signalId: {
          userId,
          signalId,
        },
      },
      data: {
        autoCopy,
        copyAmount: copyAmount ? new Prisma.Decimal(copyAmount) : null,
      },
    });

    return updated;
  }

  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(userId: string) {
    const subscriptions = await prisma.signalSubscription.findMany({
      where: { userId },
      include: {
        signal: {
          include: {
            asset: true,
          },
        },
      },
      orderBy: { subscribedAt: 'desc' },
    });

    return subscriptions;
  }

  /**
   * Get signal provider's signals
   */
  async getProviderSignals(createdBy: string, status?: SignalStatus) {
    const where: Prisma.SignalWhereInput = {
      createdBy,
      ...(status && { status }),
    };

    const signals = await prisma.signal.findMany({
      where,
      include: {
        asset: true,
        subscribers: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return signals;
  }

  /**
   * Get signal provider performance stats
   */
  async getProviderPerformance(createdBy: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const signals = await prisma.signal.findMany({
      where: {
        createdBy,
        createdAt: { gte: since },
        status: SignalStatus.CLOSED,
        profitPercent: { not: null },
      },
      orderBy: { closedAt: 'desc' },
    });

    const totalSignals = signals.length;
    const successfulSignals = signals.filter((s) => s.profitPercent && s.profitPercent.toNumber() > 0).length;
    const failedSignals = signals.filter((s) => s.profitPercent && s.profitPercent.toNumber() < 0).length;
    const neutralSignals = signals.filter((s) => s.profitPercent && s.profitPercent.toNumber() === 0).length;

    const successRate = totalSignals > 0 ? (successfulSignals / totalSignals) * 100 : 0;

    const avgProfit =
      totalSignals > 0
        ? signals.reduce((sum, s) => sum + (s.profitPercent?.toNumber() || 0), 0) / totalSignals
        : 0;

    const bestSignal = signals.reduce((best, current) => {
      const currentProfit = current.profitPercent?.toNumber() || 0;
      const bestProfit = best?.profitPercent?.toNumber() || 0;
      return currentProfit > bestProfit ? current : best;
    }, signals[0]);

    const worstSignal = signals.reduce((worst, current) => {
      const currentProfit = current.profitPercent?.toNumber() || 0;
      const worstProfit = worst?.profitPercent?.toNumber() || 0;
      return currentProfit < worstProfit ? current : worst;
    }, signals[0]);

    // Calculate current streak
    let currentStreak = 0;
    let streakType: 'winning' | 'losing' | 'none' = 'none';
    const sortedSignals = [...signals].sort(
      (a, b) => (b.closedAt?.getTime() || 0) - (a.closedAt?.getTime() || 0)
    );

    for (const signal of sortedSignals) {
      const profit = signal.profitPercent?.toNumber() || 0;
      if (profit === 0) continue;

      const isWin = profit > 0;
      if (currentStreak === 0) {
        currentStreak = 1;
        streakType = isWin ? 'winning' : 'losing';
      } else if ((isWin && streakType === 'winning') || (!isWin && streakType === 'losing')) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Group by asset
    const assetStats: Record<string, { total: number; successful: number; avgProfit: number }> = {};
    signals.forEach((signal) => {
      const assetId = signal.assetId;
      if (!assetStats[assetId]) {
        assetStats[assetId] = { total: 0, successful: 0, avgProfit: 0 };
      }
      assetStats[assetId].total++;
      if (signal.profitPercent && signal.profitPercent.toNumber() > 0) {
        assetStats[assetId].successful++;
      }
      assetStats[assetId].avgProfit += signal.profitPercent?.toNumber() || 0;
    });

    Object.keys(assetStats).forEach((assetId) => {
      assetStats[assetId].avgProfit /= assetStats[assetId].total;
    });

    return {
      period: `${days} days`,
      totalSignals,
      successfulSignals,
      failedSignals,
      neutralSignals,
      successRate: parseFloat(successRate.toFixed(2)),
      avgProfit: parseFloat(avgProfit.toFixed(2)),
      bestSignal: bestSignal
        ? {
            id: bestSignal.id,
            title: bestSignal.title,
            profitPercent: bestSignal.profitPercent?.toNumber(),
          }
        : null,
      worstSignal: worstSignal
        ? {
            id: worstSignal.id,
            title: worstSignal.title,
            profitPercent: worstSignal.profitPercent?.toNumber(),
          }
        : null,
      currentStreak,
      streakType,
      assetStats,
      recentSignals: signals.slice(0, 10).map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        profitPercent: s.profitPercent?.toNumber(),
        closedAt: s.closedAt,
      })),
    };
  }

  /**
   * Get global signal performance stats
   */
  async getGlobalStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [totalSignals, activeSignals, closedSignals] = await Promise.all([
      prisma.signal.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.signal.count({
        where: {
          status: SignalStatus.ACTIVE,
          createdAt: { gte: since },
        },
      }),
      prisma.signal.count({
        where: {
          status: SignalStatus.CLOSED,
          createdAt: { gte: since },
        },
      }),
    ]);

    const closedWithResults = await prisma.signal.findMany({
      where: {
        status: SignalStatus.CLOSED,
        createdAt: { gte: since },
        profitPercent: { not: null },
      },
    });

    const successfulSignals = closedWithResults.filter((s) => s.profitPercent!.toNumber() > 0).length;
    const successRate = closedSignals > 0 ? (successfulSignals / closedSignals) * 100 : 0;

    const avgProfit =
      closedWithResults.length > 0
        ? closedWithResults.reduce((sum, s) => sum + (s.profitPercent?.toNumber() || 0), 0) /
          closedWithResults.length
        : 0;

    const totalSubscriptions = await prisma.signalSubscription.count();
    const activeSubscriptions = await prisma.signalSubscription.count({
      where: {
        signal: {
          status: SignalStatus.ACTIVE,
        },
      },
    });

    return {
      period: `${days} days`,
      totalSignals,
      activeSignals,
      closedSignals,
      successRate: parseFloat(successRate.toFixed(2)),
      avgProfit: parseFloat(avgProfit.toFixed(2)),
      totalSubscriptions,
      activeSubscriptions,
    };
  }

  /**
   * Automatically expire signals that have passed their expiry date
   * Should be called periodically (e.g., via cron job)
   */
  async expireOldSignals() {
    const expiredSignals = await prisma.signal.updateMany({
      where: {
        status: SignalStatus.ACTIVE,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: SignalStatus.EXPIRED,
      },
    });

    if (expiredSignals.count > 0) {
      logger.info(`Expired ${expiredSignals.count} signals`);
    }

    return expiredSignals.count;
  }
}

export const signalsService = new SignalsService();
