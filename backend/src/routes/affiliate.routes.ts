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

export default router;
