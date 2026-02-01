import prisma from '../utils/database';
import logger from '../utils/logger';
import { hashPassword, verifyPassword } from '../utils/crypto';
import { NotFoundError, ValidationError, AuthorizationError } from '../utils/errors';
import { KYCStatus } from '@prisma/client';

/**
 * Profile Service
 * Handles user profile management, KYC, security settings, and activity logs
 */

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  city?: string;
  address?: string;
  dateOfBirth?: string;
  profilePicture?: string;
}

interface UploadKYCInput {
  documentType: string; // 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID'
  documentNumber: string;
  frontImage: string; // URL to uploaded image
  backImage?: string; // URL to uploaded image
  selfieImage?: string; // URL to selfie for verification
}

interface VerifyKYCInput {
  userId: string;
  adminId: string;
  status: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  notes?: string;
}

interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

class ProfileService {
  /**
   * Get user profile with additional information
   */
  async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        // city: true, // TODO: Add city field to User model in Prisma schema
        // address: true, // TODO: Add address field to User model
        dateOfBirth: true,
        // profilePicture: true, // TODO: Add profilePicture field to User model
        role: true,
        status: true,
        emailVerified: true,
        kycStatus: true,
        kycDocuments: true,
        // kycVerifiedAt: true, // TODO: Add kycVerifiedAt field to User model
        // kycRejectionReason: true, // TODO: Add kycRejectionReason field to User model
        twoFactorEnabled: true,
        referralCode: true,
        referredById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get wallet balances
    const wallets = await prisma.wallet.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        balance: true,
        currency: true,
      },
    });

    // Get referral count
    const referralCount = await prisma.user.count({
      where: { referredById: userId },
    });

    // Check if affiliate
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        tier: true,
        totalCommission: true,
      },
    });

    return {
      ...user,
      wallets,
      referralCount,
      affiliate,
    };
  }

  /**
   * Update user profile information
   */
  async updateProfile(userId: string, data: UpdateProfileInput) {
    // Validate date of birth if provided
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      if (isNaN(dob.getTime())) {
        throw new ValidationError('Invalid date of birth');
      }

      // Check if user is at least 18 years old
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 18) {
        throw new ValidationError('You must be at least 18 years old');
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        country: true,
        // city: true, // TODO: Add city field to User model in Prisma schema
        // address: true, // TODO: Add address field to User model
        dateOfBirth: true,
        // profilePicture: true, // TODO: Add profilePicture field to User model
      },
    });

    logger.info(`Profile updated for user ${userId}`);

    return user;
  }

  /**
   * Upload KYC documents
   */
  async uploadKYC(userId: string, data: UploadKYCInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.kycStatus === KYCStatus.APPROVED) {
      throw new ValidationError('KYC already approved');
    }

    if (user.kycStatus === 'PENDING') {
      throw new ValidationError('KYC documents already submitted and pending review');
    }

    const kycDocuments = {
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      frontImage: data.frontImage,
      backImage: data.backImage,
      selfieImage: data.selfieImage,
      submittedAt: new Date().toISOString(),
    };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus: 'PENDING',
        kycDocuments,
      },
      select: {
        id: true,
        kycStatus: true,
        kycDocuments: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_ACTION',
        entity: 'User',
        entityId: userId,
        details: {
          action: 'KYC_SUBMITTED',
          documentType: data.documentType,
        },
      },
    });

    logger.info(`KYC documents uploaded for user ${userId}`);

    return updated;
  }

  /**
   * Admin: Verify or reject KYC
   */
  async verifyKYC(data: VerifyKYCInput) {
    const { userId, adminId, status, rejectionReason, notes } = data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.kycStatus !== 'PENDING') {
      throw new ValidationError('KYC is not pending verification');
    }

    const updateData: any = {
      kycStatus: status,
    };

    if (status === 'VERIFIED') {
      updateData.kycVerifiedAt = new Date();
      updateData.kycRejectionReason = null;
    } else {
      updateData.kycRejectionReason = rejectionReason;
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'ADMIN_ACTION',
        entity: 'User',
        entityId: userId,
        details: {
          action: status === 'VERIFIED' ? 'KYC_VERIFIED' : 'KYC_REJECTED',
          adminId,
          rejectionReason,
          notes,
        },
      },
    });

    logger.info(`KYC ${status} for user ${userId} by admin ${adminId}`);

    return updated;
  }

  /**
   * Get pending KYC submissions (Admin)
   */
  async getPendingKYC(limit: number = 50) {
    return await prisma.user.findMany({
      where: { kycStatus: 'PENDING' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kycStatus: true,
        kycDocuments: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordInput) {
    const { userId, currentPassword, newPassword } = data;

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, email: true },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthorizationError('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all sessions except current one (optional - for security)
    // await prisma.session.deleteMany({
    //   where: { userId, id: { not: currentSessionId } },
    // });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGE',
        entity: 'User',
        entityId: userId,
        details: {
          action: 'PASSWORD_CHANGED',
        },
      },
    });

    logger.info(`Password changed for user ${userId}`);

    return { success: true };
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string) {
    return await prisma.session.findMany({
      where: { userId },
      select: {
        id: true,
        // userAgent: true, // TODO: Add userAgent field to Session model in Prisma schema
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Revoke session
   */
  async revokeSession(userId: string, sessionId: string) {
    // Verify session belongs to user
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundError('Session not found');
    }

    await prisma.session.delete({
      where: { id: sessionId },
    });

    logger.info(`Session ${sessionId} revoked for user ${userId}`);

    return { success: true };
  }

  /**
   * Revoke all sessions except current
   */
  async revokeAllSessions(userId: string, currentSessionId?: string) {
    const where: any = { userId };

    if (currentSessionId) {
      where.id = { not: currentSessionId };
    }

    const result = await prisma.session.deleteMany({
      where,
    });

    logger.info(`${result.count} sessions revoked for user ${userId}`);

    return { success: true, count: result.count };
  }

  /**
   * Get user activity logs
   */
  async getActivityLogs(userId: string, limit: number = 100) {
    return await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }, // Changed from timestamp to createdAt
      take: limit,
    });
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(userId: string, preferences: any) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        metadata: {
          notificationPreferences: preferences,
        },
      },
    });

    logger.info(`Notification preferences updated for user ${userId}`);

    return user;
  }

  /**
   * Admin: Get user profile by ID
   */
  async adminGetUserProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        wallets: true,
        trades: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        deposits: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        withdrawals: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        affiliateProfile: true,
        sessions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get referrals
    const referrals = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      ...user,
      referrals,
    };
  }

  /**
   * Admin: Update user status
   */
  async adminUpdateUserStatus(userId: string, status: string, adminId: string, reason?: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { status: status as any },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : status === 'BANNED' ? 'USER_BANNED' : 'ADMIN_ACTION',
        entity: 'User',
        entityId: userId,
        details: {
          action: 'STATUS_CHANGED',
          newStatus: status,
          adminId,
          reason,
        },
      },
    });

    logger.info(`User ${userId} status changed to ${status} by admin ${adminId}`);

    return user;
  }

  /**
   * Admin: Adjust user balance
   */
  async adminAdjustBalance(
    userId: string,
    walletType: string,
    amount: number,
    adminId: string,
    reason: string
  ) {
    const wallet = await prisma.wallet.findFirst({
      where: {
        userId,
        type: walletType as any,
      },
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    const newBalance = parseFloat(wallet.balance.toString()) + amount;

    if (newBalance < 0) {
      throw new ValidationError('Insufficient balance');
    }

    const updated = await prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        userId,
        type: amount > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
        status: 'COMPLETED',
        amount: Math.abs(amount),
        balanceBefore: wallet.balance,
        balanceAfter: newBalance,
        currency: wallet.currency,
        description: `Admin adjustment: ${reason}`,
        metadata: {
          adjustedBy: adminId,
          reason,
        },
        processedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'BALANCE_ADJUSTMENT',
        entity: 'Wallet',
        entityId: wallet.id,
        details: {
          action: 'BALANCE_ADJUSTED',
          walletType,
          amount,
          adminId,
          reason,
          balanceBefore: wallet.balance.toString(),
          balanceAfter: newBalance.toString(),
        },
      },
    });

    logger.info(`Balance adjusted for user ${userId}: ${amount} by admin ${adminId}`);

    return updated;
  }
}

export default new ProfileService();
