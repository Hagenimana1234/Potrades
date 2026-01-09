import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import affiliateController from '../controllers/affiliate.controller';

const router = Router();

// ==================== USER AFFILIATE ROUTES ====================

/**
 * POST /affiliate/apply
 * Apply to become an affiliate
 */
router.post(
  '/apply',
  authenticate,
  [body('commissionModel').optional().isString()],
  validate,
  affiliateController.applyAsAffiliate
);

/**
 * GET /affiliate/details
 * Get current user's affiliate details
 */
router.get('/details', authenticate, affiliateController.getAffiliateDetails);

/**
 * GET /affiliate/stats
 * Get affiliate statistics and performance metrics
 */
router.get('/stats', authenticate, affiliateController.getAffiliateStats);

/**
 * GET /affiliate/commissions
 * Get user's commission history
 */
router.get(
  '/commissions',
  authenticate,
  [
    query('status').optional().isString(),
    query('type').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validate,
  affiliateController.getAffiliateCommissions
);

/**
 * GET /affiliate/referrals
 * Get user's referral statistics
 */
router.get('/referrals', authenticate, affiliateController.getReferralStats);

// ==================== ANALYTICS ROUTES ====================

/**
 * GET /affiliate/analytics
 * Get performance analytics for current affiliate
 */
router.get(
  '/analytics',
  authenticate,
  [query('days').optional().isInt({ min: 1, max: 365 })],
  validate,
  affiliateController.getPerformanceAnalytics
);

// ==================== PAYOUT ROUTES ====================

/**
 * POST /affiliate/payouts/request
 * Request a payout
 */
router.post(
  '/payouts/request',
  authenticate,
  [
    body('amount').isFloat({ min: 0.01 }),
    body('method').isString().isIn(['BANK_TRANSFER', 'CRYPTO', 'PAYPAL', 'WISE']),
    body('destination').isObject(),
  ],
  validate,
  affiliateController.requestPayout
);

/**
 * GET /affiliate/payouts
 * Get payout history
 */
router.get('/payouts', authenticate, affiliateController.getAffiliatePayouts);

// ==================== CONTEST ROUTES ====================

/**
 * GET /affiliate/contests
 * Get active and upcoming contests
 */
router.get('/contests', authenticate, affiliateController.getActiveContests);

/**
 * GET /affiliate/contests/:contestId/leaderboard
 * Get contest leaderboard
 */
router.get(
  '/contests/:contestId/leaderboard',
  authenticate,
  [param('contestId').isString()],
  validate,
  affiliateController.getContestLeaderboard
);

// ==================== ADMIN AFFILIATE ROUTES ====================

/**
 * GET /affiliate/admin/all
 * Get all affiliates (Admin only)
 */
router.get(
  '/admin/all',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  [
    query('status').optional().isString(),
    query('minTotalCommission').optional().isFloat(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validate,
  affiliateController.adminGetAffiliates
);

/**
 * POST /affiliate/admin/:affiliateId/approve
 * Approve affiliate application (Admin only)
 */
router.post(
  '/admin/:affiliateId/approve',
  authenticate,
  authorize(['ADMIN']),
  [
    param('affiliateId').isString(),
    body('commissionModel').optional().isString(),
    body('revenueSharePercent').optional().isFloat({ min: 0, max: 100 }),
    body('cpaAmount').optional().isFloat({ min: 0 }),
    body('tier').optional().isInt({ min: 1, max: 10 }),
  ],
  validate,
  affiliateController.approveAffiliate
);

/**
 * POST /affiliate/admin/:affiliateId/suspend
 * Suspend affiliate (Admin only)
 */
router.post(
  '/admin/:affiliateId/suspend',
  authenticate,
  authorize(['ADMIN']),
  [param('affiliateId').isString()],
  validate,
  affiliateController.suspendAffiliate
);

/**
 * GET /affiliate/admin/commissions/pending
 * Get pending commissions (Admin only)
 */
router.get(
  '/admin/commissions/pending',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  [query('limit').optional().isInt({ min: 1, max: 200 })],
  validate,
  affiliateController.adminGetPendingCommissions
);

/**
 * POST /affiliate/admin/commissions/:commissionId/approve
 * Approve commission (Admin only)
 */
router.post(
  '/admin/commissions/:commissionId/approve',
  authenticate,
  authorize(['ADMIN']),
  [param('commissionId').isString()],
  validate,
  affiliateController.approveCommission
);

/**
 * POST /affiliate/admin/commissions/:commissionId/pay
 * Pay commission (Admin only)
 */
router.post(
  '/admin/commissions/:commissionId/pay',
  authenticate,
  authorize(['ADMIN']),
  [
    param('commissionId').isString(),
    body('paymentMethod').optional().isString(),
    body('paymentRef').optional().isString(),
  ],
  validate,
  affiliateController.payCommission
);

/**
 * GET /affiliate/admin/:affiliateId/details
 * Get affiliate details by ID (Admin only)
 */
router.get(
  '/admin/:affiliateId/details',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  [param('affiliateId').isString()],
  validate,
  affiliateController.adminGetAffiliateDetails
);

// ==================== ADMIN PAYOUT ROUTES ====================

/**
 * GET /affiliate/admin/payouts/pending
 * Get pending payout requests (Admin only)
 */
router.get(
  '/admin/payouts/pending',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  affiliateController.adminGetPendingPayouts
);

/**
 * POST /affiliate/admin/payouts/:payoutId/process
 * Process payout (approve/reject) (Admin only)
 */
router.post(
  '/admin/payouts/:payoutId/process',
  authenticate,
  authorize(['ADMIN']),
  [
    param('payoutId').isString(),
    body('status').isString().isIn(['COMPLETED', 'REJECTED']),
    body('txHash').optional().isString(),
    body('notes').optional().isString(),
  ],
  validate,
  affiliateController.processPayout
);

// ==================== ADMIN PLAN ROUTES ====================

/**
 * GET /affiliate/admin/plans
 * Get all affiliate plans (Admin only)
 */
router.get(
  '/admin/plans',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  affiliateController.adminGetPlans
);

/**
 * POST /affiliate/admin/plans
 * Create affiliate plan (Admin only)
 */
router.post(
  '/admin/plans',
  authenticate,
  authorize(['ADMIN']),
  [
    body('name').isString().isLength({ min: 1, max: 100 }),
    body('description').optional().isString(),
    body('status').optional().isString().isIn(['ACTIVE', 'INACTIVE']),
    body('commissionModel').isString().isIn(['CPA', 'REVENUE_SHARE', 'HYBRID']),
    body('cpaAmount').optional().isFloat({ min: 0 }),
    body('revenueSharePercent').optional().isFloat({ min: 0, max: 100 }),
    body('tier').isInt({ min: 1, max: 10 }),
    body('minReferrals').optional().isInt({ min: 0 }),
    body('minRevenue').optional().isFloat({ min: 0 }),
    body('maxPayoutPerMonth').optional().isFloat({ min: 0 }),
    body('payoutThreshold').optional().isFloat({ min: 0 }),
    body('customTracking').optional().isBoolean(),
    body('dedicatedSupport').optional().isBoolean(),
    body('marketingMaterials').optional().isBoolean(),
  ],
  validate,
  affiliateController.adminCreatePlan
);

/**
 * PUT /affiliate/admin/plans/:planId
 * Update affiliate plan (Admin only)
 */
router.put(
  '/admin/plans/:planId',
  authenticate,
  authorize(['ADMIN']),
  [
    param('planId').isString(),
    body('name').optional().isString().isLength({ min: 1, max: 100 }),
    body('description').optional().isString(),
    body('status').optional().isString().isIn(['ACTIVE', 'INACTIVE']),
    body('commissionModel').optional().isString().isIn(['CPA', 'REVENUE_SHARE', 'HYBRID']),
    body('cpaAmount').optional().isFloat({ min: 0 }),
    body('revenueSharePercent').optional().isFloat({ min: 0, max: 100 }),
    body('tier').optional().isInt({ min: 1, max: 10 }),
    body('minReferrals').optional().isInt({ min: 0 }),
    body('minRevenue').optional().isFloat({ min: 0 }),
    body('maxPayoutPerMonth').optional().isFloat({ min: 0 }),
    body('payoutThreshold').optional().isFloat({ min: 0 }),
    body('customTracking').optional().isBoolean(),
    body('dedicatedSupport').optional().isBoolean(),
    body('marketingMaterials').optional().isBoolean(),
  ],
  validate,
  affiliateController.adminUpdatePlan
);

/**
 * DELETE /affiliate/admin/plans/:planId
 * Delete affiliate plan (Admin only)
 */
router.delete(
  '/admin/plans/:planId',
  authenticate,
  authorize(['ADMIN']),
  [param('planId').isString()],
  validate,
  affiliateController.adminDeletePlan
);

// ==================== ADMIN CONTEST ROUTES ====================

/**
 * GET /affiliate/admin/contests
 * Get all contests (Admin only)
 */
router.get(
  '/admin/contests',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  affiliateController.adminGetContests
);

/**
 * POST /affiliate/admin/contests
 * Create contest (Admin only)
 */
router.post(
  '/admin/contests',
  authenticate,
  authorize(['ADMIN']),
  [
    body('name').isString().isLength({ min: 1, max: 200 }),
    body('description').optional().isString(),
    body('status').optional().isString().isIn(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
    body('startDate').isString(),
    body('endDate').isString(),
    body('metricType').isString().isIn(['REVENUE', 'COMMISSIONS', 'REFERRALS']),
    body('prizes').isObject(),
  ],
  validate,
  affiliateController.adminCreateContest
);

/**
 * PUT /affiliate/admin/contests/:contestId
 * Update contest (Admin only)
 */
router.put(
  '/admin/contests/:contestId',
  authenticate,
  authorize(['ADMIN']),
  [
    param('contestId').isString(),
    body('name').optional().isString().isLength({ min: 1, max: 200 }),
    body('description').optional().isString(),
    body('status').optional().isString().isIn(['UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED']),
    body('startDate').optional().isString(),
    body('endDate').optional().isString(),
    body('metricType').optional().isString().isIn(['REVENUE', 'COMMISSIONS', 'REFERRALS']),
    body('prizes').optional().isObject(),
  ],
  validate,
  affiliateController.adminUpdateContest
);

export default router;
