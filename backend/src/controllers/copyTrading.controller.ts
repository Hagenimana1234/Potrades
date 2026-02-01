import { Request, Response, NextFunction } from 'express';
import copyTradingService from '../services/copyTrading.service';
import logger from '../utils/logger';

class CopyTradingController {
  // ==================== PUBLIC COPY TRADERS ====================

  async getPublicCopyTraders(req: Request, res: Response, _next: NextFunction) {
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

  async getCopyTraderDetails(req: Request, res: Response, _next: NextFunction) {
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

  async getCopyTraderPerformance(req: Request, res: Response, _next: NextFunction) {
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

  async getFollowerStatistics(req: Request, res: Response, _next: NextFunction) {
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

  // ==================== USER COPY TRADING ====================

  async followCopyTrader(req: Request, res: Response, _next: NextFunction) {
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

  async unfollowCopyTrader(req: Request, res: Response, _next: NextFunction) {
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

  async pauseCopyRelationship(req: Request, res: Response, _next: NextFunction) {
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

  async resumeCopyRelationship(req: Request, res: Response, _next: NextFunction) {
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

  async updateCopyRelationship(req: Request, res: Response, _next: NextFunction) {
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

  async getUserCopyRelationships(req: Request, res: Response, _next: NextFunction) {
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
  }

  // ==================== COPY TRADER PROFILE ====================

  async getMyCopyTraderProfile(req: Request, res: Response, _next: NextFunction) {
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
  }

  async applyAsCopyTrader(req: Request, res: Response, _next: NextFunction) {
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

  async updateCopyTraderProfile(req: Request, res: Response, _next: NextFunction) {
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
}

export default new CopyTradingController();
