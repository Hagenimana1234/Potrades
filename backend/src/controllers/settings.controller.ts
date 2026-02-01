import { Request, Response, NextFunction } from 'express';
import settingsService from '../services/settings.service';
import logger from '../utils/logger';

class SettingsController {
  // ==================== USER SETTINGS ====================

  async getUserSettings(req: Request, res: Response, _next: NextFunction) {
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
  }

  async updateUserSettings(req: Request, res: Response, _next: NextFunction) {
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

  async resetUserSettings(req: Request, res: Response, _next: NextFunction) {
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
  }

  // ==================== NOTIFICATIONS ====================

  async getNotificationPreferences(req: Request, res: Response, _next: NextFunction) {
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
  }

  async updateNotificationPreferences(req: Request, res: Response, _next: NextFunction) {
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

  // ==================== SECURITY ====================

  async getSecuritySettings(req: Request, res: Response, _next: NextFunction) {
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
  }
}

export default new SettingsController();
