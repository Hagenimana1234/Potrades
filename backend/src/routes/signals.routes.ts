import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import signalsController from '../controllers/signals.controller';
import { SignalType, SignalStatus, UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/signals
 * Get all signals with filtering and pagination
 */
router.get(
  '/',
  validate([
    query('assetId').optional().isString(),
    query('type').optional().isIn(Object.values(SignalType)),
    query('status').optional().isIn(Object.values(SignalStatus)),
    query('timeframe').optional().isString(),
    query('tags').optional(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  signalsController.getSignals
);

/**
 * GET /api/signals/active
 * Get active signals only
 */
router.get(
  '/active',
  validate([query('assetId').optional().isString(), query('limit').optional().isInt({ min: 1, max: 100 }).toInt()]),
  signalsController.getActiveSignals
);

/**
 * GET /api/signals/my-signals
 * Get current user's created signals
 */
router.get('/my-signals', signalsController.getProviderSignals);

/**
 * GET /api/signals/my-subscriptions
 * Get current user's signal subscriptions
 */
router.get('/my-subscriptions', signalsController.getUserSubscriptions);

/**
 * GET /api/signals/stats
 * Get global signal statistics
 */
router.get(
  '/stats',
  validate([query('days').optional().isInt({ min: 1, max: 365 }).toInt()]),
  signalsController.getGlobalStats
);

/**
 * GET /api/signals/provider/:userId/performance
 * Get signal provider's performance statistics
 */
router.get(
  '/provider/:userId/performance',
  validate([
    param('userId').isString(),
    query('days').optional().isInt({ min: 1, max: 365 }).toInt(),
  ]),
  signalsController.getProviderPerformance
);

/**
 * GET /api/signals/:id
 * Get signal by ID
 */
router.get(
  '/:id',
  validate([param('id').isString()]),
  signalsController.getSignalById
);

/**
 * POST /api/signals
 * Create a new signal
 * Only admins, analysts, and risk managers can create signals
 */
router.post(
  '/',
  authorize([UserRole.ADMIN, UserRole.RISK_MANAGER]),
  validate([
    body('assetId').isString().notEmpty(),
    body('type').isIn(Object.values(SignalType)),
    body('entryPrice').isFloat({ min: 0 }),
    body('targetPrice').optional().isFloat({ min: 0 }),
    body('stopLoss').optional().isFloat({ min: 0 }),
    body('title').isString().notEmpty().isLength({ min: 3, max: 200 }),
    body('description').optional().isString(),
    body('timeframe').optional().isString(),
    body('tags').optional().isArray(),
    body('expiresAt').optional().isISO8601(),
  ]),
  signalsController.createSignal
);

/**
 * PUT /api/signals/:id
 * Update a signal
 */
router.put(
  '/:id',
  validate([
    param('id').isString(),
    body('type').optional().isIn(Object.values(SignalType)),
    body('status').optional().isIn(Object.values(SignalStatus)),
    body('targetPrice').optional().isFloat({ min: 0 }),
    body('stopLoss').optional().isFloat({ min: 0 }),
    body('title').optional().isString().isLength({ min: 3, max: 200 }),
    body('description').optional().isString(),
    body('timeframe').optional().isString(),
    body('tags').optional().isArray(),
    body('expiresAt').optional().isISO8601(),
    body('exitPrice').optional().isFloat({ min: 0 }),
  ]),
  signalsController.updateSignal
);

/**
 * POST /api/signals/:id/close
 * Close a signal with exit price
 */
router.post(
  '/:id/close',
  validate([param('id').isString(), body('exitPrice').isFloat({ min: 0 })]),
  signalsController.closeSignal
);

/**
 * DELETE /api/signals/:id
 * Delete a signal
 */
router.delete(
  '/:id',
  validate([param('id').isString()]),
  signalsController.deleteSignal
);

/**
 * POST /api/signals/:id/subscribe
 * Subscribe to a signal
 */
router.post(
  '/:id/subscribe',
  validate([
    param('id').isString(),
    body('autoCopy').optional().isBoolean(),
    body('copyAmount').optional().isFloat({ min: 0 }),
  ]),
  signalsController.subscribeToSignal
);

/**
 * DELETE /api/signals/:id/subscribe
 * Unsubscribe from a signal
 */
router.delete(
  '/:id/subscribe',
  validate([param('id').isString()]),
  signalsController.unsubscribeFromSignal
);

/**
 * PUT /api/signals/:id/subscribe
 * Update subscription settings
 */
router.put(
  '/:id/subscribe',
  validate([
    param('id').isString(),
    body('autoCopy').isBoolean(),
    body('copyAmount').optional().isFloat({ min: 0 }),
  ]),
  signalsController.updateSubscription
);

export default router;
