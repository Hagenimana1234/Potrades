import { prisma } from '../lib/prisma';
import { NotificationType, NotificationStatus, Prisma } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

/**
 * Notifications Service
 * Manages user notifications for trades, deposits, withdrawals, security alerts, etc.
 * Supports real-time push notifications and in-app notification center
 */

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  link?: string;
}

interface NotificationFilters {
  type?: NotificationType;
  status?: NotificationStatus;
  startDate?: Date;
  endDate?: Date;
}

class NotificationsService {
  /**
   * Create a notification for a user
   */
  async createNotification(input: CreateNotificationInput) {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data || null,
        link: input.link,
      },
    });

    logger.info(`Notification created: ${notification.id} | Type: ${input.type} | User: ${input.userId}`);

    // Trigger WebSocket push notification
    this.sendWebSocketNotification(input.userId, notification);

    // Trigger FCM push notification (if configured)
    this.sendFCMNotification(input.userId, notification);

    return notification;
  }

  /**
   * Send real-time notification via WebSocket
   */
  private sendWebSocketNotification(userId: string, notification: any) {
    try {
      const wsServer = (global as any).wsServer;
      if (wsServer) {
        wsServer.broadcastNotification(userId, notification);
        logger.debug(`WebSocket notification sent to user ${userId}`);
      } else {
        logger.warn('WebSocket server not available for notifications');
      }
    } catch (error) {
      logger.error('Error sending WebSocket notification:', error);
    }
  }

  /**
   * Send push notification via FCM (Firebase Cloud Messaging)
   * This is a placeholder for when FCM is configured
   */
  private async sendFCMNotification(userId: string, notification: any) {
    try {
      // Check if FCM is configured
      if (!process.env.FCM_SERVER_KEY) {
        return; // FCM not configured, skip silently
      }

      // Get user's FCM tokens from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { fcmTokens: true },
      });

      if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
        return; // No FCM tokens registered
      }

      // TODO: Implement FCM push notification using firebase-admin SDK
      // Example:
      // await admin.messaging().sendMulticast({
      //   tokens: user.fcmTokens,
      //   notification: {
      //     title: notification.title,
      //     body: notification.message,
      //   },
      //   data: notification.data,
      // });

      logger.debug(`FCM notification would be sent to user ${userId} (not implemented yet)`);
    } catch (error) {
      logger.error('Error sending FCM notification:', error);
    }
  }

  /**
   * Create bulk notifications for multiple users
   */
  async createBulkNotifications(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
    const notifications = await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data || null,
        link: input.link,
      })),
    });

    logger.info(`Bulk notifications created: ${notifications.count} | Type: ${input.type}`);

    return notifications;
  }

  /**
   * Get user notifications with filtering and pagination
   */
  async getUserNotifications(
    userId: string,
    filters: NotificationFilters = {},
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status }),
      ...(filters.startDate &&
        filters.endDate && {
          createdAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId,
          status: NotificationStatus.UNREAD,
        },
      }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  /**
   * Get unread notifications count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
    });
  }

  /**
   * Get notification by ID
   */
  async getNotificationById(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await this.getNotificationById(notificationId, userId);

    if (notification.status === NotificationStatus.READ) {
      return notification;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        status: NotificationStatus.UNREAD,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    logger.info(`Marked ${result.count} notifications as read for user ${userId}`);

    return result.count;
  }

  /**
   * Archive a notification
   */
  async archiveNotification(notificationId: string, userId: string) {
    await this.getNotificationById(notificationId, userId);

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: NotificationStatus.ARCHIVED,
      },
    });

    return updated;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    await this.getNotificationById(notificationId, userId);

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    logger.info(`Notification deleted: ${notificationId}`);
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAllNotifications(userId: string, olderThan?: Date) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(olderThan && {
        createdAt: {
          lt: olderThan,
        },
      }),
    };

    const result = await prisma.notification.deleteMany({ where });

    logger.info(`Deleted ${result.count} notifications for user ${userId}`);

    return result.count;
  }

  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userId: string, days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [total, unread, byType] = await Promise.all([
      prisma.notification.count({
        where: {
          userId,
          createdAt: { gte: since },
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          status: NotificationStatus.UNREAD,
        },
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: {
          userId,
          createdAt: { gte: since },
        },
        _count: true,
      }),
    ]);

    const typeBreakdown: Record<string, number> = {};
    byType.forEach((item) => {
      typeBreakdown[item.type] = item._count;
    });

    return {
      total,
      unread,
      period: `${days} days`,
      byType: typeBreakdown,
    };
  }

  // ==================== NOTIFICATION CREATORS ====================
  // Helper methods to create specific types of notifications

  /**
   * Notify user of trade opened
   */
  async notifyTradeOpened(userId: string, tradeId: string, assetSymbol: string, direction: string, amount: number) {
    return this.createNotification({
      userId,
      type: NotificationType.TRADE_OPENED,
      title: 'Trade Opened',
      message: `Your ${direction} trade on ${assetSymbol} for $${amount.toFixed(2)} has been opened`,
      data: { tradeId, assetSymbol, direction, amount },
      link: `/trades`,
    });
  }

  /**
   * Notify user of trade closed
   */
  async notifyTradeClosed(
    userId: string,
    tradeId: string,
    assetSymbol: string,
    profit: number,
    status: 'WON' | 'LOST' | 'DRAW'
  ) {
    const isProfit = profit > 0;
    return this.createNotification({
      userId,
      type: NotificationType.TRADE_CLOSED,
      title: `Trade ${status}`,
      message: `Your trade on ${assetSymbol} has closed. ${
        isProfit ? `Profit: +$${profit.toFixed(2)}` : profit < 0 ? `Loss: $${Math.abs(profit).toFixed(2)}` : 'Draw'
      }`,
      data: { tradeId, assetSymbol, profit, status },
      link: `/trades`,
    });
  }

  /**
   * Notify user of deposit completed
   */
  async notifyDepositCompleted(userId: string, depositId: string, amount: number, currency: string) {
    return this.createNotification({
      userId,
      type: NotificationType.DEPOSIT_COMPLETED,
      title: 'Deposit Completed',
      message: `Your deposit of ${amount} ${currency} has been completed and credited to your account`,
      data: { depositId, amount, currency },
      link: `/finance`,
    });
  }

  /**
   * Notify user of withdrawal approved
   */
  async notifyWithdrawalApproved(userId: string, withdrawalId: string, amount: number, currency: string) {
    return this.createNotification({
      userId,
      type: NotificationType.WITHDRAWAL_APPROVED,
      title: 'Withdrawal Approved',
      message: `Your withdrawal request for ${amount} ${currency} has been approved and is being processed`,
      data: { withdrawalId, amount, currency },
      link: `/finance`,
    });
  }

  /**
   * Notify user of withdrawal rejected
   */
  async notifyWithdrawalRejected(
    userId: string,
    withdrawalId: string,
    amount: number,
    currency: string,
    reason: string
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.WITHDRAWAL_REJECTED,
      title: 'Withdrawal Rejected',
      message: `Your withdrawal request for ${amount} ${currency} was rejected. Reason: ${reason}`,
      data: { withdrawalId, amount, currency, reason },
      link: `/finance`,
    });
  }

  /**
   * Notify user of copy trade executed
   */
  async notifyCopyTradeExecuted(
    userId: string,
    traderName: string,
    assetSymbol: string,
    direction: string,
    amount: number
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.COPY_TRADE_EXECUTED,
      title: 'Copy Trade Executed',
      message: `A ${direction} trade on ${assetSymbol} for $${amount.toFixed(2)} was copied from ${traderName}`,
      data: { traderName, assetSymbol, direction, amount },
      link: `/social-trading`,
    });
  }

  /**
   * Notify user of affiliate commission earned
   */
  async notifyAffiliateCommission(userId: string, commissionId: string, amount: number, referredUser: string) {
    return this.createNotification({
      userId,
      type: NotificationType.AFFILIATE_COMMISSION,
      title: 'Commission Earned',
      message: `You earned $${amount.toFixed(2)} commission from ${referredUser}'s activity`,
      data: { commissionId, amount, referredUser },
      link: `/affiliate`,
    });
  }

  /**
   * Notify user of system alert
   */
  async notifySystemAlert(userId: string, title: string, message: string, data?: any) {
    return this.createNotification({
      userId,
      type: NotificationType.SYSTEM_ALERT,
      title,
      message,
      data,
    });
  }

  /**
   * Notify user of security alert
   */
  async notifySecurityAlert(userId: string, title: string, message: string, data?: any) {
    return this.createNotification({
      userId,
      type: NotificationType.SECURITY_ALERT,
      title,
      message,
      data,
      link: `/settings`,
    });
  }

  /**
   * Notify user of KYC status change
   */
  async notifyKYCStatus(userId: string, status: 'APPROVED' | 'REJECTED', reason?: string) {
    return this.createNotification({
      userId,
      type: NotificationType.KYC_STATUS,
      title: `KYC ${status}`,
      message:
        status === 'APPROVED'
          ? 'Your KYC verification has been approved'
          : `Your KYC verification was rejected. ${reason || ''}`,
      data: { status, reason },
      link: `/profile`,
    });
  }

  /**
   * Clean up old archived notifications (for cron job)
   */
  async cleanupOldNotifications(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.notification.deleteMany({
      where: {
        status: NotificationStatus.ARCHIVED,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleaned up ${result.count} old archived notifications`);

    return result.count;
  }
}

export const notificationsService = new NotificationsService();
