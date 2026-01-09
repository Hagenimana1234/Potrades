import { Request, Response, NextFunction } from 'express';
import marketService from '../services/market.service';
import logger from '../utils/logger';

class MarketController {
  async getAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || null;
      const { type, search, isActive, favoritesOnly, limit, offset } = req.query;

      const result = await marketService.getAssets(userId, {
        type: type as any,
        search: search as string,
        isActive: isActive === 'true',
        favoritesOnly: favoritesOnly === 'true',
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Get assets error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch assets',
      });
    }
  }

  async getAssetDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id || null;
      const { assetId } = req.params;

      const asset = await marketService.getAssetDetails(assetId, userId);

      res.json({
        success: true,
        data: asset,
      });
    } catch (error: any) {
      logger.error('Get asset details error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to fetch asset details',
      });
    }
  }

  async getMarketStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await marketService.getMarketStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get market stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch market stats',
      });
    }
  }

  // ==================== FAVORITES ROUTES ====================

  async getFavorites(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const favorites = await marketService.getFavorites(userId);

      res.json({
        success: true,
        data: favorites,
      });
    } catch (error: any) {
      logger.error('Get favorites error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch favorites',
      });
    }
  }

  async addFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { assetId } = req.params;

      const favorite = await marketService.addFavorite(userId, assetId);

      res.status(201).json({
        success: true,
        data: favorite,
        message: 'Asset added to favorites',
      });
    } catch (error: any) {
      logger.error('Add favorite error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to add favorite',
      });
    }
  }

  async removeFavorite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { assetId } = req.params;

      const result = await marketService.removeFavorite(userId, assetId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Remove favorite error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to remove favorite',
      });
    }
  }
}

export default new MarketController();
