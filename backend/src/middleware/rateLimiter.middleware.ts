import rateLimit from 'express-rate-limit';
import redis from '../utils/redis';

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'); // 15 minutes
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

/**
 * General API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for sensitive endpoints (auth, etc.)
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for trading endpoints
 */
export const tradeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 trades per minute
  message: 'Trade rate limit exceeded, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per user
    return (req as any).user?.userId || req.ip;
  },
});

/**
 * Custom Redis-based rate limiter for more control
 */
export async function customRateLimiter(options: {
  key: string;
  maxRequests: number;
  windowSeconds: number;
}) {
  const { key, maxRequests, windowSeconds } = options;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (current > maxRequests) {
    const ttl = await redis.ttl(key);
    throw new Error(`Rate limit exceeded. Try again in ${ttl} seconds`);
  }

  return {
    current,
    remaining: maxRequests - current,
    resetIn: await redis.ttl(key),
  };
}
