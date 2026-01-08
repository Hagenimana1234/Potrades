import prisma from '../utils/database';
import logger from '../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Finance Service
 * Handles deposits, withdrawals, and transaction management
 * Supports manual crypto payment verification
 */

interface CreateDepositInput {
  userId: string;
  amount: number;
  currency: string;
  method: string;
  cryptoNetwork?: string;
  txHash?: string;
  walletAddress?: string;
  uploadedProof?: string;
}

interface ApproveDepositInput {
  depositId: string;
  approvedBy: string;
}

interface RejectDepositInput {
  depositId: string;
  rejectionReason: string;
}

interface CreateWithdrawalInput {
  userId: string;
  amount: number;
  currency: string;
  method: string;
  destination: any;
  cryptoNetwork?: string;
  cryptoAddress?: string;
}

interface ApproveWithdrawalInput {
  withdrawalId: string;
  approvedBy: string;
  txHash?: string;
}

class FinanceService {
  /**
   * Get platform wallet addresses for crypto deposits
   */
  async getPlatformWallets() {
    return await prisma.platformWallet.findMany({
      where: { isActive: true },
      orderBy: { network: 'asc' },
    });
  }

  /**
   * Get platform wallet by network
   */
  async getPlatformWalletByNetwork(network: string) {
    return await prisma.platformWallet.findUnique({
      where: { network: network as any },
    });
  }

  /**
   * Get all platform wallets (Admin only)
   */
  async getAllPlatformWallets() {
    return await prisma.platformWallet.findMany({
      orderBy: { network: 'asc' },
    });
  }

  /**
   * Create platform wallet (Admin only)
   */
  async createPlatformWallet(data: {
    network: string;
    address: string;
    label?: string;
    notes?: string;
    qrCode?: string;
  }) {
    const { network, address, label, notes, qrCode } = data;

    // Check if wallet already exists
    const existing = await prisma.platformWallet.findUnique({
      where: { network: network as any },
    });

    if (existing) {
      throw new Error(`Platform wallet for ${network} already exists`);
    }

    const wallet = await prisma.platformWallet.create({
      data: {
        network: network as any,
        address,
        label,
        notes,
        qrCode,
        isActive: true,
      },
    });

    logger.info(`Platform wallet created: ${network} - ${address}`);

    return wallet;
  }

  /**
   * Update platform wallet (Admin only)
   */
  async updatePlatformWallet(
    network: string,
    data: {
      address?: string;
      label?: string;
      notes?: string;
      qrCode?: string;
      isActive?: boolean;
    }
  ) {
    const wallet = await prisma.platformWallet.findUnique({
      where: { network: network as any },
    });

    if (!wallet) {
      throw new Error(`Platform wallet for ${network} not found`);
    }

    const updated = await prisma.platformWallet.update({
      where: { network: network as any },
      data,
    });

    logger.info(`Platform wallet updated: ${network}`);

    return updated;
  }

  /**
   * Deactivate platform wallet (Admin only)
   */
  async deactivatePlatformWallet(network: string) {
    const wallet = await prisma.platformWallet.findUnique({
      where: { network: network as any },
    });

    if (!wallet) {
      throw new Error(`Platform wallet for ${network} not found`);
    }

    const updated = await prisma.platformWallet.update({
      where: { network: network as any },
      data: { isActive: false },
    });

    logger.info(`Platform wallet deactivated: ${network}`);

    return updated;
  }

  /**
   * Create a deposit request
   * For crypto: User submits tx hash and proof
   * Waits for admin approval
   */
  async createDeposit(data: CreateDepositInput) {
    const { userId, amount, currency, method, cryptoNetwork, txHash, walletAddress, uploadedProof } = data;

    // Validate amount
    if (amount <= 0) {
      throw new Error('Deposit amount must be greater than 0');
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // For crypto deposits, validate required fields
    if (method.startsWith('CRYPTO_') && (!txHash || !walletAddress)) {
      throw new Error('Transaction hash and wallet address are required for crypto deposits');
    }

    // Create deposit
    const deposit = await prisma.deposit.create({
      data: {
        userId,
        amount: new Decimal(amount),
        currency,
        method: method as any,
        cryptoNetwork: cryptoNetwork as any,
        txHash,
        walletAddress,
        uploadedProof,
        status: 'PENDING',
      },
    });

    logger.info(`Deposit created: ${deposit.id} for user ${userId} - Amount: ${amount} ${currency}`);

    return deposit;
  }

  /**
   * Get deposit by ID
   */
  async getDepositById(depositId: string) {
    return await prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get user deposits
   */
  async getUserDeposits(userId: string, limit = 50) {
    return await prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all pending deposits (for admin)
   */
  async getPendingDeposits() {
    return await prisma.deposit.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve deposit and credit user wallet
   */
  async approveDeposit(data: ApproveDepositInput) {
    const { depositId, approvedBy } = data;

    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
      include: { user: true },
    });

    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (deposit.status !== 'PENDING') {
      throw new Error('Deposit is not pending approval');
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update deposit status
      const updatedDeposit = await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: 'COMPLETED',
          approvedBy,
          approvedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Get or create REAL wallet
      let wallet = await tx.wallet.findFirst({
        where: {
          userId: deposit.userId,
          type: 'REAL',
        },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: deposit.userId,
            type: 'REAL',
            balance: 0,
            currency: deposit.currency,
          },
        });
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = new Decimal(balanceBefore).add(deposit.amount);

      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId: deposit.userId,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          amount: deposit.amount,
          balanceBefore,
          balanceAfter,
          currency: deposit.currency,
          description: `Deposit approved - ${deposit.method}`,
          metadata: {
            depositId: deposit.id,
            txHash: deposit.txHash,
            network: deposit.cryptoNetwork,
          },
          processedAt: new Date(),
        },
      });

      // Update platform wallet stats if crypto
      if (deposit.cryptoNetwork && deposit.walletAddress) {
        await tx.platformWallet.update({
          where: { network: deposit.cryptoNetwork },
          data: {
            totalDeposits: { increment: deposit.amount },
            depositCount: { increment: 1 },
          },
        });
      }

      logger.info(
        `Deposit approved: ${depositId} - User: ${deposit.userId} - Amount: ${deposit.amount} ${deposit.currency}`
      );

      return updatedDeposit;
    });

    return result;
  }

  /**
   * Reject deposit
   */
  async rejectDeposit(data: RejectDepositInput) {
    const { depositId, rejectionReason } = data;

    const deposit = await prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new Error('Deposit not found');
    }

    if (deposit.status !== 'PENDING') {
      throw new Error('Deposit is not pending approval');
    }

    const updatedDeposit = await prisma.deposit.update({
      where: { id: depositId },
      data: {
        status: 'FAILED',
        rejectionReason,
        completedAt: new Date(),
      },
    });

    logger.info(`Deposit rejected: ${depositId} - Reason: ${rejectionReason}`);

    return updatedDeposit;
  }

  /**
   * Create withdrawal request
   */
  async createWithdrawal(data: CreateWithdrawalInput) {
    const { userId, amount, currency, method, destination, cryptoNetwork, cryptoAddress } = data;

    // Validate amount
    if (amount <= 0) {
      throw new Error('Withdrawal amount must be greater than 0');
    }

    // Get user's REAL wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        userId,
        type: 'REAL',
      },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    // Check if user has sufficient balance
    if (new Decimal(wallet.balance).lessThan(amount)) {
      throw new Error('Insufficient balance');
    }

    // Create withdrawal request
    const withdrawal = await prisma.withdrawal.create({
      data: {
        userId,
        amount: new Decimal(amount),
        currency,
        method: method as any,
        destination,
        cryptoNetwork: cryptoNetwork as any,
        cryptoAddress,
        status: 'PENDING',
      },
    });

    logger.info(`Withdrawal requested: ${withdrawal.id} for user ${userId} - Amount: ${amount} ${currency}`);

    return withdrawal;
  }

  /**
   * Get withdrawal by ID
   */
  async getWithdrawalById(withdrawalId: string) {
    return await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /**
   * Get user withdrawals
   */
  async getUserWithdrawals(userId: string, limit = 50) {
    return await prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get all pending withdrawals (for admin)
   */
  async getPendingWithdrawals() {
    return await prisma.withdrawal.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Approve withdrawal and deduct from wallet
   */
  async approveWithdrawal(data: ApproveWithdrawalInput) {
    const { withdrawalId, approvedBy, txHash } = data;

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error('Withdrawal is not pending approval');
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get user's REAL wallet
      const wallet = await tx.wallet.findFirst({
        where: {
          userId: withdrawal.userId,
          type: 'REAL',
        },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      // Check balance again
      if (new Decimal(wallet.balance).lessThan(withdrawal.amount)) {
        throw new Error('Insufficient balance');
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = new Decimal(balanceBefore).sub(withdrawal.amount);

      // Update wallet balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter },
      });

      // Update withdrawal status
      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'COMPLETED',
          approvedBy,
          approvedAt: new Date(),
          txHash,
          completedAt: new Date(),
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          userId: withdrawal.userId,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          amount: new Decimal(withdrawal.amount).neg(), // Negative for withdrawal
          balanceBefore,
          balanceAfter,
          currency: withdrawal.currency,
          description: `Withdrawal approved - ${withdrawal.method}`,
          metadata: {
            withdrawalId: withdrawal.id,
            txHash,
            network: withdrawal.cryptoNetwork,
            destination: withdrawal.destination,
          },
          processedAt: new Date(),
        },
      });

      logger.info(
        `Withdrawal approved: ${withdrawalId} - User: ${withdrawal.userId} - Amount: ${withdrawal.amount} ${withdrawal.currency}`
      );

      return updatedWithdrawal;
    });

    return result;
  }

  /**
   * Reject withdrawal
   */
  async rejectWithdrawal(withdrawalId: string, rejectionReason: string) {
    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new Error('Withdrawal not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new Error('Withdrawal is not pending approval');
    }

    const updatedWithdrawal = await prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: 'REJECTED',
        rejectionReason,
        completedAt: new Date(),
      },
    });

    logger.info(`Withdrawal rejected: ${withdrawalId} - Reason: ${rejectionReason}`);

    return updatedWithdrawal;
  }

  /**
   * Get user transaction history
   */
  async getUserTransactions(userId: string, limit = 100) {
    return await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get user PnL summary
   */
  async getUserPnLSummary(userId: string) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
    });

    let totalDeposits = new Decimal(0);
    let totalWithdrawals = new Decimal(0);
    let totalWins = new Decimal(0);
    let totalLosses = new Decimal(0);

    transactions.forEach((tx) => {
      switch (tx.type) {
        case 'DEPOSIT':
          totalDeposits = totalDeposits.add(tx.amount);
          break;
        case 'WITHDRAWAL':
          totalWithdrawals = totalWithdrawals.add(new Decimal(tx.amount).abs());
          break;
        case 'TRADE_WIN':
          totalWins = totalWins.add(tx.amount);
          break;
        case 'TRADE_LOSS':
          totalLosses = totalLosses.add(new Decimal(tx.amount).abs());
          break;
      }
    });

    const netPnL = totalWins.sub(totalLosses);
    const totalPnL = totalDeposits.sub(totalWithdrawals).add(netPnL);

    return {
      totalDeposits: totalDeposits.toNumber(),
      totalWithdrawals: totalWithdrawals.toNumber(),
      totalWins: totalWins.toNumber(),
      totalLosses: totalLosses.toNumber(),
      netTradingPnL: netPnL.toNumber(),
      totalPnL: totalPnL.toNumber(),
      transactionCount: transactions.length,
    };
  }
}

export default new FinanceService();
