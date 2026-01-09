import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import copyTradingController from '../controllers/copyTrading.controller';

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
  copyTradingController.getPublicCopyTraders
);

/**
 * GET /copy-trading/traders/:id
 * Get copy trader details
 */
router.get(
  '/traders/:id',
  [param('id').isString()],
  validate,
  copyTradingController.getCopyTraderDetails
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
  copyTradingController.getCopyTraderPerformance
);

/**
 * GET /copy-trading/traders/:id/followers
 * Get copy trader followers
 */
router.get(
  '/traders/:id/followers',
  [param('id').isString()],
  validate,
  copyTradingController.getFollowerStatistics
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
  copyTradingController.followCopyTrader
);

/**
 * POST /copy-trading/unfollow/:traderId
 * Stop following a copy trader
 */
router.post(
  '/unfollow/:traderId',
  [param('traderId').isString()],
  validate,
  copyTradingController.unfollowCopyTrader
);

/**
 * POST /copy-trading/pause/:traderId
 * Pause copy relationship
 */
router.post(
  '/pause/:traderId',
  [param('traderId').isString()],
  validate,
  copyTradingController.pauseCopyRelationship
);

/**
 * POST /copy-trading/resume/:traderId
 * Resume copy relationship
 */
router.post(
  '/resume/:traderId',
  [param('traderId').isString()],
  validate,
  copyTradingController.resumeCopyRelationship
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
  copyTradingController.updateCopyRelationship
);

/**
 * GET /copy-trading/my-following
 * Get my copy relationships
 */
router.get('/my-following', copyTradingController.getUserCopyRelationships);

// ==================== COPY TRADER PROFILE ====================

/**
 * GET /copy-trading/my-profile
 * Get my copy trader profile (if I'm a copy trader)
 */
router.get('/my-profile', copyTradingController.getMyCopyTraderProfile);

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
  copyTradingController.applyAsCopyTrader
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
  copyTradingController.updateCopyTraderProfile
);

export default router;
