import { Router } from 'express';
import authController from '../controllers/auth.controller';
import tradingController from '../controllers/trading.controller';
import adminController from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { strictLimiter, tradeLimiter } from '../middleware/rateLimiter.middleware';
import healthRoutes from './health.routes';
import financeRoutes from './finance.routes';
import affiliateRoutes from './affiliate.routes';
import profileRoutes from './profile.routes';
import marketRoutes from './market.routes';
import savingsRoutes from './savings.routes';
import tradesRoutes from './trades.routes';
import copyTradingRoutes from './copyTrading.routes';
import settingsRoutes from './settings.routes';
import signalsRoutes from './signals.routes';
import notificationsRoutes from './notifications.routes';
import supportRoutes from './support.routes';

const router = Router();

// Health check routes (for load balancers)
router.use('/', healthRoutes);

// Market routes (assets, favorites, market data)
router.use('/market', marketRoutes);

// Savings routes (My Safe - savings plans, deposits, withdrawals)
router.use('/savings', savingsRoutes);

// Trades routes (place, close, history, risk settings)
router.use('/trades', tradesRoutes);

// Copy Trading routes (browse traders, follow, performance)
router.use('/copy-trading', copyTradingRoutes);

// Finance routes (deposits, withdrawals, transactions)
router.use('/finance', financeRoutes);

// Affiliate routes (referrals, commissions)
router.use('/affiliate', affiliateRoutes);

// Profile routes (user info, KYC, security, activity)
router.use('/profile', profileRoutes);

// Settings routes (preferences, notifications, security)
router.use('/settings', settingsRoutes);

// Signals routes (trading signals, subscriptions, performance)
router.use('/signals', signalsRoutes);

// Notifications routes (in-app notifications, alerts)
router.use('/notifications', notificationsRoutes);

// Support routes (tickets, messages, customer support)
router.use('/support', supportRoutes);

// ==================== AUTH ROUTES ====================
router.post('/auth/register', strictLimiter, authController.register);
router.post('/auth/login', strictLimiter, authController.login);
router.post('/auth/refresh', authController.refreshToken);
router.post('/auth/logout', authenticate, authController.logout);
router.post('/auth/logout-all', authenticate, authController.logoutAll);
router.get('/auth/sessions', authenticate, authController.getSessions);
router.post('/auth/change-password', authenticate, authController.changePassword);
router.get('/auth/profile', authenticate, authController.getProfile);

// 2FA
router.post('/auth/2fa/setup', authenticate, authController.setup2FA);
router.post('/auth/2fa/enable', authenticate, authController.enable2FA);
router.post('/auth/2fa/disable', authenticate, authController.disable2FA);

// ==================== LEGACY ASSET ROUTES ====================
// (Kept for backward compatibility - prefer /market routes)
router.get('/assets', tradingController.getAssets);
router.get('/assets/:assetId/price', tradingController.getCurrentPrice);
router.get('/assets/:assetId/history', tradingController.getPriceHistory);

// ==================== WALLET ROUTES ====================
router.get('/wallet', authenticate, async (req, res, next) => {
  try {
    const walletService = (await import('../services/wallet.service')).default;
    const wallets = await walletService.getUserWallets(req.user!.userId);
    res.json({ success: true, data: wallets });
  } catch (error) {
    next(error);
  }
});

router.get('/wallet/transactions', authenticate, async (req, res, next) => {
  try {
    const walletService = (await import('../services/wallet.service')).default;
    const { walletType, limit, offset } = req.query;
    const result = await walletService.getTransactionHistory(
      req.user!.userId,
      walletType as any,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// ==================== COPY TRADING ROUTES ====================
router.get('/copy-trading/traders', authenticate, async (req, res, next) => {
  try {
    const copyTradingService = (await import('../services/copyTrading.service')).default;
    const filters = {
      minWinRate: req.query.minWinRate ? Number(req.query.minWinRate) : undefined,
      minTotalTrades: req.query.minTotalTrades ? Number(req.query.minTotalTrades) : undefined,
      sortBy: req.query.sortBy as any,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    };
    const result = await copyTradingService.getPublicCopyTraders(filters);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/copy-trading/apply', authenticate, async (req, res, next) => {
  try {
    const copyTradingService = (await import('../services/copyTrading.service')).default;
    const result = await copyTradingService.applyAsCopyTrader(req.user!.userId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/copy-trading/follow/:copyTraderId', authenticate, async (req, res, next) => {
  try {
    const copyTradingService = (await import('../services/copyTrading.service')).default;
    const result = await copyTradingService.followCopyTrader(
      req.user!.userId,
      req.params.copyTraderId,
      req.body
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.delete('/copy-trading/follow/:copyTraderId', authenticate, async (req, res, next) => {
  try {
    const copyTradingService = (await import('../services/copyTrading.service')).default;
    await copyTradingService.unfollowCopyTrader(req.user!.userId, req.params.copyTraderId);
    res.json({ success: true, message: 'Unfollowed successfully' });
  } catch (error) {
    next(error);
  }
});

router.get('/copy-trading/my-relationships', authenticate, async (req, res, next) => {
  try {
    const copyTradingService = (await import('../services/copyTrading.service')).default;
    const relationships = await copyTradingService.getUserCopyRelationships(req.user!.userId);
    res.json({ success: true, data: relationships });
  } catch (error) {
    next(error);
  }
});

// ==================== REFERRAL ROUTES ====================
// Basic referral stats (separate from affiliate program)
router.get('/referral/stats', authenticate, async (req, res, next) => {
  try {
    const affiliateService = (await import('../services/affiliate.service')).default;
    const stats = await affiliateService.getReferralStats(req.user!.userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

// ==================== ADMIN ROUTES ====================
const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

// User Management
adminRouter.get('/users', adminController.getUsers);
adminRouter.put('/users/:userId/status', adminController.updateUserStatus);
adminRouter.post('/users/adjust-balance', adminController.adjustBalance);

// Trading Management
adminRouter.get('/trades', adminController.getAllTrades);
adminRouter.get('/trades/exposure', adminController.getPlatformExposure);
adminRouter.get('/stats', adminController.getPlatformStats);

// OTC Pricing Configuration (POL Management)
adminRouter.get('/otc-pricing', adminController.getOTCPricingConfigs);
adminRouter.get('/otc-pricing/:assetId', adminController.getOTCPricingConfig);
adminRouter.put('/otc-pricing/:assetId', adminController.updateOTCPricingConfig);
adminRouter.post('/otc-pricing/clear-cache', adminController.clearPOLCache);
adminRouter.post('/otc-pricing/preview', adminController.previewSyntheticPrice);

// Asset Management
adminRouter.put('/assets/:assetId', adminController.updateAsset);
adminRouter.post('/assets', adminController.createAsset);

// Copy Trading Management
adminRouter.get('/copy-traders/pending', adminController.getPendingCopyTraders);
adminRouter.post('/copy-traders/:copyTraderId/approve', adminController.approveCopyTrader);
adminRouter.post('/copy-traders/:copyTraderId/suspend', adminController.suspendCopyTrader);

// Affiliate Management
adminRouter.get('/affiliates', adminController.getAllAffiliates);
adminRouter.post('/affiliates/:affiliateId/approve', adminController.approveAffiliate);
adminRouter.get('/commissions/pending', adminController.getPendingCommissions);
adminRouter.post('/commissions/:commissionId/approve', adminController.approveCommission);
adminRouter.post('/commissions/:commissionId/pay', adminController.payCommission);

// System Management
adminRouter.get('/settings', adminController.getSystemSettings);
adminRouter.put('/settings/:key', adminController.updateSystemSetting);
adminRouter.get('/audit-logs', adminController.getAuditLogs);

router.use('/admin', adminRouter);

export default router;
