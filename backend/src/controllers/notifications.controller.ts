import { Request, Response, NextFunction } from 'express';
import { notificationsService } from '../services/notifications.service';
import { NotificationType, NotificationStatus } from '@prisma/client';

class NotificationsController {
  async getUserNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { type, status, page = 1, limit = 20 } = req.query;

      const filters = {
        ...(type && { type: type as NotificationType }),
        ...(status && { status: status as NotificationStatus }),
      };

      const result = await notificationsService.getUserNotifications(
        userId,
        filters,
        Number(page),
        Number(limit)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const count = await notificationsService.getUnreadCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getUserNotificationStats(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { days = 7 } = req.query;

      const stats = await notificationsService.getUserNotificationStats(userId, Number(days));

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getNotificationById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const notification = await notificationsService.getNotificationById(id, userId);

      res.json({
        success: true,
        data: notification,
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const notification = await notificationsService.markAsRead(id, userId);

      res.json({
        success: true,
        data: notification,
        message: 'Notification marked as read',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      const count = await notificationsService.markAllAsRead(userId);

      res.json({
        success: true,
        data: { count },
        message: `${count} notifications marked as read`,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async archiveNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const notification = await notificationsService.archiveNotification(id, userId);

      res.json({
        success: true,
        data: notification,
        message: 'Notification archived',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteNotification(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await notificationsService.deleteNotification(id, userId);

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error: any) {
      res.status(error.message.includes('not found') ? 404 : 400).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteAllNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { olderThan } = req.query;

      const count = await notificationsService.deleteAllNotifications(
        userId,
        olderThan ? new Date(olderThan as string) : undefined
      );

      res.json({
        success: true,
        data: { count },
        message: `${count} notifications deleted`,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new NotificationsController();
