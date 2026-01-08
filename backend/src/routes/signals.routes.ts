import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { signalsService } from '../services/signals.service';
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
  async (req, res) => {
    try {
      const { assetId, type, status, timeframe, tags, page = 1, limit = 20 } = req.query;

      const filters = {
        ...(assetId && { assetId: assetId as string }),
        ...(type && { type: type as SignalType }),
        ...(status && { status: status as SignalStatus }),
        ...(timeframe && { timeframe: timeframe as string }),
        ...(tags && { tags: Array.isArray(tags) ? (tags as string[]) : [tags as string] }),
      };

      const result = await signalsService.getSignals(filters, Number(page), Number(limit));

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/signals/active
 * Get active signals only
 */
router.get(
  '/active',
  validate([query('assetId').optional().isString(), query('limit').optional().isInt({ min: 1, max: 100 }).toInt()]),
  async (req, res) => {
    try {
      const { assetId, limit = 20 } = req.query;

      const signals = await signalsService.getActiveSignals(assetId as string | undefined, Number(limit));

      res.json({
        success: true,
        data: signals,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/signals/my-signals
 * Get current user's created signals
 */
router.get('/my-signals', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { status } = req.query;

    const signals = await signalsService.getProviderSignals(
      userId,
      status ? (status as SignalStatus) : undefined
    );

    res.json({
      success: true,
      data: signals,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/signals/my-subscriptions
 * Get current user's signal subscriptions
 */
router.get('/my-subscriptions', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const subscriptions = await signalsService.getUserSubscriptions(userId);

    res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/signals/stats
 * Get global signal statistics
 */
router.get(
  '/stats',
  validate([query('days').optional().isInt({ min: 1, max: 365 }).toInt()]),
  async (req, res) => {
    try {
      const { days = 30 } = req.query;

      const stats = await signalsService.getGlobalStats(Number(days));

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
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
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;

      const performance = await signalsService.getProviderPerformance(userId, Number(days));

      res.json({
        success: true,
        data: performance,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/signals/:id
 * Get signal by ID
 */
router.get(
  '/:id',
  validate([param('id').isString()]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const signal = await signalsService.getSignalById(id);

      res.json({
        success: true,
        data: signal,
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const {
        assetId,
        type,
        entryPrice,
        targetPrice,
        stopLoss,
        title,
        description,
        timeframe,
        tags,
        expiresAt,
      } = req.body;

      const signal = await signalsService.createSignal(userId, {
        assetId,
        type,
        entryPrice: parseFloat(entryPrice),
        targetPrice: targetPrice ? parseFloat(targetPrice) : undefined,
        stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
        title,
        description,
        timeframe,
        tags,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.status(201).json({
        success: true,
        data: signal,
        message: 'Signal created successfully',
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { type, status, targetPrice, stopLoss, title, description, timeframe, tags, expiresAt, exitPrice } =
        req.body;

      const signal = await signalsService.updateSignal(userId, id, {
        ...(type && { type }),
        ...(status && { status }),
        ...(targetPrice !== undefined && { targetPrice: parseFloat(targetPrice) }),
        ...(stopLoss !== undefined && { stopLoss: parseFloat(stopLoss) }),
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(timeframe !== undefined && { timeframe }),
        ...(tags && { tags }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : undefined }),
        ...(exitPrice !== undefined && { exitPrice: parseFloat(exitPrice) }),
      });

      res.json({
        success: true,
        data: signal,
        message: 'Signal updated successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/signals/:id/close
 * Close a signal with exit price
 */
router.post(
  '/:id/close',
  validate([param('id').isString(), body('exitPrice').isFloat({ min: 0 })]),
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { exitPrice } = req.body;

      const signal = await signalsService.closeSignal(id, userId, parseFloat(exitPrice));

      res.json({
        success: true,
        data: signal,
        message: 'Signal closed successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /api/signals/:id
 * Delete a signal
 */
router.delete(
  '/:id',
  validate([param('id').isString()]),
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await signalsService.deleteSignal(id, userId);

      res.json({
        success: true,
        message: 'Signal deleted successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { autoCopy = false, copyAmount } = req.body;

      const subscription = await signalsService.subscribeToSignal(
        userId,
        id,
        autoCopy,
        copyAmount ? parseFloat(copyAmount) : undefined
      );

      res.status(201).json({
        success: true,
        data: subscription,
        message: 'Subscribed to signal successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /api/signals/:id/subscribe
 * Unsubscribe from a signal
 */
router.delete(
  '/:id/subscribe',
  validate([param('id').isString()]),
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await signalsService.unsubscribeFromSignal(userId, id);

      res.json({
        success: true,
        message: 'Unsubscribed from signal successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { autoCopy, copyAmount } = req.body;

      const subscription = await signalsService.updateSubscription(
        userId,
        id,
        autoCopy,
        copyAmount ? parseFloat(copyAmount) : undefined
      );

      res.json({
        success: true,
        data: subscription,
        message: 'Subscription updated successfully',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
