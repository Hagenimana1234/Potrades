import { Router } from 'express';
import { param, query, body } from 'express-validator';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { notificationsService } from '../services/notifications.service';
import { NotificationType, NotificationStatus } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/notifications
 * Get user's notifications with filtering and pagination
 */
router.get(
  '/',
  validate([
    query('type').optional().isIn(Object.values(NotificationType)),
    query('status').optional().isIn(Object.values(NotificationStatus)),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  async (req, res) => {
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
);

/**
 * GET /api/notifications/unread-count
 * Get unread notifications count
 */
router.get('/unread-count', async (req, res) => {
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
});

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
router.get(
  '/stats',
  validate([query('days').optional().isInt({ min: 1, max: 90 }).toInt()]),
  async (req, res) => {
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
);

/**
 * GET /api/notifications/:id
 * Get notification by ID
 */
router.get(
  '/:id',
  validate([param('id').isString()]),
  async (req, res) => {
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
);

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post(
  '/:id/read',
  validate([param('id').isString()]),
  async (req, res) => {
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
);

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', async (req, res) => {
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
});

/**
 * POST /api/notifications/:id/archive
 * Archive a notification
 */
router.post(
  '/:id/archive',
  validate([param('id').isString()]),
  async (req, res) => {
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
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  validate([param('id').isString()]),
  async (req, res) => {
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
);

/**
 * DELETE /api/notifications
 * Delete all notifications
 */
router.delete(
  '/',
  validate([query('olderThan').optional().isISO8601()]),
  async (req, res) => {
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
);

export default router;
