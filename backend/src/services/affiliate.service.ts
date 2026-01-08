import prisma from '../utils/database';
import walletService from './wallet.service';
import logger from '../utils/logger';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errors';
import { AffiliateStatus, CommissionModel, CommissionStatus, TransactionType } from '@prisma/client';
import { Decimal } from 'decimal.js';

export class AffiliateService {
  /**
   * Apply for affiliate program
   */
  async applyAsAffiliate(userId: string, data?: {
    commissionModel?: CommissionModel;
  }) {
    // Check if already an affiliate
    const existing = await prisma.affiliate.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ConflictError('User is already an affiliate');
    }

    // Get default commission settings
    const revenueSharePercent = parseFloat(
      process.env.DEFAULT_REVENUE_SHARE_PERCENT || '30'
    );
    const cpaAmount = parseFloat(process.env.DEFAULT_CPA_AMOUNT || '100');

    const affiliate = await prisma.affiliate.create({
      data: {
        userId,
        status: AffiliateStatus.PENDING,
        commissionModel: data?.commissionModel || CommissionModel.REVENUE_SHARE,
        revenueSharePercent,
        cpaAmount,
      },
    });

    logger.info(`User ${userId} applied as affiliate`);

    return affiliate;
  }

  /**
   * Admin: Approve affiliate
   */
  async approveAffiliate(
    affiliateId: string,
    adminId: string,
    settings?: {
      commissionModel?: CommissionModel;
      revenueSharePercent?: number;
      cpaAmount?: number;
      tier?: number;
    }
  ) {
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: {
        status: AffiliateStatus.ACTIVE,
        approvedAt: new Date(),
        approvedBy: adminId,
        ...settings,
      },
    });

    logger.info(`Affiliate ${affiliateId} approved by admin ${adminId}`);

    return affiliate;
  }

  /**
   * Admin: Suspend affiliate
   */
  async suspendAffiliate(affiliateId: string, adminId: string) {
    const affiliate = await prisma.affiliate.update({
      where: { id: affiliateId },
      data: { status: AffiliateStatus.SUSPENDED },
    });

    logger.info(`Affiliate ${affiliateId} suspended by admin ${adminId}`);

    return affiliate;
  }

  /**
   * Get affiliate details
   */
  async getAffiliateDetails(userId: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            referralCode: true,
            email: true,
          },
        },
      },
    });

    if (!affiliate) {
      throw new NotFoundError('Affiliate not found');
    }

    return affiliate;
  }

  /**
   * Get affiliate statistics
   */
  async getAffiliateStats(userId: string) {
    const affiliate = await this.getAffiliateDetails(userId);

    // Get referred users
    const referredUsers = await prisma.user.findMany({
      where: { referredById: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        status: true,
      },
    });

    // Get commission breakdown
    const commissions = await prisma.commission.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Calculate monthly earnings
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyEarnings = await prisma.commission.aggregate({
      where: {
        affiliateId: affiliate.id,
        status: CommissionStatus.PAID,
        paidAt: { gte: currentMonth },
      },
      _sum: { amount: true },
    });

    return {
      affiliate,
      totalReferrals: referredUsers.length,
      activeReferrals: referredUsers.filter((u) => u.status === 'ACTIVE').length,
      recentReferrals: referredUsers.slice(0, 5),
      recentCommissions: commissions,
      monthlyEarnings: monthlyEarnings._sum.amount?.toNumber() || 0,
    };
  }

  /**
   * Calculate and create commission for a referral action
   */
  async createCommission(data: {
    affiliateId: string;
    referredUserId: string;
    type: CommissionModel;
    baseAmount: number;
    referenceId?: string;
    referenceType?: string;
    metadata?: any;
  }) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: data.affiliateId },
    });

    if (!affiliate) {
      throw new NotFoundError('Affiliate not found');
    }

    if (affiliate.status !== AffiliateStatus.ACTIVE) {
      throw new ValidationError('Affiliate is not active');
    }

    let amount: number;
    let percentage: number | undefined;

    // Calculate commission based on type
    if (data.type === CommissionModel.CPA) {
      amount = affiliate.cpaAmount.toNumber();
    } else if (data.type === CommissionModel.REVENUE_SHARE) {
      percentage = affiliate.revenueSharePercent.toNumber();
      amount = (data.baseAmount * percentage) / 100;
    } else {
      // HYBRID
      const cpaAmount = affiliate.cpaAmount.toNumber();
      const revSharePercent = affiliate.revenueSharePercent.toNumber();
      const revShareAmount = (data.baseAmount * revSharePercent) / 100;
      amount = cpaAmount + revShareAmount;
      percentage = revSharePercent;
    }

    // Create commission
    const commission = await prisma.commission.create({
      data: {
        affiliateId: data.affiliateId,
        referredUserId: data.referredUserId,
        type: data.type,
        amount,
        baseAmount: data.baseAmount,
        percentage,
        status: CommissionStatus.PENDING,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        metadata: data.metadata,
      },
    });

    // Update affiliate stats
    await prisma.affiliate.update({
      where: { id: data.affiliateId },
      data: {
        pendingCommission: { increment: amount },
      },
    });

    logger.info(
      `Commission created for affiliate ${data.affiliateId}: ${amount} (${data.type})`
    );

    return commission;
  }

  /**
   * Process commission when referred user makes first deposit (CPA)
   */
  async processFirstDepositCommission(userId: string, depositAmount: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referredById: true,
        referredBy: {
          select: {
            affiliateProfile: true,
          },
        },
      },
    });

    if (!user?.referredById || !user.referredBy?.affiliateProfile) {
      return; // User not referred by an affiliate
    }

    const affiliate = user.referredBy.affiliateProfile;

    // Check if CPA commission already paid
    const existingCpa = await prisma.commission.findFirst({
      where: {
        affiliateId: affiliate.id,
        referredUserId: userId,
        type: CommissionModel.CPA,
      },
    });

    if (existingCpa) {
      return; // CPA already processed
    }

    // Create CPA commission
    if (
      affiliate.commissionModel === CommissionModel.CPA ||
      affiliate.commissionModel === CommissionModel.HYBRID
    ) {
      await this.createCommission({
        affiliateId: affiliate.id,
        referredUserId: userId,
        type: CommissionModel.CPA,
        baseAmount: depositAmount,
        referenceType: 'FIRST_DEPOSIT',
        metadata: { depositAmount },
      });
    }
  }

  /**
   * Process revenue share commission from user's trading activity
   */
  async processRevenueShareCommission(
    userId: string,
    platformProfit: number,
    tradeId: string
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referredById: true,
        referredBy: {
          select: {
            affiliateProfile: true,
          },
        },
      },
    });

    if (!user?.referredById || !user.referredBy?.affiliateProfile) {
      return; // User not referred by an affiliate
    }

    const affiliate = user.referredBy.affiliateProfile;

    // Only create commission if platform made profit (user lost)
    if (platformProfit <= 0) {
      return;
    }

    // Create revenue share commission
    if (
      affiliate.commissionModel === CommissionModel.REVENUE_SHARE ||
      affiliate.commissionModel === CommissionModel.HYBRID
    ) {
      await this.createCommission({
        affiliateId: affiliate.id,
        referredUserId: userId,
        type: CommissionModel.REVENUE_SHARE,
        baseAmount: platformProfit,
        referenceId: tradeId,
        referenceType: 'TRADE',
        metadata: { tradeId, platformProfit },
      });
    }
  }

  /**
   * Admin: Approve commission for payment
   */
  async approveCommission(commissionId: string, adminId: string) {
    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: { status: CommissionStatus.APPROVED },
    });

    logger.info(`Commission ${commissionId} approved by admin ${adminId}`);

    return commission;
  }

  /**
   * Admin: Pay commission
   */
  async payCommission(
    commissionId: string,
    adminId: string,
    paymentMethod?: string,
    paymentRef?: string
  ) {
    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: {
        affiliate: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!commission) {
      throw new NotFoundError('Commission not found');
    }

    if (commission.status === CommissionStatus.PAID) {
      throw new ValidationError('Commission already paid');
    }

    await prisma.$transaction(async (tx) => {
      // Update commission status
      await tx.commission.update({
        where: { id: commissionId },
        data: {
          status: CommissionStatus.PAID,
          paidAt: new Date(),
          paymentMethod,
          paymentRef,
        },
      });

      // Update affiliate stats
      await tx.affiliate.update({
        where: { id: commission.affiliateId },
        data: {
          pendingCommission: { decrement: commission.amount.toNumber() },
          paidCommission: { increment: commission.amount.toNumber() },
          totalCommission: { increment: commission.amount.toNumber() },
        },
      });

      // Credit affiliate's wallet (optional - can pay externally)
      const affiliateWallet = await walletService.getWallet(
        commission.affiliate.userId,
        'REAL'
      );

      await walletService.creditWallet(
        commission.affiliate.userId,
        affiliateWallet.id,
        commission.amount.toNumber(),
        TransactionType.AFFILIATE_COMMISSION,
        `Affiliate commission payment`,
        undefined,
        { commissionId, paymentMethod, paymentRef }
      );

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: commission.affiliate.userId,
          action: 'ADMIN_ACTION',
          entity: 'Commission',
          entityId: commissionId,
          details: {
            action: 'COMMISSION_PAID',
            amount: commission.amount.toNumber(),
            adminId,
          },
        },
      });
    });

    logger.info(`Commission ${commissionId} paid by admin ${adminId}`);

    return commission;
  }

  /**
   * Get affiliate commissions
   */
  async getAffiliateCommissions(
    affiliateId: string,
    filters?: {
      status?: CommissionStatus;
      type?: CommissionModel;
      limit?: number;
      offset?: number;
    }
  ) {
    const { status, type, limit = 50, offset = 0 } = filters || {};

    const where: any = { affiliateId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.commission.count({ where }),
    ]);

    return {
      commissions,
      total,
      limit,
      offset,
    };
  }

  /**
   * Admin: Get all affiliates
   */
  async adminGetAffiliates(filters?: {
    status?: AffiliateStatus;
    minTotalCommission?: number;
    limit?: number;
    offset?: number;
  }) {
    const { status, minTotalCommission, limit = 50, offset = 0 } = filters || {};

    const where: any = {};
    if (status) where.status = status;
    if (minTotalCommission) {
      where.totalCommission = { gte: minTotalCommission };
    }

    const [affiliates, total] = await Promise.all([
      prisma.affiliate.findMany({
        where,
        orderBy: { totalCommission: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              referralCode: true,
            },
          },
        },
      }),
      prisma.affiliate.count({ where }),
    ]);

    return {
      affiliates,
      total,
      limit,
      offset,
    };
  }

  /**
   * Admin: Get pending commissions
   */
  async adminGetPendingCommissions(limit: number = 100) {
    return prisma.commission.findMany({
      where: { status: CommissionStatus.PENDING },
      orderBy: { createdAt: 'asc' },
      take: limit,
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        referralCode: true,
        referrals: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      referralCode: user.referralCode,
      totalReferrals: user.referrals.length,
      activeReferrals: user.referrals.filter((r) => r.status === 'ACTIVE').length,
      referrals: user.referrals,
    };
  }

  /**
   * Get performance analytics for affiliate
   */
  async getPerformanceAnalytics(affiliateId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get commissions over time
    const commissions = await prisma.commission.findMany({
      where: {
        affiliateId,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const dailyData: Record<string, { revenue: number; commissions: number; count: number }> = {};

    commissions.forEach((commission) => {
      const date = commission.createdAt.toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { revenue: 0, commissions: 0, count: 0 };
      }
      dailyData[date].revenue += commission.baseAmount?.toNumber() || 0;
      dailyData[date].commissions += commission.amount.toNumber();
      dailyData[date].count += 1;
    });

    // Get top performing referrals
    const topReferrals = await prisma.$queryRaw<any[]>`
      SELECT
        u.id,
        u.email,
        u."firstName",
        u."lastName",
        COUNT(DISTINCT t.id) as "tradeCount",
        SUM(CASE WHEN t.outcome = 'WIN' THEN 0 ELSE t.amount END) as "platformProfit",
        SUM(c.amount) as "totalCommissions"
      FROM "Commission" c
      JOIN "User" u ON c."referredUserId" = u.id
      LEFT JOIN "Trade" t ON t."userId" = u.id
      WHERE c."affiliateId" = ${affiliateId}
      GROUP BY u.id, u.email, u."firstName", u."lastName"
      ORDER BY "totalCommissions" DESC
      LIMIT 10
    `;

    // Get conversion funnel
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: affiliateId },
      include: {
        user: {
          select: {
            referrals: {
              select: {
                id: true,
                status: true,
                deposits: {
                  where: { status: 'COMPLETED' },
                  select: { amount: true },
                },
                trades: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    const referrals = affiliate?.user.referrals || [];
    const totalReferrals = referrals.length;
    const deposited = referrals.filter((r) => r.deposits.length > 0).length;
    const traded = referrals.filter((r) => r.trades.length > 0).length;

    return {
      dailyData: Object.entries(dailyData).map(([date, data]) => ({
        date,
        ...data,
      })),
      topReferrals,
      conversionFunnel: {
        totalReferrals,
        deposited,
        depositRate: totalReferrals > 0 ? (deposited / totalReferrals) * 100 : 0,
        traded,
        tradeRate: deposited > 0 ? (traded / deposited) * 100 : 0,
      },
    };
  }

  /**
   * Request payout
   */
  async requestPayout(data: {
    affiliateId: string;
    amount: number;
    method: string;
    destination: any;
  }) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: data.affiliateId },
      include: { plan: true },
    });

    if (!affiliate) {
      throw new NotFoundError('Affiliate not found');
    }

    // Check if enough balance
    if (new Decimal(affiliate.pendingCommission).lessThan(data.amount)) {
      throw new ValidationError('Insufficient pending commission balance');
    }

    // Check minimum payout threshold
    const threshold = affiliate.plan?.payoutThreshold || new Decimal(100);
    if (new Decimal(data.amount).lessThan(threshold)) {
      throw new ValidationError(`Minimum payout amount is ${threshold}`);
    }

    // Get commissions to include (APPROVED status)
    const commissions = await prisma.commission.findMany({
      where: {
        affiliateId: data.affiliateId,
        status: CommissionStatus.APPROVED,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate how many commissions fit in the payout amount
    let remaining = new Decimal(data.amount);
    const includedCommissions: string[] = [];

    for (const commission of commissions) {
      if (remaining.greaterThanOrEqualTo(commission.amount)) {
        includedCommissions.push(commission.id);
        remaining = remaining.sub(commission.amount);
      }
      if (remaining.isZero()) break;
    }

    const payout = await prisma.affiliatePayout.create({
      data: {
        affiliateId: data.affiliateId,
        amount: data.amount,
        method: data.method as any,
        destination: data.destination,
        commissionIds: includedCommissions,
      },
    });

    logger.info(`Payout requested: ${payout.id} for affiliate ${data.affiliateId} - Amount: ${data.amount}`);

    return payout;
  }

  /**
   * Get affiliate payouts
   */
  async getAffiliatePayouts(affiliateId: string, limit: number = 50) {
    return prisma.affiliatePayout.findMany({
      where: { affiliateId },
      orderBy: { requestedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Admin: Process payout
   */
  async processPayout(
    payoutId: string,
    adminId: string,
    data: {
      status: 'COMPLETED' | 'REJECTED';
      txHash?: string;
      paymentRef?: string;
      rejectionReason?: string;
    }
  ) {
    const payout = await prisma.affiliatePayout.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new NotFoundError('Payout not found');
    }

    if (payout.status !== 'PENDING' && payout.status !== 'PROCESSING') {
      throw new ValidationError('Payout is not pending');
    }

    await prisma.$transaction(async (tx) => {
      // Update payout status
      await tx.affiliatePayout.update({
        where: { id: payoutId },
        data: {
          status: data.status === 'COMPLETED' ? 'COMPLETED' : 'REJECTED',
          processedBy: adminId,
          processedAt: new Date(),
          completedAt: data.status === 'COMPLETED' ? new Date() : undefined,
          txHash: data.txHash,
          paymentRef: data.paymentRef,
          rejectionReason: data.rejectionReason,
        },
      });

      if (data.status === 'COMPLETED') {
        // Mark commissions as PAID
        await tx.commission.updateMany({
          where: {
            id: { in: payout.commissionIds },
          },
          data: {
            status: CommissionStatus.PAID,
            paidAt: new Date(),
            paymentMethod: payout.method,
            paymentRef: data.paymentRef,
          },
        });

        // Update affiliate stats
        await tx.affiliate.update({
          where: { id: payout.affiliateId },
          data: {
            pendingCommission: { decrement: payout.amount.toNumber() },
            paidCommission: { increment: payout.amount.toNumber() },
          },
        });
      }
    });

    logger.info(`Payout ${data.status} by admin ${adminId}: ${payoutId}`);

    return payout;
  }

  /**
   * Admin: Get pending payouts
   */
  async adminGetPendingPayouts(limit: number = 100) {
    return prisma.affiliatePayout.findMany({
      where: { status: 'PENDING' },
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
      take: limit,
    });
  }

  /**
   * Get active contests
   */
  async getActiveContests() {
    const now = new Date();

    return prisma.affiliateContest.findMany({
      where: {
        status: { in: ['UPCOMING', 'ACTIVE'] },
        endDate: { gte: now },
      },
      orderBy: [{ featured: 'desc' }, { startDate: 'asc' }],
    });
  }

  /**
   * Get contest leaderboard
   */
  async getContestLeaderboard(contestId: string) {
    const contest = await prisma.affiliateContest.findUnique({
      where: { id: contestId },
    });

    if (!contest) {
      throw new NotFoundError('Contest not found');
    }

    // Calculate leaderboard based on metricType
    let query = ``;

    if (contest.metricType === 'REVENUE') {
      query = `
        SELECT
          a.id as "affiliateId",
          u.email,
          u."firstName",
          u."lastName",
          SUM(c."baseAmount") as score
        FROM "Affiliate" a
        JOIN "User" u ON a."userId" = u.id
        JOIN "Commission" c ON c."affiliateId" = a.id
        WHERE c."createdAt" >= $1 AND c."createdAt" <= $2
          AND a.status = 'ACTIVE'
        GROUP BY a.id, u.email, u."firstName", u."lastName"
        ORDER BY score DESC
        LIMIT 100
      `;
    } else if (contest.metricType === 'COMMISSIONS') {
      query = `
        SELECT
          a.id as "affiliateId",
          u.email,
          u."firstName",
          u."lastName",
          SUM(c.amount) as score
        FROM "Affiliate" a
        JOIN "User" u ON a."userId" = u.id
        JOIN "Commission" c ON c."affiliateId" = a.id
        WHERE c."createdAt" >= $1 AND c."createdAt" <= $2
          AND a.status = 'ACTIVE'
        GROUP BY a.id, u.email, u."firstName", u."lastName"
        ORDER BY score DESC
        LIMIT 100
      `;
    } else {
      // REFERRALS
      query = `
        SELECT
          a.id as "affiliateId",
          u.email,
          u."firstName",
          u."lastName",
          COUNT(DISTINCT r.id) as score
        FROM "Affiliate" a
        JOIN "User" u ON a."userId" = u.id
        JOIN "User" r ON r."referredById" = u.id
        WHERE r."createdAt" >= $1 AND r."createdAt" <= $2
          AND a.status = 'ACTIVE'
        GROUP BY a.id, u.email, u."firstName", u."lastName"
        ORDER BY score DESC
        LIMIT 100
      `;
    }

    const leaderboard = await prisma.$queryRawUnsafe<any[]>(query, contest.startDate, contest.endDate);

    // Add ranks
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1,
      prize: contest.prizes ? (contest.prizes as any[])[index] : null,
    }));

    return {
      contest,
      leaderboard: rankedLeaderboard,
    };
  }

  /**
   * Admin: Get all affiliate plans
   */
  async adminGetPlans() {
    return prisma.affiliatePlan.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { affiliates: true },
        },
      },
    });
  }

  /**
   * Admin: Create affiliate plan
   */
  async adminCreatePlan(data: any) {
    const plan = await prisma.affiliatePlan.create({
      data,
    });

    logger.info(`Affiliate plan created: ${plan.id} - ${plan.name}`);

    return plan;
  }

  /**
   * Admin: Update affiliate plan
   */
  async adminUpdatePlan(planId: string, data: any) {
    const plan = await prisma.affiliatePlan.update({
      where: { id: planId },
      data,
    });

    logger.info(`Affiliate plan updated: ${planId}`);

    return plan;
  }

  /**
   * Admin: Delete affiliate plan
   */
  async adminDeletePlan(planId: string) {
    // Check if any affiliates are using this plan
    const count = await prisma.affiliate.count({
      where: { planId },
    });

    if (count > 0) {
      throw new ValidationError(`Cannot delete plan with ${count} active affiliates`);
    }

    await prisma.affiliatePlan.delete({
      where: { id: planId },
    });

    logger.info(`Affiliate plan deleted: ${planId}`);

    return { success: true };
  }

  /**
   * Admin: Create contest
   */
  async adminCreateContest(data: any) {
    const contest = await prisma.affiliateContest.create({
      data,
    });

    logger.info(`Affiliate contest created: ${contest.id} - ${contest.name}`);

    return contest;
  }

  /**
   * Admin: Update contest
   */
  async adminUpdateContest(contestId: string, data: any) {
    const contest = await prisma.affiliateContest.update({
      where: { id: contestId },
      data,
    });

    logger.info(`Affiliate contest updated: ${contestId}`);

    return contest;
  }

  /**
   * Admin: Get all contests
   */
  async adminGetContests() {
    return prisma.affiliateContest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}

export default new AffiliateService();
