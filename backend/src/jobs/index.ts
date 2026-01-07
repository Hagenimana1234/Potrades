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

// Queue schedulers (for delayed/repeated jobs)
const tradeSettlementScheduler = new QueueScheduler('trade-settlement', { connection });
const copyTradeScheduler = new QueueScheduler('copy-trade', { connection });
const marketDataScheduler = new QueueScheduler('market-data', { connection });

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

// ==================== INITIALIZATION ====================

export async function initializeJobs() {
  logger.info('Initializing background jobs...');

  // Start periodic settlement check
  await startPeriodicSettlementCheck();

  logger.info('Background jobs initialized');
}

// ==================== CLEANUP ====================

export async function shutdownJobs() {
  logger.info('Shutting down background jobs...');

  await tradeSettlementWorker.close();
  await copyTradeWorker.close();
  await marketDataWorker.close();

  await tradeSettlementQueue.close();
  await copyTradeQueue.close();
  await marketDataQueue.close();

  logger.info('Background jobs shut down');
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
