import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import affiliateService from '../services/affiliate.service';
import logger from '../utils/logger';

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
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { commissionModel } = req.body;

      const affiliate = await affiliateService.applyAsAffiliate(userId, {
        commissionModel,
      });

      res.status(201).json({
        success: true,
        data: affiliate,
        message: 'Application submitted successfully. Awaiting approval.',
      });
    } catch (error: any) {
      logger.error('Apply affiliate error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to apply as affiliate',
      });
    }
  }
);

/**
 * GET /affiliate/details
 * Get current user's affiliate details
 */
router.get('/details', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const affiliate = await affiliateService.getAffiliateDetails(userId);

    res.json({
      success: true,
      data: affiliate,
    });
  } catch (error: any) {
    logger.error('Get affiliate details error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch affiliate details',
    });
  }
});

/**
 * GET /affiliate/stats
 * Get affiliate statistics and performance metrics
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const stats = await affiliateService.getAffiliateStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get affiliate stats error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch affiliate stats',
    });
  }
});

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
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { status, type, limit, offset } = req.query;

      const affiliate = await affiliateService.getAffiliateDetails(userId);

      const result = await affiliateService.getAffiliateCommissions(affiliate.id, {
        status: status as any,
        type: type as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Get affiliate commissions error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to fetch commissions',
      });
    }
  }
);

/**
 * GET /affiliate/referrals
 * Get user's referral statistics
 */
router.get('/referrals', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const stats = await affiliateService.getReferralStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Get referral stats error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch referral stats',
    });
  }
});

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
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const affiliate = await affiliateService.getAffiliateDetails(userId);
      const analytics = await affiliateService.getPerformanceAnalytics(affiliate.id, days);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      logger.error('Get analytics error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to fetch analytics',
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { amount, method, destination } = req.body;

      const affiliate = await affiliateService.getAffiliateDetails(userId);
      const payout = await affiliateService.requestPayout({
        affiliateId: affiliate.id,
        amount,
        method,
        destination,
      });

      res.status(201).json({
        success: true,
        data: payout,
        message: 'Payout request submitted successfully',
      });
    } catch (error: any) {
      logger.error('Request payout error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to request payout',
      });
    }
  }
);

/**
 * GET /affiliate/payouts
 * Get payout history
 */
router.get('/payouts', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const affiliate = await affiliateService.getAffiliateDetails(userId);
    const payouts = await affiliateService.getAffiliatePayouts(affiliate.id);

    res.json({
      success: true,
      data: payouts,
    });
  } catch (error: any) {
    logger.error('Get payouts error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch payouts',
    });
  }
});

// ==================== CONTEST ROUTES ====================

/**
 * GET /affiliate/contests
 * Get active and upcoming contests
 */
router.get('/contests', authenticate, async (req, res) => {
  try {
    const contests = await affiliateService.getActiveContests();

    res.json({
      success: true,
      data: contests,
    });
  } catch (error: any) {
    logger.error('Get contests error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch contests',
    });
  }
});

/**
 * GET /affiliate/contests/:contestId/leaderboard
 * Get contest leaderboard
 */
router.get(
  '/contests/:contestId/leaderboard',
  authenticate,
  [param('contestId').isString()],
  validate,
  async (req, res) => {
    try {
      const contestId = req.params.contestId;

      const leaderboard = await affiliateService.getContestLeaderboard(contestId);

      res.json({
        success: true,
        data: leaderboard,
      });
    } catch (error: any) {
      logger.error('Get leaderboard error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to fetch leaderboard',
      });
    }
  }
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
  async (req, res) => {
    try {
      const { status, minTotalCommission, limit, offset } = req.query;

      const result = await affiliateService.adminGetAffiliates({
        status: status as any,
        minTotalCommission: minTotalCommission ? parseFloat(minTotalCommission as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Admin get affiliates error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch affiliates',
      });
    }
  }
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
  async (req, res) => {
    try {
      const affiliateId = req.params.affiliateId;
      const adminId = req.user!.id;
      const { commissionModel, revenueSharePercent, cpaAmount, tier } = req.body;

      const affiliate = await affiliateService.approveAffiliate(affiliateId, adminId, {
        commissionModel,
        revenueSharePercent,
        cpaAmount,
        tier,
      });

      res.json({
        success: true,
        data: affiliate,
        message: 'Affiliate approved successfully',
      });
    } catch (error: any) {
      logger.error('Approve affiliate error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to approve affiliate',
      });
    }
  }
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
  async (req, res) => {
    try {
      const affiliateId = req.params.affiliateId;
      const adminId = req.user!.id;

      const affiliate = await affiliateService.suspendAffiliate(affiliateId, adminId);

      res.json({
        success: true,
        data: affiliate,
        message: 'Affiliate suspended successfully',
      });
    } catch (error: any) {
      logger.error('Suspend affiliate error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to suspend affiliate',
      });
    }
  }
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
  async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const commissions = await affiliateService.adminGetPendingCommissions(limit);

      res.json({
        success: true,
        data: commissions,
      });
    } catch (error: any) {
      logger.error('Get pending commissions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch pending commissions',
      });
    }
  }
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
  async (req, res) => {
    try {
      const commissionId = req.params.commissionId;
      const adminId = req.user!.id;

      const commission = await affiliateService.approveCommission(commissionId, adminId);

      res.json({
        success: true,
        data: commission,
        message: 'Commission approved successfully',
      });
    } catch (error: any) {
      logger.error('Approve commission error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to approve commission',
      });
    }
  }
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
  async (req, res) => {
    try {
      const commissionId = req.params.commissionId;
      const adminId = req.user!.id;
      const { paymentMethod, paymentRef } = req.body;

      const commission = await affiliateService.payCommission(
        commissionId,
        adminId,
        paymentMethod,
        paymentRef
      );

      res.json({
        success: true,
        data: commission,
        message: 'Commission paid successfully',
      });
    } catch (error: any) {
      logger.error('Pay commission error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to pay commission',
      });
    }
  }
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
  async (req, res) => {
    try {
      const affiliateId = req.params.affiliateId;

      // Find user ID from affiliate ID
      const affiliate = await affiliateService.getAffiliateDetails(affiliateId);

      res.json({
        success: true,
        data: affiliate,
      });
    } catch (error: any) {
      logger.error('Get affiliate details error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to fetch affiliate details',
      });
    }
  }
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
  async (req, res) => {
    try {
      const payouts = await affiliateService.adminGetPendingPayouts();

      res.json({
        success: true,
        data: payouts,
      });
    } catch (error: any) {
      logger.error('Get pending payouts error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch pending payouts',
      });
    }
  }
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
  async (req, res) => {
    try {
      const payoutId = req.params.payoutId;
      const adminId = req.user!.id;
      const { status, txHash, notes } = req.body;

      const payout = await affiliateService.processPayout(payoutId, adminId, {
        status,
        txHash,
        notes,
      });

      res.json({
        success: true,
        data: payout,
        message: `Payout ${status === 'COMPLETED' ? 'approved' : 'rejected'} successfully`,
      });
    } catch (error: any) {
      logger.error('Process payout error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to process payout',
      });
    }
  }
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
  async (req, res) => {
    try {
      const plans = await affiliateService.adminGetPlans();

      res.json({
        success: true,
        data: plans,
      });
    } catch (error: any) {
      logger.error('Get plans error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch plans',
      });
    }
  }
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
  async (req, res) => {
    try {
      const plan = await affiliateService.adminCreatePlan(req.body);

      res.status(201).json({
        success: true,
        data: plan,
        message: 'Affiliate plan created successfully',
      });
    } catch (error: any) {
      logger.error('Create plan error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create plan',
      });
    }
  }
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
  async (req, res) => {
    try {
      const planId = req.params.planId;

      const plan = await affiliateService.adminUpdatePlan(planId, req.body);

      res.json({
        success: true,
        data: plan,
        message: 'Affiliate plan updated successfully',
      });
    } catch (error: any) {
      logger.error('Update plan error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to update plan',
      });
    }
  }
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
  async (req, res) => {
    try {
      const planId = req.params.planId;

      await affiliateService.adminDeletePlan(planId);

      res.json({
        success: true,
        message: 'Affiliate plan deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete plan error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to delete plan',
      });
    }
  }
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
  async (req, res) => {
    try {
      const contests = await affiliateService.adminGetContests();

      res.json({
        success: true,
        data: contests,
      });
    } catch (error: any) {
      logger.error('Get contests error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch contests',
      });
    }
  }
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
  async (req, res) => {
    try {
      const contest = await affiliateService.adminCreateContest(req.body);

      res.status(201).json({
        success: true,
        data: contest,
        message: 'Contest created successfully',
      });
    } catch (error: any) {
      logger.error('Create contest error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create contest',
      });
    }
  }
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
  async (req, res) => {
    try {
      const contestId = req.params.contestId;

      const contest = await affiliateService.adminUpdateContest(contestId, req.body);

      res.json({
        success: true,
        data: contest,
        message: 'Contest updated successfully',
      });
    } catch (error: any) {
      logger.error('Update contest error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to update contest',
      });
    }
  }
);

export default router;
