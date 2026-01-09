import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import profileController from '../controllers/profile.controller';

const router = Router();

// ==================== USER PROFILE ROUTES ====================

/**
 * GET /profile
 * Get current user's profile
 */
router.get('/', authenticate, profileController.getUserProfile);

/**
 * PUT /profile
 * Update user profile
 */
router.put(
  '/',
  authenticate,
  [
    body('firstName').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('lastName').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('phone').optional().isString().trim(),
    body('country').optional().isString().trim(),
    body('city').optional().isString().trim(),
    body('address').optional().isString().trim(),
    body('dateOfBirth').optional().isString(),
    body('profilePicture').optional().isString().isURL(),
  ],
  validate,
  profileController.updateProfile
);

// ==================== KYC ROUTES ====================

/**
 * POST /profile/kyc
 * Upload KYC documents
 */
router.post(
  '/kyc',
  authenticate,
  [
    body('documentType').isString().isIn(['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID']),
    body('documentNumber').isString().trim().isLength({ min: 1 }),
    body('frontImage').isString().isURL(),
    body('backImage').optional().isString().isURL(),
    body('selfieImage').optional().isString().isURL(),
  ],
  validate,
  profileController.uploadKYC
);

// ==================== SECURITY ROUTES ====================

/**
 * POST /profile/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').isString().isLength({ min: 1 }),
    body('newPassword').isString().isLength({ min: 8 }),
  ],
  validate,
  profileController.changePassword
);

/**
 * GET /profile/sessions
 * Get user's active sessions
 */
router.get('/sessions', authenticate, profileController.getUserSessions);

/**
 * DELETE /profile/sessions/:sessionId
 * Revoke a specific session
 */
router.delete(
  '/sessions/:sessionId',
  authenticate,
  [param('sessionId').isString()],
  validate,
  profileController.revokeSession
);

/**
 * DELETE /profile/sessions
 * Revoke all sessions except current
 */
router.delete('/sessions', authenticate, profileController.revokeAllSessions);

/**
 * GET /profile/activity
 * Get user activity logs
 */
router.get(
  '/activity',
  authenticate,
  [query('limit').optional().isInt({ min: 1, max: 200 })],
  validate,
  profileController.getActivityLogs
);

/**
 * PUT /profile/notifications
 * Update notification preferences
 */
router.put(
  '/notifications',
  authenticate,
  [body('preferences').isObject()],
  validate,
  profileController.updateNotificationPreferences
);

// ==================== ADMIN PROFILE ROUTES ====================

/**
 * GET /profile/admin/:userId
 * Get user profile by ID (Admin only)
 */
router.get(
  '/admin/:userId',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  [param('userId').isString()],
  validate,
  profileController.adminGetUserProfile
);

/**
 * GET /profile/admin/kyc/pending
 * Get pending KYC submissions (Admin only)
 */
router.get(
  '/admin/kyc/pending',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  profileController.getPendingKYC
);

/**
 * POST /profile/admin/kyc/:userId/verify
 * Verify or reject KYC (Admin only)
 */
router.post(
  '/admin/kyc/:userId/verify',
  authenticate,
  authorize(['ADMIN']),
  [
    param('userId').isString(),
    body('status').isString().isIn(['VERIFIED', 'REJECTED']),
    body('rejectionReason').optional().isString(),
    body('notes').optional().isString(),
  ],
  validate,
  profileController.verifyKYC
);

/**
 * PUT /profile/admin/:userId/status
 * Update user status (Admin only)
 */
router.put(
  '/admin/:userId/status',
  authenticate,
  authorize(['ADMIN']),
  [
    param('userId').isString(),
    body('status').isString().isIn(['ACTIVE', 'SUSPENDED', 'BANNED']),
    body('reason').optional().isString(),
  ],
  validate,
  profileController.adminUpdateUserStatus
);

/**
 * POST /profile/admin/:userId/adjust-balance
 * Adjust user balance (Admin only)
 */
router.post(
  '/admin/:userId/adjust-balance',
  authenticate,
  authorize(['ADMIN']),
  [
    param('userId').isString(),
    body('walletType').isString().isIn(['DEMO', 'REAL']),
    body('amount').isFloat(),
    body('reason').isString().isLength({ min: 5 }),
  ],
  validate,
  profileController.adminAdjustBalance
);

export default router;
