import 'express-async-errors';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import os from 'os';
import logger from './utils/logger';
import { connectDatabase } from './utils/database';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import sessionMiddleware from './middleware/session.middleware';
import routes from './routes';
import healthRoutes from './routes/health.routes';
import WebSocketServer from './websocket/server';
import { initializeJobs } from './jobs';
import marketDataService from './services/marketData.service';

// Load environment variables
dotenv.config();

// Generate unique instance ID for clustering
const INSTANCE_ID = process.env.INSTANCE_ID || `instance-${os.hostname()}-${randomBytes(4).toString('hex')}`;
process.env.INSTANCE_ID = INSTANCE_ID;

const PORT = process.env.PORT || 3000;
const app = express();
const httpServer = createServer(app);

// ==================== MIDDLEWARE ====================

// Security
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for WebSocket
    crossOriginEmbedderPolicy: false,
  })
);

// CORS
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request ID tracking (must be early in middleware chain)
app.use(requestIdMiddleware);

// Session management with Redis (for load balancer support)
app.use(sessionMiddleware);

// Compression
app.use(compression());

// Rate limiting
app.use('/api', apiLimiter);

// Request logging (development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    logger.debug(`${req.method} ${req.path}`);
    next();
  });
}

// ==================== ROUTES ====================

// Health checks (no rate limiting, no auth) - for load balancers
app.use('/', healthRoutes);

app.use('/api', routes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'PoTrades API Server',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// ==================== ERROR HANDLING ====================

app.use(notFoundHandler);
app.use(errorHandler);

// ==================== INITIALIZATION ====================

async function bootstrap() {
  try {
    logger.info('Starting PoTrades Backend...');

    // Connect to database
    await connectDatabase();
    logger.info('✓ Database connected');

    // Initialize WebSocket server
    const wsServer = new WebSocketServer(httpServer);
    logger.info('✓ WebSocket server initialized');

    // Make WebSocket server globally accessible
    (global as any).wsServer = wsServer;

    // Start market data streams
    await marketDataService.startAllActiveStreams();
    logger.info('✓ Market data streams started');

    // Initialize background jobs
    await initializeJobs();
    logger.info('✓ Background jobs initialized');

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`✓ Server running on port ${PORT}`);
      logger.info(`✓ Instance ID: ${INSTANCE_ID}`);
      logger.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`✓ API URL: http://localhost:${PORT}/api`);
      logger.info(`✓ WebSocket URL: ws://localhost:${PORT}`);
      logger.info(`✓ Health check: http://localhost:${PORT}/health`);
      logger.info(`✓ Readiness check: http://localhost:${PORT}/ready`);
      logger.info(`✓ Liveness check: http://localhost:${PORT}/live`);
      logger.info('='.repeat(50));
      logger.info('🚀 PoTrades Backend is ready for millions of users!');
      logger.info('   Horizontal scaling: ✓ Enabled');
      logger.info('   WebSocket clustering: ✓ Redis adapter');
      logger.info('   Session management: ✓ Redis store');
      logger.info('   Connection pooling: ✓ Configured');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// ==================== GRACEFUL SHUTDOWN ====================

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Stop market data streams
    marketDataService.stopAllPriceStreams();
    logger.info('Market data streams stopped');

    // Jobs are handled by their own shutdown handlers

    // Give ongoing requests time to complete
    setTimeout(() => {
      logger.info('Shutdown complete');
      process.exit(0);
    }, 5000);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
bootstrap();

export default app;
