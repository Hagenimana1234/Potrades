import { Request, Response, NextFunction } from 'express';
import financeService from '../services/finance.service';
import logger from '../utils/logger';

class FinanceController {
  // ==================== PLATFORM WALLETS ====================

  async getPlatformWallets(req: Request, res: Response, next: NextFunction) {
    try {
      const wallets = await financeService.getPlatformWallets();
      res.json({
        success: true,
        data: wallets,
      });
    } catch (error: any) {
      logger.error('Get platform wallets error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch platform wallets',
      });
    }
  }

  // ==================== DEPOSITS ====================

  async createDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { amount, currency, method, cryptoNetwork, txHash, walletAddress, uploadedProof } = req.body;

      const deposit = await financeService.createDeposit({
        userId,
        amount,
        currency,
        method,
        cryptoNetwork,
        txHash,
        walletAddress,
        uploadedProof,
      });

      res.status(201).json({
        success: true,
        data: deposit,
        message: 'Deposit request created successfully. Awaiting admin approval.',
      });
    } catch (error: any) {
      logger.error('Create deposit error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create deposit',
      });
    }
  }

  async getUserDeposits(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const deposits = await financeService.getUserDeposits(userId, limit);

      res.json({
        success: true,
        data: deposits,
      });
    } catch (error: any) {
      logger.error('Get deposits error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch deposits',
      });
    }
  }

  async getDepositById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const depositId = req.params.id;

      const deposit = await financeService.getDepositById(depositId);

      if (!deposit) {
        return res.status(404).json({
          success: false,
          error: 'Deposit not found',
        });
      }

      if (deposit.userId !== userId && req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      res.json({
        success: true,
        data: deposit,
      });
    } catch (error: any) {
      logger.error('Get deposit error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch deposit',
      });
    }
  }

  // ==================== WITHDRAWALS ====================

  async createWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { amount, currency, method, destination, cryptoNetwork, cryptoAddress } = req.body;

      const withdrawal = await financeService.createWithdrawal({
        userId,
        amount,
        currency,
        method,
        destination,
        cryptoNetwork,
        cryptoAddress,
      });

      res.status(201).json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal request created successfully. Awaiting admin approval.',
      });
    } catch (error: any) {
      logger.error('Create withdrawal error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create withdrawal',
      });
    }
  }

  async getUserWithdrawals(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const withdrawals = await financeService.getUserWithdrawals(userId, limit);

      res.json({
        success: true,
        data: withdrawals,
      });
    } catch (error: any) {
      logger.error('Get withdrawals error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch withdrawals',
      });
    }
  }

  async getWithdrawalById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const withdrawalId = req.params.id;

      const withdrawal = await financeService.getWithdrawalById(withdrawalId);

      if (!withdrawal) {
        return res.status(404).json({
          success: false,
          error: 'Withdrawal not found',
        });
      }

      if (withdrawal.userId !== userId && req.user!.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      res.json({
        success: true,
        data: withdrawal,
      });
    } catch (error: any) {
      logger.error('Get withdrawal error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch withdrawal',
      });
    }
  }

  // ==================== TRANSACTIONS ====================

  async getUserTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const transactions = await financeService.getUserTransactions(userId, limit);

      res.json({
        success: true,
        data: transactions,
      });
    } catch (error: any) {
      logger.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch transactions',
      });
    }
  }

  async getUserPnLSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const pnl = await financeService.getUserPnLSummary(userId);

      res.json({
        success: true,
        data: pnl,
      });
    } catch (error: any) {
      logger.error('Get PnL error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch P&L summary',
      });
    }
  }

  // ==================== ADMIN ROUTES ====================

  async getPendingDeposits(req: Request, res: Response, next: NextFunction) {
    try {
      const deposits = await financeService.getPendingDeposits();

      res.json({
        success: true,
        data: deposits,
      });
    } catch (error: any) {
      logger.error('Get pending deposits error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch pending deposits',
      });
    }
  }

  async approveDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const depositId = req.params.id;
      const approvedBy = req.user!.id;

      const deposit = await financeService.approveDeposit({
        depositId,
        approvedBy,
      });

      res.json({
        success: true,
        data: deposit,
        message: 'Deposit approved successfully',
      });
    } catch (error: any) {
      logger.error('Approve deposit error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to approve deposit',
      });
    }
  }

  async rejectDeposit(req: Request, res: Response, next: NextFunction) {
    try {
      const depositId = req.params.id;
      const { rejectionReason } = req.body;

      const deposit = await financeService.rejectDeposit({
        depositId,
        rejectionReason,
      });

      res.json({
        success: true,
        data: deposit,
        message: 'Deposit rejected',
      });
    } catch (error: any) {
      logger.error('Reject deposit error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to reject deposit',
      });
    }
  }

  async getPendingWithdrawals(req: Request, res: Response, next: NextFunction) {
    try {
      const withdrawals = await financeService.getPendingWithdrawals();

      res.json({
        success: true,
        data: withdrawals,
      });
    } catch (error: any) {
      logger.error('Get pending withdrawals error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch pending withdrawals',
      });
    }
  }

  async approveWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const withdrawalId = req.params.id;
      const approvedBy = req.user!.id;
      const { txHash } = req.body;

      const withdrawal = await financeService.approveWithdrawal({
        withdrawalId,
        approvedBy,
        txHash,
      });

      res.json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal approved successfully',
      });
    } catch (error: any) {
      logger.error('Approve withdrawal error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to approve withdrawal',
      });
    }
  }

  async rejectWithdrawal(req: Request, res: Response, next: NextFunction) {
    try {
      const withdrawalId = req.params.id;
      const { rejectionReason } = req.body;

      const withdrawal = await financeService.rejectWithdrawal(withdrawalId, rejectionReason);

      res.json({
        success: true,
        data: withdrawal,
        message: 'Withdrawal rejected',
      });
    } catch (error: any) {
      logger.error('Reject withdrawal error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to reject withdrawal',
      });
    }
  }

  // ==================== ADMIN PLATFORM WALLET ROUTES ====================

  async getAllPlatformWallets(req: Request, res: Response, next: NextFunction) {
    try {
      const wallets = await financeService.getAllPlatformWallets();

      res.json({
        success: true,
        data: wallets,
      });
    } catch (error: any) {
      logger.error('Get all platform wallets error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch platform wallets',
      });
    }
  }

  async createPlatformWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const { network, address, label, notes, qrCode } = req.body;

      const wallet = await financeService.createPlatformWallet({
        network,
        address,
        label,
        notes,
        qrCode,
      });

      res.status(201).json({
        success: true,
        data: wallet,
        message: 'Platform wallet created successfully',
      });
    } catch (error: any) {
      logger.error('Create platform wallet error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create platform wallet',
      });
    }
  }

  async updatePlatformWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const network = req.params.network;
      const { address, label, notes, qrCode, isActive } = req.body;

      const wallet = await financeService.updatePlatformWallet(network, {
        address,
        label,
        notes,
        qrCode,
        isActive,
      });

      res.json({
        success: true,
        data: wallet,
        message: 'Platform wallet updated successfully',
      });
    } catch (error: any) {
      logger.error('Update platform wallet error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update platform wallet',
      });
    }
  }

  async deactivatePlatformWallet(req: Request, res: Response, next: NextFunction) {
    try {
      const network = req.params.network;

      const wallet = await financeService.deactivatePlatformWallet(network);

      res.json({
        success: true,
        data: wallet,
        message: 'Platform wallet deactivated successfully',
      });
    } catch (error: any) {
      logger.error('Deactivate platform wallet error:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to deactivate platform wallet',
      });
    }
  }
}

export default new FinanceController();
