import prisma from '../utils/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../utils/logger';

export interface UserSettings {
  // App Preferences
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;

  // Notifications
  emailNotifications?: {
    tradeAlerts?: boolean;
    depositWithdrawal?: boolean;
    marketing?: boolean;
    security?: boolean;
  };
  pushNotifications?: {
    tradeAlerts?: boolean;
    priceAlerts?: boolean;
  };

  // Trading Defaults
  tradingDefaults?: {
    defaultWalletType?: 'DEMO' | 'REAL';
    defaultTradeAmount?: number;
    defaultExpirySeconds?: number;
    confirmBeforeTrade?: boolean;
  };

  // Currency Display
  currencyDisplay?: {
    baseCurrency?: string;
    showCents?: boolean;
    thousandsSeparator?: ',' | '.' | ' ';
    decimalSeparator?: '.' | ',';
  };

  // Display Preferences
  displayPreferences?: {
    compactView?: boolean;
    showBalances?: boolean;
    chartType?: 'candlestick' | 'line' | 'area';
  };
}

class SettingsService {
  /**
   * Get user settings
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Extract settings from metadata, or return defaults
    const settings = (user.metadata as any)?.settings || {};

    return {
      theme: settings.theme || 'dark',
      language: settings.language || 'en',
      timezone: settings.timezone || 'UTC',
      emailNotifications: {
        tradeAlerts: settings.emailNotifications?.tradeAlerts ?? true,
        depositWithdrawal: settings.emailNotifications?.depositWithdrawal ?? true,
        marketing: settings.emailNotifications?.marketing ?? false,
        security: settings.emailNotifications?.security ?? true,
      },
      pushNotifications: {
        tradeAlerts: settings.pushNotifications?.tradeAlerts ?? true,
        priceAlerts: settings.pushNotifications?.priceAlerts ?? false,
      },
      tradingDefaults: {
        defaultWalletType: settings.tradingDefaults?.defaultWalletType || 'DEMO',
        defaultTradeAmount: settings.tradingDefaults?.defaultTradeAmount || 10,
        defaultExpirySeconds: settings.tradingDefaults?.defaultExpirySeconds || 60,
        confirmBeforeTrade: settings.tradingDefaults?.confirmBeforeTrade ?? true,
      },
      currencyDisplay: {
        baseCurrency: settings.currencyDisplay?.baseCurrency || 'USD',
        showCents: settings.currencyDisplay?.showCents ?? true,
        thousandsSeparator: settings.currencyDisplay?.thousandsSeparator || ',',
        decimalSeparator: settings.currencyDisplay?.decimalSeparator || '.',
      },
      displayPreferences: {
        compactView: settings.displayPreferences?.compactView ?? false,
        showBalances: settings.displayPreferences?.showBalances ?? true,
        chartType: settings.displayPreferences?.chartType || 'candlestick',
      },
    };
  }

  /**
   * Update user settings
   */
  async updateUserSettings(userId: string, newSettings: Partial<UserSettings>) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get current metadata
    const currentMetadata = (user.metadata as any) || {};
    const currentSettings = currentMetadata.settings || {};

    // Deep merge new settings with existing
    const updatedSettings = {
      ...currentSettings,
      theme: newSettings.theme !== undefined ? newSettings.theme : currentSettings.theme,
      language: newSettings.language !== undefined ? newSettings.language : currentSettings.language,
      timezone: newSettings.timezone !== undefined ? newSettings.timezone : currentSettings.timezone,
      emailNotifications: {
        ...currentSettings.emailNotifications,
        ...newSettings.emailNotifications,
      },
      pushNotifications: {
        ...currentSettings.pushNotifications,
        ...newSettings.pushNotifications,
      },
      tradingDefaults: {
        ...currentSettings.tradingDefaults,
        ...newSettings.tradingDefaults,
      },
      currencyDisplay: {
        ...currentSettings.currencyDisplay,
        ...newSettings.currencyDisplay,
      },
      displayPreferences: {
        ...currentSettings.displayPreferences,
        ...newSettings.displayPreferences,
      },
    };

    // Update user metadata
    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          ...currentMetadata,
          settings: updatedSettings,
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SETTINGS_CHANGED',
        entity: 'User',
        entityId: userId,
        details: {
          updatedFields: Object.keys(newSettings),
        },
      },
    });

    logger.info(`Settings updated for user ${userId}`);

    return updatedSettings;
  }

  /**
   * Reset settings to defaults
   */
  async resetUserSettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { metadata: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const currentMetadata = (user.metadata as any) || {};

    // Remove settings from metadata
    delete currentMetadata.settings;

    await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: currentMetadata,
      },
    });

    logger.info(`Settings reset to defaults for user ${userId}`);

    // Return defaults
    return await this.getUserSettings(userId);
  }

  /**
   * Get user security settings
   */
  async getSecuritySettings(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get active sessions count
    const activeSessions = await prisma.session.count({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: {
        userId,
        action: {
          in: ['USER_LOGIN', 'PASSWORD_CHANGE', 'USER_LOGOUT'],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        action: true,
        ipAddress: true,
        createdAt: true,
        details: true,
      },
    });

    return {
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      activeSessions,
      recentActivity,
    };
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userId: string) {
    const settings = await this.getUserSettings(userId);

    return {
      email: settings.emailNotifications,
      push: settings.pushNotifications,
    };
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: {
    email?: Partial<UserSettings['emailNotifications']>;
    push?: Partial<UserSettings['pushNotifications']>;
  }) {
    const updates: Partial<UserSettings> = {};

    if (preferences.email) {
      updates.emailNotifications = preferences.email;
    }

    if (preferences.push) {
      updates.pushNotifications = preferences.push;
    }

    await this.updateUserSettings(userId, updates);

    logger.info(`Notification preferences updated for user ${userId}`);

    return await this.getNotificationPreferences(userId);
  }
}

export default new SettingsService();
