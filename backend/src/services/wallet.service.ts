import prisma from '../utils/database';
import {
  InsufficientBalanceError,
  NotFoundError,
  ValidationError,
} from '../utils/errors';
import { Decimal } from 'decimal.js';
import logger from '../utils/logger';
import { TransactionType, TransactionStatus, WalletType } from '@prisma/client';

export class WalletService {
  /**
   * Get user wallets
   */
  async getUserWallets(userId: string) {
    return prisma.wallet.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        type: true,
        balance: true,
        lockedBalance: true,
        currency: true,
      },
    });
  }

  /**
   * Get specific wallet
   */
  async getWallet(userId: string, walletType: WalletType) {
    const wallet = await prisma.wallet.findUnique({
      where: {
        userId_type: {
          userId,
          type: walletType,
        },
      },
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    return wallet;
  }

  /**
   * Lock balance for trade (atomic operation)
   */
  async lockBalance(
    walletId: string,
    amount: number,
    tradeId?: string
  ): Promise<void> {
    const amountDecimal = new Decimal(amount);

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
        select: { balance: true, lockedBalance: true, userId: true },
      });

      if (!wallet) {
        throw new NotFoundError('Wallet not found');
      }

      const currentBalance = new Decimal(wallet.balance.toString());
      const currentLocked = new Decimal(wallet.lockedBalance.toString());

      if (currentBalance.lessThan(amountDecimal)) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Required: ${amount}, Available: ${currentBalance.toString()}`
        );
      }

      // Update wallet: decrease balance, increase locked
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: currentBalance.minus(amountDecimal).toNumber(),
          lockedBalance: currentLocked.plus(amountDecimal).toNumber(),
        },
      });

      logger.debug(
        `Locked ${amount} in wallet ${walletId}${tradeId ? ` for trade ${tradeId}` : ''}`
      );
    });
  }

  /**
   * Unlock balance (when trade is settled)
   */
  async unlockBalance(walletId: string, amount: number): Promise<void> {
    const amountDecimal = new Decimal(amount);

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
        select: { lockedBalance: true },
      });

      if (!wallet) {
        throw new NotFoundError('Wallet not found');
      }

      const currentLocked = new Decimal(wallet.lockedBalance.toString());

      if (currentLocked.lessThan(amountDecimal)) {
        throw new ValidationError('Cannot unlock more than locked balance');
      }

      await tx.wallet.update({
        where: { id: walletId },
        data: {
          lockedBalance: currentLocked.minus(amountDecimal).toNumber(),
        },
      });

      logger.debug(`Unlocked ${amount} in wallet ${walletId}`);
    });
  }

  /**
   * Credit wallet (atomic)
   */
  async creditWallet(
    userId: string,
    walletId: string,
    amount: number,
    type: TransactionType,
    description?: string,
    tradeId?: string,
    metadata?: any
  ) {
    if (amount <= 0) {
      throw new ValidationError('Credit amount must be positive');
    }

    const amountDecimal = new Decimal(amount);

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
        select: { balance: true, currency: true },
      });

      if (!wallet) {
        throw new NotFoundError('Wallet not found');
      }

      const currentBalance = new Decimal(wallet.balance.toString());
      const newBalance = currentBalance.plus(amountDecimal);

      // Update wallet
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: newBalance.toNumber() },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          walletId,
          type,
          status: TransactionStatus.COMPLETED,
          amount: amountDecimal.toNumber(),
          balanceBefore: currentBalance.toNumber(),
          balanceAfter: newBalance.toNumber(),
          currency: wallet.currency,
          tradeId,
          description,
          metadata,
          processedAt: new Date(),
        },
      });

      logger.info(
        `Credited ${amount} to wallet ${walletId}. Type: ${type}. New balance: ${newBalance.toString()}`
      );

      return transaction;
    });

    return result;
  }

  /**
   * Debit wallet (atomic)
   */
  async debitWallet(
    userId: string,
    walletId: string,
    amount: number,
    type: TransactionType,
    description?: string,
    tradeId?: string,
    metadata?: any
  ) {
    if (amount <= 0) {
      throw new ValidationError('Debit amount must be positive');
    }

    const amountDecimal = new Decimal(amount);

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
        select: { balance: true, lockedBalance: true, currency: true },
      });

      if (!wallet) {
        throw new NotFoundError('Wallet not found');
      }

      const currentBalance = new Decimal(wallet.balance.toString());
      // Locked balance calculation for future use
// const lockedBalance = new Decimal(wallet.lockedBalance.toString());
      const availableBalance = currentBalance;

      if (availableBalance.lessThan(amountDecimal)) {
        throw new InsufficientBalanceError(
          `Insufficient balance. Required: ${amount}, Available: ${availableBalance.toString()}`
        );
      }

      const newBalance = currentBalance.minus(amountDecimal);

      // Update wallet
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: newBalance.toNumber() },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId,
          walletId,
          type,
          status: TransactionStatus.COMPLETED,
          amount: amountDecimal.neg().toNumber(),
          balanceBefore: currentBalance.toNumber(),
          balanceAfter: newBalance.toNumber(),
          currency: wallet.currency,
          tradeId,
          description,
          metadata,
          processedAt: new Date(),
        },
      });

      logger.info(
        `Debited ${amount} from wallet ${walletId}. Type: ${type}. New balance: ${newBalance.toString()}`
      );

      return transaction;
    });

    return result;
  }

  /**
   * Settle trade - unlock and adjust balance based on profit/loss
   */
  async settleTrade(
    userId: string,
    walletId: string,
    tradeId: string,
    tradeAmount: number,
    profit: number
  ) {
    const tradeAmountDecimal = new Decimal(tradeAmount);
    const profitDecimal = new Decimal(profit);

    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { id: walletId },
        select: { balance: true, lockedBalance: true, currency: true },
      });

      if (!wallet) {
        throw new NotFoundError('Wallet not found');
      }

      const currentBalance = new Decimal(wallet.balance.toString());
      const currentLocked = new Decimal(wallet.lockedBalance.toString());

      // Unlock the trade amount
      const newLocked = currentLocked.minus(tradeAmountDecimal);

      // Calculate new balance
      // If profit > 0: balance + trade_amount + profit
      // If profit < 0 (loss): balance stays same (trade amount was already locked/lost)
      // If profit == 0 (draw): balance + trade_amount (refund)
      let newBalance = currentBalance;

      if (profitDecimal.greaterThanOrEqualTo(0)) {
        // Win or draw: return stake + profit
        newBalance = currentBalance.plus(tradeAmountDecimal).plus(profitDecimal);
      }
      // If loss (profit < 0), the locked amount is lost, balance doesn't change

      // Update wallet
      await tx.wallet.update({
        where: { id: walletId },
        data: {
          balance: newBalance.toNumber(),
          lockedBalance: newLocked.toNumber(),
        },
      });

      // Create transaction record
      const transactionType = profitDecimal.greaterThan(0)
        ? TransactionType.TRADE_WIN
        : profitDecimal.lessThan(0)
        ? TransactionType.TRADE_LOSS
        : TransactionType.TRADE_REFUND;

      await tx.transaction.create({
        data: {
          userId,
          walletId,
          type: transactionType,
          status: TransactionStatus.COMPLETED,
          amount: profit,
          balanceBefore: currentBalance.toNumber(),
          balanceAfter: newBalance.toNumber(),
          currency: wallet.currency,
          tradeId,
          description: `Trade settlement: ${transactionType}`,
          processedAt: new Date(),
        },
      });

      logger.info(
        `Settled trade ${tradeId}. Profit: ${profit}. New balance: ${newBalance.toString()}`
      );
    });
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(
    userId: string,
    walletType?: WalletType,
    limit: number = 50,
    offset: number = 0
  ) {
    const where: any = { userId };

    if (walletType) {
      const wallet = await this.getWallet(userId, walletType);
      where.walletId = wallet.id;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          trade: {
            select: {
              id: true,
              asset: { select: { symbol: true } },
              direction: true,
              amount: true,
              status: true,
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      limit,
      offset,
    };
  }

  /**
   * Admin: Adjust balance
   */
  async adminAdjustBalance(
    userId: string,
    walletType: WalletType,
    amount: number,
    reason: string,
    adminId: string
  ) {
    const wallet = await this.getWallet(userId, walletType);

    if (amount > 0) {
      await this.creditWallet(
        userId,
        wallet.id,
        amount,
        TransactionType.ADMIN_ADJUSTMENT,
        reason,
        undefined,
        { adminId, reason }
      );
    } else if (amount < 0) {
      await this.debitWallet(
        userId,
        wallet.id,
        Math.abs(amount),
        TransactionType.ADMIN_ADJUSTMENT,
        reason,
        undefined,
        { adminId, reason }
      );
    }

    logger.info(`Admin ${adminId} adjusted ${walletType} wallet for user ${userId} by ${amount}`);
  }
}

export default new WalletService();
