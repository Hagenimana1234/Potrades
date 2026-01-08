import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import savingsService from '../services/savings.service';
import logger from '../utils/logger';

const router = Router();

// ==================== USER SAVINGS ROUTES ====================

/**
 * GET /savings/plans
 * Get all active savings plans
 */
router.get('/plans', authenticate, async (req, res) => {
  try {
    const plans = await savingsService.getSavingsPlans();

    res.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    logger.error('Get savings plans error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch savings plans',
    });
  }
});

/**
 * GET /savings/my-savings
 * Get user's savings deposits
 */
router.get('/my-savings', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const savings = await savingsService.getUserSavings(userId);

    res.json({
      success: true,
      data: savings,
    });
  } catch (error: any) {
    logger.error('Get user savings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch savings',
    });
  }
});

/**
 * GET /savings/analytics
 * Get savings analytics for user
 */
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const analytics = await savingsService.getSavingsAnalytics(userId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error: any) {
    logger.error('Get savings analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch analytics',
    });
  }
});

/**
 * POST /savings/estimate
 * Estimate returns for a savings plan
 */
router.post(
  '/estimate',
  authenticate,
  [
    body('planId').isString(),
    body('amount').isFloat({ min: 0.01 }),
    body('days').optional().isInt({ min: 1 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { planId, amount, days } = req.body;

      const estimate = await savingsService.estimateReturns(planId, amount, days);

      res.json({
        success: true,
        data: estimate,
      });
    } catch (error: any) {
      logger.error('Estimate returns error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to estimate returns',
      });
    }
  }
);

/**
 * POST /savings/deposit
 * Create a new savings deposit
 */
router.post(
  '/deposit',
  authenticate,
  [
    body('planId').isString(),
    body('amount').isFloat({ min: 0.01 }),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { planId, amount } = req.body;

      const deposit = await savingsService.createSavingsDeposit({
        userId,
        planId,
        amount,
      });

      res.status(201).json({
        success: true,
        data: deposit,
        message: 'Savings deposit created successfully',
      });
    } catch (error: any) {
      logger.error('Create savings deposit error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to create savings deposit',
      });
    }
  }
);

/**
 * POST /savings/withdraw/:depositId
 * Withdraw from savings
 */
router.post(
  '/withdraw/:depositId',
  authenticate,
  [param('depositId').isString()],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { depositId } = req.params;

      const result = await savingsService.withdrawSavings({
        userId,
        depositId,
      });

      res.json({
        success: true,
        data: result,
        message: result.earlyWithdrawal
          ? 'Early withdrawal completed with penalty'
          : 'Withdrawal completed successfully',
      });
    } catch (error: any) {
      logger.error('Withdraw savings error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to withdraw from savings',
      });
    }
  }
);

// ==================== ADMIN SAVINGS ROUTES ====================

/**
 * GET /savings/admin/deposits
 * Get all savings deposits (Admin only)
 */
router.get(
  '/admin/deposits',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  [
    query('status').optional().isString().isIn(['ACTIVE', 'MATURED', 'WITHDRAWN', 'CLOSED']),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { status, limit, offset } = req.query;

      const result = await savingsService.adminGetAllSavings({
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Admin get savings deposits error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch savings deposits',
      });
    }
  }
);

/**
 * GET /savings/admin/plans
 * Get all savings plans including inactive (Admin only)
 */
router.get(
  '/admin/plans',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  async (req, res) => {
    try {
      const plans = await savingsService.getSavingsPlans();

      res.json({
        success: true,
        data: plans,
      });
    } catch (error: any) {
      logger.error('Admin get plans error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch plans',
      });
    }
  }
);

/**
 * POST /savings/admin/plans
 * Create a new savings plan (Admin only)
 */
router.post(
  '/admin/plans',
  authenticate,
  authorize(['ADMIN']),
  [
    body('name').isString().isLength({ min: 1, max: 100 }),
    body('type').isString().isIn(['FIXED', 'FLEXIBLE']),
    body('status').optional().isString().isIn(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
    body('annualRate').isFloat({ min: 0, max: 100 }),
    body('compoundFrequency').optional().isString().isIn(['DAILY', 'WEEKLY', 'MONTHLY']),
    body('minAmount').isFloat({ min: 0 }),
    body('maxAmount').optional().isFloat({ min: 0 }),
    body('lockDays').optional().isInt({ min: 1 }),
    body('earlyWithdrawalFee').optional().isFloat({ min: 0, max: 100 }),
    body('description').optional().isString(),
    body('icon').optional().isString(),
    body('order').optional().isInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const plan = await savingsService.adminCreatePlan(req.body);

      res.status(201).json({
        success: true,
        data: plan,
        message: 'Savings plan created successfully',
      });
    } catch (error: any) {
      logger.error('Create savings plan error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create savings plan',
      });
    }
  }
);

/**
 * PUT /savings/admin/plans/:planId
 * Update savings plan (Admin only)
 */
router.put(
  '/admin/plans/:planId',
  authenticate,
  authorize(['ADMIN']),
  [
    param('planId').isString(),
    body('name').optional().isString().isLength({ min: 1, max: 100 }),
    body('type').optional().isString().isIn(['FIXED', 'FLEXIBLE']),
    body('status').optional().isString().isIn(['ACTIVE', 'INACTIVE', 'ARCHIVED']),
    body('annualRate').optional().isFloat({ min: 0, max: 100 }),
    body('compoundFrequency').optional().isString().isIn(['DAILY', 'WEEKLY', 'MONTHLY']),
    body('minAmount').optional().isFloat({ min: 0 }),
    body('maxAmount').optional().isFloat({ min: 0 }),
    body('lockDays').optional().isInt({ min: 1 }),
    body('earlyWithdrawalFee').optional().isFloat({ min: 0, max: 100 }),
    body('description').optional().isString(),
    body('icon').optional().isString(),
    body('order').optional().isInt(),
  ],
  validate,
  async (req, res) => {
    try {
      const { planId } = req.params;

      const plan = await savingsService.adminUpdatePlan(planId, req.body);

      res.json({
        success: true,
        data: plan,
        message: 'Savings plan updated successfully',
      });
    } catch (error: any) {
      logger.error('Update savings plan error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to update savings plan',
      });
    }
  }
);

/**
 * DELETE /savings/admin/plans/:planId
 * Delete savings plan (Admin only)
 */
router.delete(
  '/admin/plans/:planId',
  authenticate,
  authorize(['ADMIN']),
  [param('planId').isString()],
  validate,
  async (req, res) => {
    try {
      const { planId } = req.params;

      const result = await savingsService.adminDeletePlan(planId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Delete savings plan error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to delete savings plan',
      });
    }
  }
);

export default router;
