import { Router } from 'express';
import { query, param } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import marketService from '../services/market.service';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /market/assets
 * Get all assets with filters and search
 * Can be accessed without authentication
 */
router.get(
  '/assets',
  [
    query('type').optional().isString().isIn(['FOREX', 'CRYPTO', 'COMMODITY', 'STOCK', 'INDEX', 'OTC']),
    query('search').optional().isString(),
    query('isActive').optional().isBoolean(),
    query('favoritesOnly').optional().isBoolean(),
    query('limit').optional().isInt({ min: 1, max: 200 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res) => {
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
);

/**
 * GET /market/assets/:assetId
 * Get single asset details
 */
router.get(
  '/assets/:assetId',
  [param('assetId').isString()],
  validate,
  async (req, res) => {
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
);

/**
 * GET /market/stats
 * Get market statistics
 */
router.get('/stats', async (req, res) => {
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
});

// ==================== FAVORITES ROUTES (Authenticated) ====================

/**
 * GET /market/favorites
 * Get user's favorite assets
 */
router.get('/favorites', authenticate, async (req, res) => {
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
});

/**
 * POST /market/favorites/:assetId
 * Add asset to favorites
 */
router.post(
  '/favorites/:assetId',
  authenticate,
  [param('assetId').isString()],
  validate,
  async (req, res) => {
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
);

/**
 * DELETE /market/favorites/:assetId
 * Remove asset from favorites
 */
router.delete(
  '/favorites/:assetId',
  authenticate,
  [param('assetId').isString()],
  validate,
  async (req, res) => {
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
);

export default router;
