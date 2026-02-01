import { Router } from 'express';
import { param, query } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import notificationsController from '../controllers/notifications.controller';
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
  notificationsController.getUserNotifications
);

/**
 * GET /api/notifications/unread-count
 * Get unread notifications count
 */
router.get('/unread-count', notificationsController.getUnreadCount);

/**
 * GET /api/notifications/stats
 * Get notification statistics
 */
router.get(
  '/stats',
  validate([query('days').optional().isInt({ min: 1, max: 90 }).toInt()]),
  notificationsController.getUserNotificationStats
);

/**
 * GET /api/notifications/:id
 * Get notification by ID
 */
router.get(
  '/:id',
  validate([param('id').isString()]),
  notificationsController.getNotificationById
);

/**
 * POST /api/notifications/:id/read
 * Mark notification as read
 */
router.post(
  '/:id/read',
  validate([param('id').isString()]),
  notificationsController.markAsRead
);

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', notificationsController.markAllAsRead);

/**
 * POST /api/notifications/:id/archive
 * Archive a notification
 */
router.post(
  '/:id/archive',
  validate([param('id').isString()]),
  notificationsController.archiveNotification
);

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  validate([param('id').isString()]),
  notificationsController.deleteNotification
);

/**
 * DELETE /api/notifications
 * Delete all notifications
 */
router.delete(
  '/',
  validate([query('olderThan').optional().isISO8601()]),
  notificationsController.deleteAllNotifications
);

export default router;
