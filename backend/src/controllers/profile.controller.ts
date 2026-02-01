import { Request, Response, NextFunction } from 'express';
import profileService from '../services/profile.service';
import logger from '../utils/logger';

class ProfileController {
  // ==================== USER PROFILE ROUTES ====================

  async getUserProfile(req: Request, res: Response, _next: NextFunction) {
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
  }

  async updateProfile(req: Request, res: Response, _next: NextFunction) {
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

  // ==================== KYC ROUTES ====================

  async uploadKYC(req: Request, res: Response, _next: NextFunction) {
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

  // ==================== SECURITY ROUTES ====================

  async changePassword(req: Request, res: Response, _next: NextFunction) {
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

  async getUserSessions(req: Request, res: Response, _next: NextFunction) {
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
  }

  async revokeSession(req: Request, res: Response, _next: NextFunction) {
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

  async revokeAllSessions(req: Request, res: Response, _next: NextFunction) {
    try {
      const userId = req.user!.id;
      const currentSessionId = req.sessionId;

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
  }

  async getActivityLogs(req: Request, res: Response, _next: NextFunction) {
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

  async updateNotificationPreferences(req: Request, res: Response, _next: NextFunction) {
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

  // ==================== ADMIN PROFILE ROUTES ====================

  async adminGetUserProfile(req: Request, res: Response, _next: NextFunction) {
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

  async getPendingKYC(req: Request, res: Response, _next: NextFunction) {
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

  async verifyKYC(req: Request, res: Response, _next: NextFunction) {
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

  async adminUpdateUserStatus(req: Request, res: Response, _next: NextFunction) {
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

  async adminAdjustBalance(req: Request, res: Response, _next: NextFunction) {
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
}

export default new ProfileController();
