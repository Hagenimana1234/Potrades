import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Request ID Middleware
 * Generates unique ID for each request to enable request tracing
 * Useful for debugging production issues and correlating logs
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate or use existing request ID from header
  const requestId = req.headers['x-request-id'] as string || randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
