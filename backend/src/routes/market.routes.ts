import { Router } from 'express';
import { query, param } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import marketController from '../controllers/market.controller';

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
  marketController.getAssets
);

/**
 * GET /market/assets/:assetId
 * Get single asset details
 */
router.get(
  '/assets/:assetId',
  [param('assetId').isString()],
  validate,
  marketController.getAssetDetails
);

/**
 * GET /market/stats
 * Get market statistics
 */
router.get('/stats', marketController.getMarketStats);

// ==================== FAVORITES ROUTES (Authenticated) ====================

/**
 * GET /market/favorites
 * Get user's favorite assets
 */
router.get('/favorites', authenticate, marketController.getFavorites);

/**
 * POST /market/favorites/:assetId
 * Add asset to favorites
 */
router.post(
  '/favorites/:assetId',
  authenticate,
  [param('assetId').isString()],
  validate,
  marketController.addFavorite
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
  marketController.removeFavorite
);

export default router;
