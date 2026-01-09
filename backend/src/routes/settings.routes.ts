import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import settingsController from '../controllers/settings.controller';
import authController from '../controllers/auth.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== USER SETTINGS ====================

/**
 * GET /settings
 * Get all user settings
 */
router.get('/', settingsController.getUserSettings);

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
  settingsController.updateUserSettings
);

/**
 * POST /settings/reset
 * Reset settings to defaults
 */
router.post('/reset', settingsController.resetUserSettings);

// ==================== NOTIFICATIONS ====================

/**
 * GET /settings/notifications
 * Get notification preferences
 */
router.get('/notifications', settingsController.getNotificationPreferences);

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
  settingsController.updateNotificationPreferences
);

// ==================== SECURITY ====================

/**
 * GET /settings/security
 * Get security settings
 */
router.get('/security', settingsController.getSecuritySettings);

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
