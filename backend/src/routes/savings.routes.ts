import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import savingsController from '../controllers/savings.controller';

const router = Router();

// ==================== USER SAVINGS ROUTES ====================

/**
 * GET /savings/plans
 * Get all active savings plans
 */
router.get('/plans', authenticate, savingsController.getSavingsPlans);

/**
 * GET /savings/my-savings
 * Get user's savings deposits
 */
router.get('/my-savings', authenticate, savingsController.getUserSavings);

/**
 * GET /savings/analytics
 * Get savings analytics for user
 */
router.get('/analytics', authenticate, savingsController.getSavingsAnalytics);

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
  savingsController.estimateReturns
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
  savingsController.createSavingsDeposit
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
  savingsController.withdrawSavings
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
  savingsController.adminGetAllSavings
);

/**
 * GET /savings/admin/plans
 * Get all savings plans including inactive (Admin only)
 */
router.get(
  '/admin/plans',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  savingsController.adminGetPlans
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
  savingsController.adminCreatePlan
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
  savingsController.adminUpdatePlan
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
  savingsController.adminDeletePlan
);

export default router;
