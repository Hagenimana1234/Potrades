import { Request, Response, NextFunction } from 'express';
import savingsService from '../services/savings.service';
import logger from '../utils/logger';

class SavingsController {
  // ==================== USER SAVINGS ROUTES ====================

  async getSavingsPlans(req: Request, res: Response, next: NextFunction) {
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
  }

  async getUserSavings(req: Request, res: Response, next: NextFunction) {
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
  }

  async getSavingsAnalytics(req: Request, res: Response, next: NextFunction) {
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
  }

  async estimateReturns(req: Request, res: Response, next: NextFunction) {
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

  async createSavingsDeposit(req: Request, res: Response, next: NextFunction) {
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

  async withdrawSavings(req: Request, res: Response, next: NextFunction) {
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

  // ==================== ADMIN SAVINGS ROUTES ====================

  async adminGetAllSavings(req: Request, res: Response, next: NextFunction) {
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

  async adminCreatePlan(req: Request, res: Response, next: NextFunction) {
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

  async adminUpdatePlan(req: Request, res: Response, next: NextFunction) {
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

  async adminDeletePlan(req: Request, res: Response, next: NextFunction) {
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
}

export default new SavingsController();
