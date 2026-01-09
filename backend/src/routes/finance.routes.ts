import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import financeController from '../controllers/finance.controller';

const router = Router();

// ==================== PLATFORM WALLETS ====================

/**
 * GET /finance/wallets
 * Get platform crypto wallet addresses for deposits
 */
router.get('/wallets', authenticate, financeController.getPlatformWallets);

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
  financeController.createDeposit
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
  financeController.getUserDeposits
);

/**
 * GET /finance/deposits/:id
 * Get deposit by ID
 */
router.get(
  '/deposits/:id',
  authenticate,
  [param('id').isString()],
  validate,
  financeController.getDepositById
);

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
  financeController.createWithdrawal
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
  financeController.getUserWithdrawals
);

/**
 * GET /finance/withdrawals/:id
 * Get withdrawal by ID
 */
router.get(
  '/withdrawals/:id',
  authenticate,
  [param('id').isString()],
  validate,
  financeController.getWithdrawalById
);

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
  financeController.getUserTransactions
);

/**
 * GET /finance/pnl
 * Get user's P&L summary
 */
router.get('/pnl', authenticate, financeController.getUserPnLSummary);

// ==================== ADMIN ROUTES ====================

/**
 * GET /finance/admin/deposits/pending
 * Get all pending deposits (Admin only)
 */
router.get(
  '/admin/deposits/pending',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  financeController.getPendingDeposits
);

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
  financeController.approveDeposit
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
  financeController.rejectDeposit
);

/**
 * GET /finance/admin/withdrawals/pending
 * Get all pending withdrawals (Admin only)
 */
router.get(
  '/admin/withdrawals/pending',
  authenticate,
  authorize(['ADMIN', 'SUPPORT']),
  financeController.getPendingWithdrawals
);

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
  financeController.approveWithdrawal
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
  financeController.rejectWithdrawal
);

// ==================== ADMIN PLATFORM WALLET ROUTES ====================

/**
 * GET /finance/admin/wallets
 * Get all platform wallets (Admin only)
 */
router.get('/admin/wallets', authenticate, authorize(['ADMIN']), financeController.getAllPlatformWallets);

/**
 * POST /finance/admin/wallets
 * Create platform wallet (Admin only)
 */
router.post(
  '/admin/wallets',
  authenticate,
  authorize(['ADMIN']),
  [
    body('network').isString().withMessage('Network is required'),
    body('address').isString().withMessage('Address is required'),
    body('label').optional().isString(),
    body('notes').optional().isString(),
    body('qrCode').optional().isString(),
  ],
  validate,
  financeController.createPlatformWallet
);

/**
 * PUT /finance/admin/wallets/:network
 * Update platform wallet (Admin only)
 */
router.put(
  '/admin/wallets/:network',
  authenticate,
  authorize(['ADMIN']),
  [
    param('network').isString(),
    body('address').optional().isString(),
    body('label').optional().isString(),
    body('notes').optional().isString(),
    body('qrCode').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  financeController.updatePlatformWallet
);

/**
 * DELETE /finance/admin/wallets/:network
 * Deactivate platform wallet (Admin only)
 */
router.delete(
  '/admin/wallets/:network',
  authenticate,
  authorize(['ADMIN']),
  [param('network').isString()],
  validate,
  financeController.deactivatePlatformWallet
);

export default router;
