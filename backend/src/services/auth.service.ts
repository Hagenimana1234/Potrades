import prisma from '../utils/database';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  
  generateReferralCode,
} from '../utils/crypto';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { add } from 'date-fns';
import logger from '../utils/logger';

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    referralCode?: string;
  }) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Validate referral code if provided
    let referredBy = null;
    if (data.referralCode) {
      referredBy = await prisma.user.findUnique({
        where: { referralCode: data.referralCode },
      });

      if (!referredBy) {
        throw new ValidationError('Invalid referral code');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Generate unique referral code
    let referralCode = generateReferralCode();
    let codeExists = await prisma.user.findUnique({
      where: { referralCode },
    });

    while (codeExists) {
      referralCode = generateReferralCode();
      codeExists = await prisma.user.findUnique({
        where: { referralCode },
      });
    }

    // Create user with wallets in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          referralCode,
          referredById: referredBy?.id,
        },
      });

      // Create demo wallet with initial balance
      await tx.wallet.create({
        data: {
          userId: newUser.id,
          type: 'DEMO',
          balance: process.env.DEMO_INITIAL_BALANCE || 10000,
          currency: 'USD',
        },
      });

      // Create real wallet
      await tx.wallet.create({
        data: {
          userId: newUser.id,
          type: 'REAL',
          balance: 0,
          currency: 'USD',
        },
      });

      return newUser;
    });

    logger.info(`User registered: ${user.id} (${user.email})`);

    return {
      id: user.id,
      email: user.email,
      referralCode: user.referralCode,
    };
  }

  async login(
    email: string,
    password: string,
    twoFactorCode?: string,
    ipAddress?: string,
    deviceInfo?: any
  ) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check user status
    if (user.status !== 'ACTIVE') {
      throw new AuthenticationError(`Account is ${user.status.toLowerCase()}`);
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!twoFactorCode) {
        throw new AuthenticationError('Two-factor code required');
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2,
      });

      if (!verified) {
        throw new AuthenticationError('Invalid two-factor code');
      }
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      id: user.id, // Include id for backward compatibility
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      id: user.id, // Include id for backward compatibility
      email: user.email,
      role: user.role,
    });

    // Create session
    const expiresAt = add(new Date(), { days: 7 });
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    });

    logger.info(`User logged in: ${user.id} (${user.email})`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      verifyRefreshToken(refreshToken);

      // Check if session exists
      const session = await prisma.session.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session) {
        throw new AuthenticationError('Invalid refresh token');
      }

      if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } });
        throw new AuthenticationError('Refresh token expired');
      }

      if (session.user.status !== 'ACTIVE') {
        throw new AuthenticationError('Account is not active');
      }

      // Update session last used
      await prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: new Date() },
      });

      // Generate new access token
      const accessToken = generateAccessToken({
        userId: session.user.id,
        id: session.user.id, // Include id for backward compatibility
        email: session.user.email,
        role: session.user.role,
      });

      return { accessToken };
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    await prisma.session.deleteMany({
      where: { refreshToken },
    });

    logger.info('User logged out');
  }

  async logoutAll(userId: string) {
    await prisma.session.deleteMany({
      where: { userId },
    });

    logger.info(`All sessions logged out for user: ${userId}`);
  }

  async getUserSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const passwordValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Logout all sessions except current
    await prisma.session.deleteMany({
      where: { userId },
    });

    logger.info(`Password changed for user: ${userId}`);
  }

  async setup2FA(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new ValidationError('Two-factor authentication already enabled');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `PoTrades (${user.email})`,
      length: 32,
    });

    // Store secret (not yet enabled)
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret.base32 },
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode,
    };
  }

  async enable2FA(userId: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new NotFoundError('2FA setup not found');
    }

    if (user.twoFactorEnabled) {
      throw new ValidationError('Two-factor authentication already enabled');
    }

    // Verify code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new AuthenticationError('Invalid verification code');
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    logger.info(`2FA enabled for user: ${userId}`);

    return { success: true };
  }

  async disable2FA(userId: string, code: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.twoFactorSecret) {
      throw new NotFoundError('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new ValidationError('Two-factor authentication not enabled');
    }

    // Verify code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      throw new AuthenticationError('Invalid verification code');
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    logger.info(`2FA disabled for user: ${userId}`);

    return { success: true };
  }
}

export default new AuthService();
