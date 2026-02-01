import { Request, Response, NextFunction } from 'express';
import affiliateService from '../services/affiliate.service';
import logger from '../utils/logger';

class AffiliateController {
  // ==================== USER AFFILIATE ROUTES ====================

  async applyAsAffiliate(req: Request, res: Response, _next: NextFunction) {
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

  async getAffiliateDetails(req: Request, res: Response, _next: NextFunction) {
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
  }

  async getAffiliateStats(req: Request, res: Response, _next: NextFunction) {
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
  }

  async getAffiliateCommissions(req: Request, res: Response, _next: NextFunction) {
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

  async getReferralStats(req: Request, res: Response, _next: NextFunction) {
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
  }

  // ==================== ANALYTICS ROUTES ====================

  async getPerformanceAnalytics(req: Request, res: Response, _next: NextFunction) {
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

  // ==================== PAYOUT ROUTES ====================

  async requestPayout(req: Request, res: Response, _next: NextFunction) {
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

  async getAffiliatePayouts(req: Request, res: Response, _next: NextFunction) {
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
  }

  // ==================== CONTEST ROUTES ====================

  async getActiveContests(_req: Request, res: Response, _next: NextFunction) {
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
  }

  async getContestLeaderboard(req: Request, res: Response, _next: NextFunction) {
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

  // ==================== ADMIN AFFILIATE ROUTES ====================

  async adminGetAffiliates(req: Request, res: Response, _next: NextFunction) {
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

  async approveAffiliate(req: Request, res: Response, _next: NextFunction) {
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

  async suspendAffiliate(req: Request, res: Response, _next: NextFunction) {
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

  async adminGetPendingCommissions(req: Request, res: Response, _next: NextFunction) {
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

  async approveCommission(req: Request, res: Response, _next: NextFunction) {
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

  async payCommission(req: Request, res: Response, _next: NextFunction) {
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

  async adminGetAffiliateDetails(req: Request, res: Response, _next: NextFunction) {
    try {
      const affiliateId = req.params.affiliateId;

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

  // ==================== ADMIN PAYOUT ROUTES ====================

  async adminGetPendingPayouts(_req: Request, res: Response, _next: NextFunction) {
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

  async processPayout(req: Request, res: Response, _next: NextFunction) {
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

  // ==================== ADMIN PLAN ROUTES ====================

  async adminGetPlans(_req: Request, res: Response, _next: NextFunction) {
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

  async adminCreatePlan(req: Request, res: Response, _next: NextFunction) {
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

  async adminUpdatePlan(req: Request, res: Response, _next: NextFunction) {
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

  async adminDeletePlan(req: Request, res: Response, _next: NextFunction) {
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

  // ==================== ADMIN CONTEST ROUTES ====================

  async adminGetContests(_req: Request, res: Response, _next: NextFunction) {
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

  async adminCreateContest(req: Request, res: Response, _next: NextFunction) {
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

  async adminUpdateContest(req: Request, res: Response, _next: NextFunction) {
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
}

export default new AffiliateController();
