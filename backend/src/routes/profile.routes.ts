import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import profileService from '../services/profile.service';
import logger from '../utils/logger';

const router = Router();

// ==================== USER PROFILE ROUTES ====================

/**
 * GET /profile
 * Get current user's profile
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const profile = await profileService.getUserProfile(userId);

    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    logger.error('Get profile error:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch profile',
    });
  }
});

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
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { firstName, lastName, phone, country, city, address, dateOfBirth, profilePicture } = req.body;

      const profile = await profileService.updateProfile(userId, {
        firstName,
        lastName,
        phone,
        country,
        city,
        address,
        dateOfBirth,
        profilePicture,
      });

      res.json({
        success: true,
        data: profile,
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
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { documentType, documentNumber, frontImage, backImage, selfieImage } = req.body;

      const result = await profileService.uploadKYC(userId, {
        documentType,
        documentNumber,
        frontImage,
        backImage,
        selfieImage,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'KYC documents submitted successfully. Awaiting verification.',
      });
    } catch (error: any) {
      logger.error('Upload KYC error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to upload KYC documents',
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { currentPassword, newPassword } = req.body;

      await profileService.changePassword({
        userId,
        currentPassword,
        newPassword,
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error: any) {
      logger.error('Change password error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to change password',
      });
    }
  }
);

/**
 * GET /profile/sessions
 * Get user's active sessions
 */
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;

    const sessions = await profileService.getUserSessions(userId);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch sessions',
    });
  }
});

/**
 * DELETE /profile/sessions/:sessionId
 * Revoke a specific session
 */
router.delete(
  '/sessions/:sessionId',
  authenticate,
  [param('sessionId').isString()],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const sessionId = req.params.sessionId;

      await profileService.revokeSession(userId, sessionId);

      res.json({
        success: true,
        message: 'Session revoked successfully',
      });
    } catch (error: any) {
      logger.error('Revoke session error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to revoke session',
      });
    }
  }
);

/**
 * DELETE /profile/sessions
 * Revoke all sessions except current
 */
router.delete('/sessions', authenticate, async (req, res) => {
  try {
    const userId = req.user!.id;
    const currentSessionId = req.sessionId; // If available from auth middleware

    const result = await profileService.revokeAllSessions(userId, currentSessionId);

    res.json({
      success: true,
      message: `${result.count} session(s) revoked successfully`,
      data: result,
    });
  } catch (error: any) {
    logger.error('Revoke all sessions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to revoke sessions',
    });
  }
});

/**
 * GET /profile/activity
 * Get user activity logs
 */
router.get(
  '/activity',
  authenticate,
  [query('limit').optional().isInt({ min: 1, max: 200 })],
  validate,
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const logs = await profileService.getActivityLogs(userId, limit);

      res.json({
        success: true,
        data: logs,
      });
    } catch (error: any) {
      logger.error('Get activity logs error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch activity logs',
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { preferences } = req.body;

      await profileService.updateNotificationPreferences(userId, preferences);

      res.json({
        success: true,
        message: 'Notification preferences updated successfully',
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
  async (req, res) => {
    try {
      const userId = req.params.userId;

      const profile = await profileService.adminGetUserProfile(userId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      logger.error('Admin get profile error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Failed to fetch profile',
      });
    }
  }
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
  async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const pending = await profileService.getPendingKYC(limit);

      res.json({
        success: true,
        data: pending,
      });
    } catch (error: any) {
      logger.error('Get pending KYC error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch pending KYC',
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.params.userId;
      const adminId = req.user!.id;
      const { status, rejectionReason, notes } = req.body;

      const result = await profileService.verifyKYC({
        userId,
        adminId,
        status,
        rejectionReason,
        notes,
      });

      res.json({
        success: true,
        data: result,
        message: `KYC ${status === 'VERIFIED' ? 'verified' : 'rejected'} successfully`,
      });
    } catch (error: any) {
      logger.error('Verify KYC error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to verify KYC',
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.params.userId;
      const adminId = req.user!.id;
      const { status, reason } = req.body;

      const result = await profileService.adminUpdateUserStatus(userId, status, adminId, reason);

      res.json({
        success: true,
        data: result,
        message: `User status updated to ${status}`,
      });
    } catch (error: any) {
      logger.error('Update user status error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to update user status',
      });
    }
  }
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
  async (req, res) => {
    try {
      const userId = req.params.userId;
      const adminId = req.user!.id;
      const { walletType, amount, reason } = req.body;

      const result = await profileService.adminAdjustBalance(userId, walletType, amount, adminId, reason);

      res.json({
        success: true,
        data: result,
        message: 'Balance adjusted successfully',
      });
    } catch (error: any) {
      logger.error('Adjust balance error:', error);
      res.status(error.statusCode || 400).json({
        success: false,
        error: error.message || 'Failed to adjust balance',
      });
    }
  }
);

export default router;
