import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import financeService from '../services/finance.service';
import logger from '../utils/logger';

const router = Router();

// ==================== PLATFORM WALLETS ====================

/**
 * GET /finance/wallets
 * Get platform crypto wallet addresses for deposits
 */
router.get('/wallets', authenticate, async (req, res) => {
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
});

// ==================== DEPOSITS ====================

/**
 * POST /finance/deposits
 * Create a deposit request
 */
router.post(
  '/deposits',
  authenticate,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('currency').isString().withMessage('Currency is required'),
    body('method').isString().withMessage('Payment method is required'),
    body('cryptoNetwork').optional().isString(),
    body('txHash').optional().isString(),
    body('walletAddress').optional().isString(),
    body('uploadedProof').optional().isString(),
  ],
  validate,
  async (req, res) => {
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
);

/**
 * GET /finance/deposits
 * Get user's deposit history
 */
router.get(
  '/deposits',
  authenticate,
  [query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')],
  validate,
  async (req, res) => {
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
);

/**
 * GET /finance/deposits/:id
 * Get deposit by ID
 */
router.get('/deposits/:id', authenticate, [param('id').isString()], validate, async (req, res) => {
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

    // Only allow user to view their own deposits (unless admin)
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
});

// ==================== WITHDRAWALS ====================

/**
 * POST /finance/withdrawals
 * Create a withdrawal request
 */
router.post(
  '/withdrawals',
  authenticate,
  [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('currency').isString().withMessage('Currency is required'),
    body('method').isString().withMessage('Payment method is required'),
    body('destination').isObject().withMessage('Destination is required'),
    body('cryptoNetwork').optional().isString(),
    body('cryptoAddress').optional().isString(),
  ],
  validate,
  async (req, res) => {
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
);

/**
 * GET /finance/withdrawals
 * Get user's withdrawal history
 */
router.get(
  '/withdrawals',
  authenticate,
  [query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')],
  validate,
  async (req, res) => {
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
);

/**
 * GET /finance/withdrawals/:id
 * Get withdrawal by ID
 */
router.get('/withdrawals/:id', authenticate, [param('id').isString()], validate, async (req, res) => {
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

    // Only allow user to view their own withdrawals (unless admin)
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
});

// ==================== TRANSACTIONS ====================

/**
 * GET /finance/transactions
 * Get user's transaction history
 */
router.get(
  '/transactions',
  authenticate,
  [query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200')],
  validate,
  async (req, res) => {
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
);

/**
 * GET /finance/pnl
 * Get user's P&L summary
 */
router.get('/pnl', authenticate, async (req, res) => {
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
});

// ==================== ADMIN ROUTES ====================

/**
 * GET /finance/admin/deposits/pending
 * Get all pending deposits (Admin only)
 */
router.get('/admin/deposits/pending', authenticate, authorize(['ADMIN', 'SUPPORT']), async (req, res) => {
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
});

/**
 * POST /finance/admin/deposits/:id/approve
 * Approve a deposit (Admin only)
 */
router.post(
  '/admin/deposits/:id/approve',
  authenticate,
  authorize(['ADMIN']),
  [param('id').isString()],
  validate,
  async (req, res) => {
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
);

/**
 * POST /finance/admin/deposits/:id/reject
 * Reject a deposit (Admin only)
 */
router.post(
  '/admin/deposits/:id/reject',
  authenticate,
  authorize(['ADMIN']),
  [param('id').isString(), body('rejectionReason').isString().withMessage('Rejection reason is required')],
  validate,
  async (req, res) => {
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
);

/**
 * GET /finance/admin/withdrawals/pending
 * Get all pending withdrawals (Admin only)
 */
router.get('/admin/withdrawals/pending', authenticate, authorize(['ADMIN', 'SUPPORT']), async (req, res) => {
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
});

/**
 * POST /finance/admin/withdrawals/:id/approve
 * Approve a withdrawal (Admin only)
 */
router.post(
  '/admin/withdrawals/:id/approve',
  authenticate,
  authorize(['ADMIN']),
  [param('id').isString(), body('txHash').optional().isString()],
  validate,
  async (req, res) => {
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
);

/**
 * POST /finance/admin/withdrawals/:id/reject
 * Reject a withdrawal (Admin only)
 */
router.post(
  '/admin/withdrawals/:id/reject',
  authenticate,
  authorize(['ADMIN']),
  [param('id').isString(), body('rejectionReason').isString().withMessage('Rejection reason is required')],
  validate,
  async (req, res) => {
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
);

export default router;
