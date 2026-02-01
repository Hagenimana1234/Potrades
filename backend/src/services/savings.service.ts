import { PrismaClient, Prisma } from '@prisma/client';

import { NotFoundError, ValidationError, AuthorizationError } from '../utils/errors';
import walletService from './wallet.service';

const prisma = new PrismaClient();

interface CreateSavingsInput {
  userId: string;
  planId: string;
  amount: number;
}

interface WithdrawSavingsInput {
  userId: string;
  depositId: string;
}

class SavingsService {
  /**
   * Get all active savings plans
   */
  async getSavingsPlans() {
    const plans = await prisma.savingsPlan.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: {
          select: {
            deposits: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { annualRate: 'desc' }],
    });

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      type: plan.type,
      annualRate: plan.annualRate,
      compoundFrequency: plan.compoundFrequency,
      minAmount: plan.minAmount,
      maxAmount: plan.maxAmount,
      lockDays: plan.lockDays,
      earlyWithdrawalFee: plan.earlyWithdrawalFee,
      description: plan.description,
      icon: plan.icon,
      activeDeposits: plan._count.deposits,
    }));
  }

  /**
   * Get user's savings deposits
   */
  async getUserSavings(userId: string) {
    const deposits = await prisma.savingsDeposit.findMany({
      where: { userId },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate current interest for each deposit
    const depositsWithInterest = await Promise.all(
      deposits.map(async (deposit) => {
        const currentInterest = await this.calculateCurrentInterest(deposit);
        const totalValue = Number(deposit.principal) + currentInterest;

        // Calculate days remaining for fixed plans
        let daysRemaining = null;
        let isMatured = false;
        if (deposit.plan.type === 'FIXED' && deposit.lockedUntil) {
          const now = new Date();
          const lockDate = new Date(deposit.lockedUntil);
          daysRemaining = Math.max(0, Math.ceil((lockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          isMatured = daysRemaining === 0;
        }

        return {
          id: deposit.id,
          planId: deposit.planId,
          planName: deposit.plan.name,
          planType: deposit.plan.type,
          status: deposit.status,
          principal: deposit.principal,
          accruedInterest: deposit.accruedInterest,
          currentInterest,
          totalValue,
          interestRate: deposit.interestRate,
          lockDays: deposit.plan.lockDays,
          lockedUntil: deposit.lockedUntil,
          daysRemaining,
          isMatured,
          earlyWithdrawalFee: deposit.plan.earlyWithdrawalFee,
          createdAt: deposit.createdAt,
          withdrawnAt: deposit.withdrawnAt,
          earlyWithdrawal: deposit.earlyWithdrawal,
          penaltyAmount: deposit.penaltyAmount,
        };
      })
    );

    return depositsWithInterest;
  }

  /**
   * Create a new savings deposit
   */
  async createSavingsDeposit(data: CreateSavingsInput) {
    const { userId, planId, amount } = data;

    // Get the savings plan
    const plan = await prisma.savingsPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.status !== 'ACTIVE') {
      throw new NotFoundError('Savings plan not found or inactive');
    }

    // Validate amount
    if (amount < Number(plan.minAmount)) {
      throw new ValidationError(`Minimum deposit amount is ${plan.minAmount}`);
    }

    if (plan.maxAmount && amount > Number(plan.maxAmount)) {
      throw new ValidationError(`Maximum deposit amount is ${plan.maxAmount}`);
    }

    // Calculate lock date for fixed plans
    let lockedUntil: Date | null = null;
    if (plan.type === 'FIXED' && plan.lockDays) {
      lockedUntil = new Date();
      lockedUntil.setDate(lockedUntil.getDate() + plan.lockDays);
    }

    // Create the deposit within a transaction
    const deposit = await prisma.$transaction(async (tx) => {
      // Deduct from user's wallet (wallet service handles transaction creation)
      const wallet = await walletService.getWallet(userId, 'REAL');
      await walletService.debitWallet(
        userId,
        wallet.id,
        amount,
        'WITHDRAWAL',
        'Savings deposit',
        undefined,
        { planId, planName: plan.name }
      );

      // Create savings deposit
      const newDeposit = await tx.savingsDeposit.create({
        data: {
          userId,
          planId,
          principal: amount,
          accruedInterest: 0,
          totalValue: amount,
          interestRate: plan.annualRate,
          lockedUntil,
          lastInterestCalc: new Date(),
        },
        include: {
          plan: true,
        },
      });

      return newDeposit;
    });

    return {
      id: deposit.id,
      planName: deposit.plan.name,
      principal: deposit.principal,
      interestRate: deposit.interestRate,
      lockedUntil: deposit.lockedUntil,
      createdAt: deposit.createdAt,
    };
  }

  /**
   * Withdraw from savings
   */
  async withdrawSavings(data: WithdrawSavingsInput) {
    const { userId, depositId } = data;

    // Get the deposit
    const deposit = await prisma.savingsDeposit.findUnique({
      where: { id: depositId },
      include: { plan: true },
    });

    if (!deposit) {
      throw new NotFoundError('Savings deposit not found');
    }

    if (deposit.userId !== userId) {
      throw new AuthorizationError('Unauthorized access to savings deposit');
    }

    if (deposit.status !== 'ACTIVE') {
      throw new ValidationError('Savings deposit is not active');
    }

    // Calculate current interest
    const currentInterest = await this.calculateCurrentInterest(deposit);
    const totalValue = Number(deposit.principal) + currentInterest;

    // Check if early withdrawal
    let isEarlyWithdrawal = false;
    let penaltyAmount = 0;
    let withdrawalAmount = totalValue;

    if (deposit.plan.type === 'FIXED' && deposit.lockedUntil) {
      const now = new Date();
      const lockDate = new Date(deposit.lockedUntil);

      if (now < lockDate) {
        // Early withdrawal
        isEarlyWithdrawal = true;

        if (deposit.plan.earlyWithdrawalFee) {
          // Apply penalty on principal
          penaltyAmount = (Number(deposit.principal) * Number(deposit.plan.earlyWithdrawalFee)) / 100;
          withdrawalAmount = totalValue - penaltyAmount;
        }
      }
    }

    // Process withdrawal in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update deposit status
      await tx.savingsDeposit.update({
        where: { id: depositId },
        data: {
          status: 'WITHDRAWN',
          accruedInterest: currentInterest,
          totalValue,
          withdrawnAt: new Date(),
          earlyWithdrawal: isEarlyWithdrawal,
          penaltyAmount: penaltyAmount > 0 ? penaltyAmount : null,
        },
      });

      // Add to user's wallet (wallet service handles transaction creation)
      const wallet = await walletService.getWallet(userId, 'REAL');
      await walletService.creditWallet(
        userId,
        wallet.id,
        withdrawalAmount,
        'DEPOSIT',
        'Savings withdrawal',
        undefined,
        {
          savingsDepositId: depositId,
          principal: Number(deposit.principal),
          interest: currentInterest,
          totalValue,
          earlyWithdrawal: isEarlyWithdrawal,
          penaltyAmount,
        }
      );

      return {
        withdrawalAmount,
        principal: Number(deposit.principal),
        interest: currentInterest,
        penalty: penaltyAmount,
        earlyWithdrawal: isEarlyWithdrawal,
      };
    });

    return result;
  }

  /**
   * Calculate current interest for a deposit
   */
  private async calculateCurrentInterest(deposit: any): Promise<number> {
    const principal = Number(deposit.principal);
    const rate = Number(deposit.interestRate) / 100; // Annual rate as decimal
    const startDate = deposit.lastInterestCalc || deposit.createdAt;
    const now = new Date();

    // Calculate days elapsed
    const daysElapsed = Math.floor((now.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));

    if (daysElapsed === 0) {
      return Number(deposit.accruedInterest);
    }

    // Calculate interest based on compound frequency
    let interest = 0;

    switch (deposit.plan?.compoundFrequency || 'DAILY') {
      case 'DAILY':
        // Daily compound: A = P(1 + r/365)^days
        interest = principal * Math.pow(1 + rate / 365, daysElapsed) - principal;
        break;

      case 'WEEKLY':
        const weeks = daysElapsed / 7;
        interest = principal * Math.pow(1 + rate / 52, weeks) - principal;
        break;

      case 'MONTHLY':
        const months = daysElapsed / 30;
        interest = principal * Math.pow(1 + rate / 12, months) - principal;
        break;

      default:
        // Default to daily
        interest = principal * Math.pow(1 + rate / 365, daysElapsed) - principal;
    }

    // Add previously accrued interest
    const totalInterest = Number(deposit.accruedInterest) + interest;

    return Math.max(0, totalInterest);
  }

  /**
   * Get savings analytics for user
   */
  async getSavingsAnalytics(userId: string) {
    const deposits = await prisma.savingsDeposit.findMany({
      where: { userId },
      include: { plan: true },
    });

    // Active deposits
    const activeDeposits = deposits.filter((d) => d.status === 'ACTIVE');

    // Calculate total principal
    const totalPrincipal = activeDeposits.reduce((sum, d) => sum + Number(d.principal), 0);

    // Calculate total current value
    let totalCurrentValue = 0;
    for (const deposit of activeDeposits) {
      const currentInterest = await this.calculateCurrentInterest(deposit);
      totalCurrentValue += Number(deposit.principal) + currentInterest;
    }

    // Calculate total interest earned (all time)
    const totalInterestEarned = deposits.reduce((sum, d) => sum + Number(d.accruedInterest), 0);

    // Calculate total withdrawn
    const totalWithdrawn = deposits
      .filter((d) => d.status === 'WITHDRAWN')
      .reduce((sum, d) => sum + Number(d.totalValue), 0);

    // Group by plan type
    const byPlanType: Record<string, { count: number; totalValue: number }> = {};
    for (const deposit of activeDeposits) {
      const type = deposit.plan.type;
      if (!byPlanType[type]) {
        byPlanType[type] = { count: 0, totalValue: 0 };
      }
      const currentInterest = await this.calculateCurrentInterest(deposit);
      byPlanType[type].count++;
      byPlanType[type].totalValue += Number(deposit.principal) + currentInterest;
    }

    // Upcoming maturities (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingMaturities = activeDeposits.filter(
      (d) =>
        d.plan.type === 'FIXED' &&
        d.lockedUntil &&
        new Date(d.lockedUntil) <= thirtyDaysFromNow &&
        new Date(d.lockedUntil) > new Date()
    );

    // Calculate average APY
    const averageAPY =
      activeDeposits.length > 0
        ? activeDeposits.reduce((sum, d) => sum + Number(d.interestRate), 0) / activeDeposits.length
        : 0;

    return {
      totalPrincipal,
      totalCurrentValue,
      totalInterestEarned,
      totalProfit: totalCurrentValue - totalPrincipal,
      totalWithdrawn,
      activeDepositsCount: activeDeposits.length,
      averageAPY,
      byPlanType,
      upcomingMaturities: upcomingMaturities.map((d) => ({
        id: d.id,
        planName: d.plan.name,
        principal: d.principal,
        maturityDate: d.lockedUntil,
      })),
    };
  }

  /**
   * Estimate returns for a plan
   */
  async estimateReturns(planId: string, amount: number, days: number = 365) {
    const plan = await prisma.savingsPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundError('Savings plan not found');
    }

    const rate = Number(plan.annualRate) / 100;
    let estimatedValue = 0;

    // For fixed plans, use the lock period
    const periodDays = plan.type === 'FIXED' && plan.lockDays ? plan.lockDays : days;

    switch (plan.compoundFrequency) {
      case 'DAILY':
        estimatedValue = amount * Math.pow(1 + rate / 365, periodDays);
        break;

      case 'WEEKLY':
        const weeks = periodDays / 7;
        estimatedValue = amount * Math.pow(1 + rate / 52, weeks);
        break;

      case 'MONTHLY':
        const months = periodDays / 30;
        estimatedValue = amount * Math.pow(1 + rate / 12, months);
        break;

      default:
        estimatedValue = amount * Math.pow(1 + rate / 365, periodDays);
    }

    const estimatedInterest = estimatedValue - amount;

    return {
      principal: amount,
      estimatedValue,
      estimatedInterest,
      days: periodDays,
      annualRate: plan.annualRate,
    };
  }

  /**
   * Admin: Get all savings deposits
   */
  async adminGetAllSavings(filters: { status?: string; limit?: number; offset?: number } = {}) {
    const { status, limit = 50, offset = 0 } = filters;

    const where: Prisma.SavingsDepositWhereInput = {};
    if (status) {
      where.status = status as any;
    }

    const [deposits, total] = await Promise.all([
      prisma.savingsDeposit.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.savingsDeposit.count({ where }),
    ]);

    return {
      deposits,
      total,
      limit,
      offset,
    };
  }

  /**
   * Admin: Create/Update savings plan
   */
  async adminCreatePlan(data: any) {
    const plan = await prisma.savingsPlan.create({
      data: {
        name: data.name,
        type: data.type,
        status: data.status || 'ACTIVE',
        annualRate: data.annualRate,
        compoundFrequency: data.compoundFrequency || 'DAILY',
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        lockDays: data.lockDays,
        earlyWithdrawalFee: data.earlyWithdrawalFee,
        description: data.description,
        icon: data.icon,
        order: data.order || 0,
      },
    });

    return plan;
  }

  async adminUpdatePlan(planId: string, data: any) {
    const plan = await prisma.savingsPlan.update({
      where: { id: planId },
      data: {
        name: data.name,
        type: data.type,
        status: data.status,
        annualRate: data.annualRate,
        compoundFrequency: data.compoundFrequency,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        lockDays: data.lockDays,
        earlyWithdrawalFee: data.earlyWithdrawalFee,
        description: data.description,
        icon: data.icon,
        order: data.order,
      },
    });

    return plan;
  }

  async adminDeletePlan(planId: string) {
    // Check if plan has active deposits
    const activeCount = await prisma.savingsDeposit.count({
      where: {
        planId,
        status: 'ACTIVE',
      },
    });

    if (activeCount > 0) {
      throw new ValidationError(`Cannot delete plan with ${activeCount} active deposits`);
    }

    await prisma.savingsPlan.delete({
      where: { id: planId },
    });

    return { message: 'Savings plan deleted successfully' };
  }
}

export default new SavingsService();
