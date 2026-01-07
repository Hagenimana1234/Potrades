import { Router } from 'express';
import prisma from '../utils/database';
import redis from '../utils/redis';
import os from 'os';

const router = Router();

/**
 * Health check endpoint for load balancers
 * Returns 200 OK if all systems are operational
 */
router.get('/health', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    instance: process.env.INSTANCE_ID || os.hostname(),
  };

  try {
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = 'ERROR';
    res.status(503).json(healthcheck);
  }
});

/**
 * Readiness check - verifies all dependencies are ready
 * Used by load balancers to determine if instance can receive traffic
 */
router.get('/ready', async (req, res) => {
  const checks = {
    status: 'ready',
    timestamp: Date.now(),
    instance: process.env.INSTANCE_ID || os.hostname(),
    checks: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = 'healthy';

    // Check Redis connection
    await redis.ping();
    checks.checks.redis = 'healthy';

    res.status(200).json(checks);
  } catch (error: any) {
    checks.status = 'not ready';
    checks.checks.database = 'unhealthy';
    checks.checks.redis = 'unhealthy';
    res.status(503).json(checks);
  }
});

/**
 * Liveness check - verifies instance is alive
 * Used by orchestrators (Kubernetes, ECS) for restart decisions
 */
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: Date.now(),
    instance: process.env.INSTANCE_ID || os.hostname(),
  });
});

/**
 * Metrics endpoint for monitoring
 */
router.get('/metrics', async (req, res) => {
  const metrics = {
    timestamp: Date.now(),
    instance: process.env.INSTANCE_ID || os.hostname(),
    uptime: process.uptime(),
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      process: process.memoryUsage(),
    },
    cpu: {
      cores: os.cpus().length,
      loadAverage: os.loadavg(),
      model: os.cpus()[0]?.model || 'unknown',
    },
    platform: {
      type: os.type(),
      release: os.release(),
      arch: os.arch(),
      hostname: os.hostname(),
    },
  };

  res.status(200).json(metrics);
});

export default router;
