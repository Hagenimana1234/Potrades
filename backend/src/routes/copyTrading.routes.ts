import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import copyTradingService from '../services/copyTrading.service';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== PUBLIC COPY TRADERS ====================

/**
 * GET /copy-trading/traders
 * Browse public copy traders
 */
router.get(
  '/traders',
  [
    query('minWinRate').optional().isFloat({ min: 0, max: 100 }),
    query('minTotalTrades').optional().isInt({ min: 0 }),
    query('sortBy').optional().isString().isIn(['winRate', 'totalProfit', 'totalTrades']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { minWinRate, minTotalTrades, sortBy, limit, offset } = req.query;

      const result = await copyTradingService.getPublicCopyTraders({
        minWinRate: minWinRate ? parseFloat(minWinRate as string) : undefined,
        minTotalTrades: minTotalTrades ? parseInt(minTotalTrades as string) : undefined,
        sortBy: sortBy as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Get copy traders error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch copy traders',
      });
    }
  }
);

/**
 * GET /copy-trading/traders/:id
 * Get copy trader details
 */
router.get(
  '/traders/:id',
  [param('id').isString()],
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;

      const trader = await copyTradingService.getCopyTraderDetails(id);

      res.json({
        success: true,
        data: trader,
      });
    } catch (error: any) {
      logger.error('Get copy trader details error:', error);
      res.status(error.statusCode || 404).json({
        success: false,
        error: error.message || 'Failed to fetch copy trader',
      });
    }
  }
);

/**
 * GET /copy-trading/traders/:id/performance
 * Get copy trader performance metrics
 */
router.get(
  '/traders/:id/performance',
  [
    param('id').isString(),
    query('days').optional().isInt({ min: 1, max: 365 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { days } = req.query;

      const performance = await copyTradingService.getCopyTraderPerformance(
        id,
        days ? parseInt(days as string) : 30
      );

      res.json({
        success: true,
        data: performance,
      });
    } catch (error: any) {
      logger.error('Get performance error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to fetch performance',
      });
    }
  }
);

/**
 * GET /copy-trading/traders/:id/followers
 * Get copy trader followers
 */
router.get(
  '/traders/:id/followers',
  [param('id').isString()],
  validate,
  async (req, res) => {
    try {
      const { id } = req.params;

      const stats = await copyTradingService.getFollowerStatistics(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get followers error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch followers',
      });
    }
  }
);

// ==================== USER COPY TRADING ====================

/**
 * POST /copy-trading/follow/:traderId
 * Follow a copy trader
 */
router.post(
  '/follow/:traderId',
  [
    param('traderId').isString(),
    body('copyMode').isString().isIn(['FIXED', 'PERCENT']),
    body('copyAmount').optional().isFloat({ min: 0.01 }),
    body('copyPercent').optional().isFloat({ min: 1, max: 100 }),
    body('maxDailyLoss').optional().isFloat({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { traderId } = req.params;
      const { copyMode, copyAmount, copyPercent, maxDailyLoss } = req.body;

      const relationship = await copyTradingService.followCopyTrader(userId, traderId, {
        copyMode,
        copyAmount,
        copyPercent,
        maxDailyLoss,
      });

      res.status(201).json({
        success: true,
        data: relationship,
        message: 'Successfully started following trader',
      });
    } catch (error: any) {
      logger.error('Follow trader error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to follow trader',
      });
    }
  }
);

/**
 * POST /copy-trading/unfollow/:traderId
 * Stop following a copy trader
 */
router.post(
  '/unfollow/:traderId',
  [param('traderId').isString()],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { traderId } = req.params;

      await copyTradingService.unfollowCopyTrader(userId, traderId);

      res.json({
        success: true,
        message: 'Successfully unfollowed trader',
      });
    } catch (error: any) {
      logger.error('Unfollow trader error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to unfollow trader',
      });
    }
  }
);

/**
 * POST /copy-trading/pause/:traderId
 * Pause copy relationship
 */
router.post(
  '/pause/:traderId',
  [param('traderId').isString()],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { traderId } = req.params;

      await copyTradingService.pauseCopyRelationship(userId, traderId);

      res.json({
        success: true,
        message: 'Copy relationship paused',
      });
    } catch (error: any) {
      logger.error('Pause relationship error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to pause relationship',
      });
    }
  }
);

/**
 * POST /copy-trading/resume/:traderId
 * Resume copy relationship
 */
router.post(
  '/resume/:traderId',
  [param('traderId').isString()],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { traderId } = req.params;

      await copyTradingService.resumeCopyRelationship(userId, traderId);

      res.json({
        success: true,
        message: 'Copy relationship resumed',
      });
    } catch (error: any) {
      logger.error('Resume relationship error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to resume relationship',
      });
    }
  }
);

/**
 * PUT /copy-trading/settings/:traderId
 * Update copy relationship settings
 */
router.put(
  '/settings/:traderId',
  [
    param('traderId').isString(),
    body('copyMode').optional().isString().isIn(['FIXED', 'PERCENT']),
    body('copyAmount').optional().isFloat({ min: 0.01 }),
    body('copyPercent').optional().isFloat({ min: 1, max: 100 }),
    body('maxDailyLoss').optional().isFloat({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { traderId } = req.params;
      const { copyMode, copyAmount, copyPercent, maxDailyLoss } = req.body;

      await copyTradingService.updateCopyRelationship(userId, traderId, {
        copyMode,
        copyAmount,
        copyPercent,
        maxDailyLoss,
      });

      res.json({
        success: true,
        message: 'Copy settings updated successfully',
      });
    } catch (error: any) {
      logger.error('Update copy settings error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to update settings',
      });
    }
  }
);

/**
 * GET /copy-trading/my-following
 * Get my copy relationships
 */
router.get('/my-following', async (req, res) => {
  try {
    const userId = req.user!.id;

    const relationships = await copyTradingService.getUserCopyRelationships(userId);

    res.json({
      success: true,
      data: relationships,
    });
  } catch (error: any) {
    logger.error('Get my following error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch following',
    });
  }
});

// ==================== COPY TRADER PROFILE ====================

/**
 * GET /copy-trading/my-profile
 * Get my copy trader profile (if I'm a copy trader)
 */
router.get('/my-profile', async (req, res) => {
  try {
    const userId = req.user!.id;

    const profile = await copyTradingService.getMyCopyTraderProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    logger.error('Get my profile error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch profile',
    });
  }
});

/**
 * POST /copy-trading/apply
 * Apply to become a copy trader
 */
router.post(
  '/apply',
  [
    body('minCopyAmount').isFloat({ min: 0.01 }),
    body('maxCopyAmount').isFloat({ min: 0.01 }),
    body('profitSharePercent').isFloat({ min: 0, max: 50 }),
    body('displayName').optional().isString().isLength({ min: 1, max: 50 }),
    body('bio').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { minCopyAmount, maxCopyAmount, profitSharePercent, displayName, bio } = req.body;

      const copyTrader = await copyTradingService.applyAsCopyTrader(userId, {
        minCopyAmount,
        maxCopyAmount,
        profitSharePercent,
        displayName,
        bio,
      });

      res.status(201).json({
        success: true,
        data: copyTrader,
        message: 'Application submitted successfully. Awaiting admin approval.',
      });
    } catch (error: any) {
      logger.error('Apply as copy trader error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to apply',
      });
    }
  }
);

/**
 * PUT /copy-trading/my-profile
 * Update my copy trader profile
 */
router.put(
  '/my-profile',
  [
    body('displayName').optional().isString().isLength({ min: 1, max: 50 }),
    body('bio').optional().isString().isLength({ max: 500 }),
    body('avatar').optional().isString(),
    body('minCopyAmount').optional().isFloat({ min: 0.01 }),
    body('maxCopyAmount').optional().isFloat({ min: 0.01 }),
    body('profitSharePercent').optional().isFloat({ min: 0, max: 50 }),
    body('isPublic').optional().isBoolean(),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const {
        displayName,
        bio,
        avatar,
        minCopyAmount,
        maxCopyAmount,
        profitSharePercent,
        isPublic,
      } = req.body;

      const updated = await copyTradingService.updateCopyTraderProfile(userId, {
        displayName,
        bio,
        avatar,
        minCopyAmount,
        maxCopyAmount,
        profitSharePercent,
        isPublic,
      });

      res.json({
        success: true,
        data: updated,
        message: 'Profile updated successfully',
      });
    } catch (error: any) {
      logger.error('Update profile error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to update profile',
      });
    }
  }
);

export default router;
