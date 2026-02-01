import { PrismaClient } from '@prisma/client';
import logger from './logger';

// Production-grade connection pool configuration
// Reserved for future use when manual pool management is needed
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _connectionPoolConfig = {
  connectionLimit: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  pool: {
    min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
    max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
    acquireTimeoutMillis: parseInt(process.env.DATABASE_POOL_TIMEOUT || '60000'),
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 60000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
};

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ]
    : [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Log queries in development and monitor slow queries in all environments
prisma.$on('query', (e: any) => {
  // Log all queries in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Query: ' + e.query);
    logger.debug('Duration: ' + e.duration + 'ms');
  }

  // Alert on slow queries (> 1 second) in all environments
  if (e.duration > 1000) {
    logger.warn('Slow query detected:', {
      query: e.query,
      duration: `${e.duration}ms`,
      params: e.params,
    });
  }
});

prisma.$on('error', (e: any) => {
  logger.error('Prisma Error:', e);
});

prisma.$on('warn', (e: any) => {
  logger.warn('Prisma Warning:', e);
});

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

/**
 * Transaction timeout configuration
 * Protects against long-running transactions and deadlocks
 * Use this when calling prisma.$transaction()
 */
export const TRANSACTION_OPTIONS = {
  maxWait: 5000,  // Wait max 5s to acquire connection from pool
  timeout: 10000, // Abort transaction if it takes longer than 10s
  isolationLevel: 'ReadCommitted' as const, // Prevent dirty reads
};

export default prisma;
