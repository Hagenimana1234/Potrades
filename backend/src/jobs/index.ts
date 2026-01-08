import { Queue, Worker, QueueScheduler } from 'bullmq';
import redis from '../utils/redis';
import tradingService from '../services/trading.service';
import copyTradingService from '../services/copyTrading.service';
import marketDataService from '../services/marketData.service';
import logger from '../utils/logger';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Create queues
export const tradeSettlementQueue = new Queue('trade-settlement', { connection });
export const copyTradeQueue = new Queue('copy-trade', { connection });
export const marketDataQueue = new Queue('market-data', { connection });
export const notificationQueue = new Queue('notifications', { connection });
export const savingsQueue = new Queue('savings', { connection });
export const cleanupQueue = new Queue('cleanup', { connection });
export const affiliateQueue = new Queue('affiliate', { connection });

// Queue schedulers (for delayed/repeated jobs)
const tradeSettlementScheduler = new QueueScheduler('trade-settlement', { connection });
const copyTradeScheduler = new QueueScheduler('copy-trade', { connection });
const marketDataScheduler = new QueueScheduler('market-data', { connection });
const notificationScheduler = new QueueScheduler('notifications', { connection });
const savingsScheduler = new QueueScheduler('savings', { connection });
const cleanupScheduler = new QueueScheduler('cleanup', { connection });
const affiliateScheduler = new QueueScheduler('affiliate', { connection });

// ==================== WORKERS ====================

/**
 * Trade Settlement Worker
 * Settles expired trades
 */
const tradeSettlementWorker = new Worker(
  'trade-settlement',
  async (job) => {
    const { tradeId } = job.data;

    try {
      logger.info(`Settling trade: ${tradeId}`);
      const result = await tradingService.settleTrade(tradeId);

      // Update copy trader stats if applicable
      const trade = await prisma.trade.findUnique({
        where: { id: tradeId },
        include: { user: true },
      });

      if (trade) {
        await copyTradingService.updateCopyTraderStats(trade.userId, trade);
      }

      logger.info(`Trade settled: ${tradeId} - ${result.status}`);
      return result;
    } catch (error) {
      logger.error(`Error settling trade ${tradeId}:`, error);
      throw error;
    }
  },
  { connection, concurrency: 10 }
);

/**
 * Copy Trade Executor Worker
 * Executes copy trades when master places a trade
 */
const copyTradeWorker = new Worker(
  'copy-trade',
  async (job) => {
    const { masterTradeId, masterTrade } = job.data;

    try {
      logger.info(`Executing copy trades for master trade: ${masterTradeId}`);
      await copyTradingService.executeCopyTrades(masterTradeId, masterTrade);
      logger.info(`Copy trades executed for: ${masterTradeId}`);
    } catch (error) {
      logger.error(`Error executing copy trades for ${masterTradeId}:`, error);
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

/**
 * Market Data Worker
 * Handles market data tasks (unused for now, but ready for external API integration)
 */
const marketDataWorker = new Worker(
  'market-data',
  async (job) => {
    const { action, data } = job.data;

    try {
      switch (action) {
        case 'fetch-external-prices':
          // Placeholder for fetching prices from external API (Binance, etc.)
          logger.debug('Fetching external prices...');
          break;

        case 'aggregate-candles':
          // Placeholder for candle aggregation
          logger.debug('Aggregating candles...');
          break;

        default:
          logger.warn(`Unknown market data action: ${action}`);
      }
    } catch (error) {
      logger.error('Error in market data worker:', error);
      throw error;
    }
  },
  { connection }
);

/**
 * Notification Worker
 * Sends notifications (email, push, SMS)
 */
const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { type, userId, data } = job.data;

    try {
      logger.debug(`Processing notification: ${type} for user ${userId}`);

      switch (type) {
        case 'email':
          // TODO: Send email notification
          logger.info(`Email notification sent to user ${userId}`);
          break;

        case 'push':
          // Send via WebSocket (already implemented)
          const wsServer = (global as any).wsServer;
          if (wsServer) {
            wsServer.broadcastNotification(userId, data);
          }
          break;

        case 'sms':
          // TODO: Send SMS notification
          logger.info(`SMS notification sent to user ${userId}`);
          break;

        default:
          logger.warn(`Unknown notification type: ${type}`);
      }
    } catch (error) {
      logger.error(`Error sending ${type} notification to ${userId}:`, error);
      throw error;
    }
  },
  { connection, concurrency: 20 }
);

/**
 * Savings Worker
 * Calculates and applies interest to savings accounts
 */
const savingsWorker = new Worker(
  'savings',
  async (job) => {
    const { action, savingsPlanId, userId } = job.data;

    try {
      switch (action) {
        case 'calculate-interest':
          logger.info(`Calculating interest for savings plan ${savingsPlanId}`);
          // TODO: Import and use savings service
          // await savingsService.calculateInterest(savingsPlanId);
          break;

        case 'process-maturity':
          logger.info(`Processing maturity for savings plan ${savingsPlanId}`);
          // TODO: Import and use savings service
          // await savingsService.processPlanMaturity(savingsPlanId);
          break;

        default:
          logger.warn(`Unknown savings action: ${action}`);
      }
    } catch (error) {
      logger.error(`Error in savings worker for plan ${savingsPlanId}:`, error);
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

/**
 * Cleanup Worker
 * Handles periodic cleanup tasks
 */
const cleanupWorker = new Worker(
  'cleanup',
  async (job) => {
    const { action } = job.data;

    try {
      switch (action) {
        case 'clean-old-prices':
          logger.info('Cleaning old price data...');
          const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
          const deleted = await prisma.price.deleteMany({
            where: {
              timestamp: { lt: cutoffDate },
            },
          });
          logger.info(`Deleted ${deleted.count} old price records`);
          break;

        case 'clean-old-sessions':
          logger.info('Cleaning expired sessions...');
          // TODO: Clean expired sessions from Redis
          break;

        case 'clean-old-logs':
          logger.info('Cleaning old audit logs...');
          const logCutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
          const deletedLogs = await prisma.auditLog.deleteMany({
            where: {
              createdAt: { lt: logCutoffDate },
            },
          });
          logger.info(`Deleted ${deletedLogs.count} old audit log records`);
          break;

        default:
          logger.warn(`Unknown cleanup action: ${action}`);
      }
    } catch (error) {
      logger.error(`Error in cleanup worker for action ${action}:`, error);
      throw error;
    }
  },
  { connection }
);

/**
 * Affiliate Worker
 * Processes affiliate commissions and payouts
 */
const affiliateWorker = new Worker(
  'affiliate',
  async (job) => {
    const { action, affiliateId, data } = job.data;

    try {
      switch (action) {
        case 'calculate-commission':
          logger.info(`Calculating commission for affiliate ${affiliateId}`);
          // TODO: Import and use affiliate service
          // await affiliateService.calculateCommission(affiliateId, data);
          break;

        case 'process-payout':
          logger.info(`Processing payout for affiliate ${affiliateId}`);
          // TODO: Import and use affiliate service
          // await affiliateService.processPayout(affiliateId, data);
          break;

        case 'update-tier':
          logger.info(`Updating tier for affiliate ${affiliateId}`);
          // TODO: Import and use affiliate service
          // await affiliateService.updateAffiliateTier(affiliateId);
          break;

        default:
          logger.warn(`Unknown affiliate action: ${action}`);
      }
    } catch (error) {
      logger.error(`Error in affiliate worker for ${affiliateId}:`, error);
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

// ==================== PERIODIC JOBS ====================

/**
 * Schedule periodic settlement check
 * Checks for expired trades every 10 seconds
 */
export async function startPeriodicSettlementCheck() {
  await tradeSettlementQueue.add(
    'check-expired-trades',
    {},
    {
      repeat: {
        every: 10000, // 10 seconds
      },
      removeOnComplete: true,
    }
  );

  logger.info('Periodic settlement check started (every 10 seconds)');
}

/**
 * Worker for periodic settlement check
 */
const settlementCheckWorker = new Worker(
  'trade-settlement',
  async (job) => {
    if (job.name === 'check-expired-trades') {
      try {
        const expiredTrades = await tradingService.getTradesForSettlement();

        if (expiredTrades.length > 0) {
          logger.info(`Found ${expiredTrades.length} trades to settle`);

          for (const trade of expiredTrades) {
            await tradeSettlementQueue.add('settle-trade', { tradeId: trade.id });
          }
        }
      } catch (error) {
        logger.error('Error checking for expired trades:', error);
      }
    }
  },
  { connection }
);

// ==================== JOB HELPERS ====================

/**
 * Schedule trade settlement
 */
export async function scheduleTradeSettlement(tradeId: string, expiresAt: Date) {
  const delay = expiresAt.getTime() - Date.now();

  if (delay <= 0) {
    // Trade already expired, settle immediately
    await tradeSettlementQueue.add('settle-trade', { tradeId });
  } else {
    // Schedule settlement
    await tradeSettlementQueue.add('settle-trade', { tradeId }, { delay });
  }

  logger.debug(`Scheduled settlement for trade ${tradeId} in ${delay}ms`);
}

/**
 * Queue copy trade execution
 */
export async function queueCopyTrade(masterTradeId: string, masterTrade: any) {
  await copyTradeQueue.add('execute-copy-trades', { masterTradeId, masterTrade });
  logger.debug(`Queued copy trades for master trade ${masterTradeId}`);
}

/**
 * Queue notification
 */
export async function queueNotification(type: 'email' | 'push' | 'sms', userId: string, data: any) {
  await notificationQueue.add('send-notification', { type, userId, data });
  logger.debug(`Queued ${type} notification for user ${userId}`);
}

/**
 * Queue savings interest calculation
 */
export async function queueSavingsInterest(savingsPlanId: string) {
  await savingsQueue.add('calculate-interest', { action: 'calculate-interest', savingsPlanId });
  logger.debug(`Queued interest calculation for savings plan ${savingsPlanId}`);
}

/**
 * Queue savings plan maturity processing
 */
export async function queueSavingsMaturity(savingsPlanId: string) {
  await savingsQueue.add('process-maturity', { action: 'process-maturity', savingsPlanId });
  logger.debug(`Queued maturity processing for savings plan ${savingsPlanId}`);
}

/**
 * Queue affiliate commission calculation
 */
export async function queueAffiliateCommission(affiliateId: string, data: any) {
  await affiliateQueue.add('calculate-commission', { action: 'calculate-commission', affiliateId, data });
  logger.debug(`Queued commission calculation for affiliate ${affiliateId}`);
}

/**
 * Start periodic cleanup jobs
 */
export async function startPeriodicCleanup() {
  // Clean old prices daily at 3 AM
  await cleanupQueue.add(
    'clean-old-prices',
    { action: 'clean-old-prices' },
    {
      repeat: {
        pattern: '0 3 * * *', // 3 AM daily
      },
      removeOnComplete: true,
    }
  );

  // Clean old sessions hourly
  await cleanupQueue.add(
    'clean-old-sessions',
    { action: 'clean-old-sessions' },
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
      removeOnComplete: true,
    }
  );

  // Clean old logs weekly
  await cleanupQueue.add(
    'clean-old-logs',
    { action: 'clean-old-logs' },
    {
      repeat: {
        pattern: '0 4 * * 0', // 4 AM every Sunday
      },
      removeOnComplete: true,
    }
  );

  logger.info('Periodic cleanup jobs started');
}

/**
 * Start periodic savings interest calculation
 */
export async function startPeriodicSavingsInterest() {
  // Calculate interest daily at midnight
  await savingsQueue.add(
    'daily-interest',
    { action: 'calculate-daily-interest' },
    {
      repeat: {
        pattern: '0 0 * * *', // Midnight daily
      },
      removeOnComplete: true,
    }
  );

  logger.info('Periodic savings interest calculation started');
}

// ==================== WORKER EVENT HANDLERS ====================

tradeSettlementWorker.on('completed', (job) => {
  logger.debug(`Job ${job.id} (${job.name}) completed`);
});

tradeSettlementWorker.on('failed', (job, error) => {
  logger.error(`Job ${job?.id} (${job?.name}) failed:`, error);
});

copyTradeWorker.on('completed', (job) => {
  logger.debug(`Copy trade job ${job.id} completed`);
});

copyTradeWorker.on('failed', (job, error) => {
  logger.error(`Copy trade job ${job?.id} failed:`, error);
});

notificationWorker.on('completed', (job) => {
  logger.debug(`Notification job ${job.id} completed`);
});

notificationWorker.on('failed', (job, error) => {
  logger.error(`Notification job ${job?.id} failed:`, error);
});

savingsWorker.on('completed', (job) => {
  logger.debug(`Savings job ${job.id} completed`);
});

savingsWorker.on('failed', (job, error) => {
  logger.error(`Savings job ${job?.id} failed:`, error);
});

cleanupWorker.on('completed', (job) => {
  logger.info(`Cleanup job ${job.id} (${job.name}) completed`);
});

cleanupWorker.on('failed', (job, error) => {
  logger.error(`Cleanup job ${job?.id} failed:`, error);
});

affiliateWorker.on('completed', (job) => {
  logger.debug(`Affiliate job ${job.id} completed`);
});

affiliateWorker.on('failed', (job, error) => {
  logger.error(`Affiliate job ${job?.id} failed:`, error);
});

// ==================== INITIALIZATION ====================

export async function initializeJobs() {
  logger.info('Initializing background jobs...');

  // Start periodic settlement check
  await startPeriodicSettlementCheck();

  // Start periodic cleanup jobs
  await startPeriodicCleanup();

  // Start periodic savings interest calculation
  await startPeriodicSavingsInterest();

  logger.info('✓ Background jobs initialized');
  logger.info('  - Trade settlement: Every 10 seconds');
  logger.info('  - Old prices cleanup: Daily at 3 AM');
  logger.info('  - Sessions cleanup: Hourly');
  logger.info('  - Logs cleanup: Weekly on Sunday at 4 AM');
  logger.info('  - Savings interest: Daily at midnight');
}

// ==================== CLEANUP ====================

export async function shutdownJobs() {
  logger.info('Shutting down background jobs...');

  // Close all workers
  await tradeSettlementWorker.close();
  await copyTradeWorker.close();
  await marketDataWorker.close();
  await notificationWorker.close();
  await savingsWorker.close();
  await cleanupWorker.close();
  await affiliateWorker.close();

  // Close all queues
  await tradeSettlementQueue.close();
  await copyTradeQueue.close();
  await marketDataQueue.close();
  await notificationQueue.close();
  await savingsQueue.close();
  await cleanupQueue.close();
  await affiliateQueue.close();

  logger.info('✓ Background jobs shut down gracefully');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await shutdownJobs();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await shutdownJobs();
  process.exit(0);
});

import prisma from '../utils/database';
