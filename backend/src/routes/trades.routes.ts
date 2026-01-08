import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { tradeLimiter } from '../middleware/rateLimiter.middleware';
import tradingController from '../controllers/trading.controller';
import tradingService from '../services/trading.service';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== TRADE MANAGEMENT ====================

/**
 * POST /trades
 * Place a new trade
 */
router.post(
  '/',
  tradeLimiter,
  [
    body('assetId').isString(),
    body('walletType').isString().isIn(['DEMO', 'REAL']),
    body('direction').isString().isIn(['UP', 'DOWN']),
    body('amount').isFloat({ min: 0.01 }),
    body('expirySeconds').isInt({ min: 60 }),
  ],
  validate,
  tradingController.placeTrade
);

/**
 * POST /trades/:tradeId/close
 * Manually close an open trade
 */
router.post(
  '/:tradeId/close',
  [param('tradeId').isString()],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { tradeId } = req.params;

      const result = await tradingService.closeTrade(tradeId, userId);

      res.json({
        success: true,
        data: result,
        message: `Trade closed successfully - ${result.won ? 'WIN' : 'LOSS'}`,
      });
    } catch (error: any) {
      logger.error('Close trade error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to close trade',
      });
    }
  }
);

/**
 * DELETE /trades/:tradeId
 * Cancel a pending trade
 */
router.delete(
  '/:tradeId',
  [param('tradeId').isString()],
  validate,
  tradingController.cancelTrade
);

/**
 * GET /trades
 * Get trade history with filters
 */
router.get(
  '/',
  [
    query('walletType').optional().isString().isIn(['DEMO', 'REAL']),
    query('status').optional().isString().isIn(['PENDING', 'OPEN', 'WON', 'LOST', 'DRAW', 'CANCELLED', 'REFUNDED']),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validate,
  tradingController.getTrades
);

/**
 * GET /trades/open
 * Get all open positions
 */
router.get('/open', tradingController.getOpenTrades);

/**
 * GET /trades/stats
 * Get trading statistics
 */
router.get(
  '/stats',
  [query('walletType').optional().isString().isIn(['DEMO', 'REAL'])],
  validate,
  tradingController.getTradeStats
);

// ==================== RISK MANAGEMENT ====================

/**
 * GET /trades/risk/limits
 * Get user's risk limits
 */
router.get('/risk/limits', async (req, res) => {
  try {
    const userId = req.user!.id;

    const limits = await tradingService.getUserRiskLimits(userId);

    res.json({
      success: true,
      data: limits,
    });
  } catch (error: any) {
    logger.error('Get risk limits error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch risk limits',
    });
  }
});

/**
 * PUT /trades/risk/limits
 * Update user's risk limits
 */
router.put(
  '/risk/limits',
  [
    body('maxTradeAmount').optional().isFloat({ min: 0 }),
    body('maxDailyLoss').optional().isFloat({ min: 0 }),
    body('maxOpenTrades').optional().isInt({ min: 1 }),
    body('maxDailyTrades').optional().isInt({ min: 1 }),
    body('cooldownSeconds').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const {
        maxTradeAmount,
        maxDailyLoss,
        maxOpenTrades,
        maxDailyTrades,
        cooldownSeconds,
      } = req.body;

      const limits = await tradingService.updateUserRiskLimits(userId, {
        maxTradeAmount,
        maxDailyLoss,
        maxOpenTrades,
        maxDailyTrades,
        cooldownSeconds,
      });

      res.json({
        success: true,
        data: limits,
        message: 'Risk limits updated successfully',
      });
    } catch (error: any) {
      logger.error('Update risk limits error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update risk limits',
      });
    }
  }
);

/**
 * DELETE /trades/risk/limits
 * Remove user's risk limits (reset to no limits)
 */
router.delete('/risk/limits', async (req, res) => {
  try {
    const userId = req.user!.id;

    await tradingService.updateUserRiskLimits(userId, {
      maxTradeAmount: null,
      maxDailyLoss: null,
      maxOpenTrades: null,
      maxDailyTrades: null,
      cooldownSeconds: null,
    });

    res.json({
      success: true,
      message: 'Risk limits removed successfully',
    });
  } catch (error: any) {
    logger.error('Remove risk limits error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to remove risk limits',
    });
  }
});

export default router;
