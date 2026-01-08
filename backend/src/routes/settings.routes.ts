import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import settingsService from '../services/settings.service';
import authController from '../controllers/auth.controller';
import logger from '../utils/logger';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== USER SETTINGS ====================

/**
 * GET /settings
 * Get all user settings
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;

    const settings = await settingsService.getUserSettings(userId);

    res.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    logger.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch settings',
    });
  }
});

/**
 * PUT /settings
 * Update user settings
 */
router.put(
  '/',
  [
    body('theme').optional().isString().isIn(['light', 'dark', 'auto']),
    body('language').optional().isString(),
    body('timezone').optional().isString(),
    body('emailNotifications').optional().isObject(),
    body('pushNotifications').optional().isObject(),
    body('tradingDefaults').optional().isObject(),
    body('currencyDisplay').optional().isObject(),
    body('displayPreferences').optional().isObject(),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;

      const updatedSettings = await settingsService.updateUserSettings(userId, req.body);

      res.json({
        success: true,
        data: updatedSettings,
        message: 'Settings updated successfully',
      });
    } catch (error: any) {
      logger.error('Update settings error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to update settings',
      });
    }
  }
);

/**
 * POST /settings/reset
 * Reset settings to defaults
 */
router.post('/reset', async (req, res) => {
  try {
    const userId = req.user!.id;

    const defaultSettings = await settingsService.resetUserSettings(userId);

    res.json({
      success: true,
      data: defaultSettings,
      message: 'Settings reset to defaults',
    });
  } catch (error: any) {
    logger.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset settings',
    });
  }
});

// ==================== NOTIFICATIONS ====================

/**
 * GET /settings/notifications
 * Get notification preferences
 */
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user!.id;

    const preferences = await settingsService.getNotificationPreferences(userId);

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    logger.error('Get notification preferences error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notification preferences',
    });
  }
});

/**
 * PUT /settings/notifications
 * Update notification preferences
 */
router.put(
  '/notifications',
  [
    body('email').optional().isObject(),
    body('push').optional().isObject(),
  ],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;

      const preferences = await settingsService.updateNotificationPreferences(userId, req.body);

      res.json({
        success: true,
        data: preferences,
        message: 'Notification preferences updated',
      });
    } catch (error: any) {
      logger.error('Update notification preferences error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update notification preferences',
      });
    }
  }
);

// ==================== SECURITY ====================

/**
 * GET /settings/security
 * Get security settings
 */
router.get('/security', async (req, res) => {
  try {
    const userId = req.user!.id;

    const securitySettings = await settingsService.getSecuritySettings(userId);

    res.json({
      success: true,
      data: securitySettings,
    });
  } catch (error: any) {
    logger.error('Get security settings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch security settings',
    });
  }
});

/**
 * POST /settings/security/password
 * Change password (delegates to auth controller)
 */
router.post(
  '/security/password',
  [
    body('currentPassword').isString().isLength({ min: 1 }),
    body('newPassword').isString().isLength({ min: 8 }),
  ],
  validate,
  authController.changePassword
);

/**
 * POST /settings/security/2fa/setup
 * Setup 2FA (delegates to auth controller)
 */
router.post('/security/2fa/setup', authController.setup2FA);

/**
 * POST /settings/security/2fa/enable
 * Enable 2FA (delegates to auth controller)
 */
router.post(
  '/security/2fa/enable',
  [body('token').isString().isLength({ min: 6, max: 6 })],
  validate,
  authController.enable2FA
);

/**
 * POST /settings/security/2fa/disable
 * Disable 2FA (delegates to auth controller)
 */
router.post(
  '/security/2fa/disable',
  [body('token').isString().isLength({ min: 6, max: 6 })],
  validate,
  authController.disable2FA
);

/**
 * GET /settings/security/sessions
 * Get active sessions (delegates to auth controller)
 */
router.get('/security/sessions', authController.getSessions);

/**
 * POST /settings/security/logout-all
 * Logout all sessions (delegates to auth controller)
 */
router.post('/security/logout-all', authController.logoutAll);

export default router;
