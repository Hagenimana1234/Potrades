import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const { accessToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') }),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

// Trading API
export const tradingAPI = {
  placeTrade: (data: any) => api.post('/trades', data),
  getTrades: (params?: any) => api.get('/trades', { params }),
  getTradeStats: (params?: any) => api.get('/trades/stats', { params }),
  getOpenTrades: () => api.get('/trades/open'),
  getAssets: () => api.get('/assets'),
  getCurrentPrice: (assetId: string) => api.get(`/assets/${assetId}/price`),
  getPriceHistory: (assetId: string, params?: any) => api.get(`/assets/${assetId}/history`, { params }),
};

// Trades API (new dedicated module)
export const tradesAPI = {
  // Trade operations
  placeTrade: (data: any) => api.post('/trades', data),
  closeTrade: (tradeId: string) => api.post(`/trades/${tradeId}/close`),
  cancelTrade: (tradeId: string) => api.delete(`/trades/${tradeId}`),

  // Trade queries
  getOpenTrades: () => api.get('/trades/open'),
  getTradeHistory: (params?: any) => api.get('/trades', { params }),
  getTradeStats: (params?: any) => api.get('/trades/stats', { params }),

  // Risk management
  getRiskLimits: () => api.get('/trades/risk/limits'),
  updateRiskLimits: (data: any) => api.put('/trades/risk/limits', data),
  removeRiskLimits: () => api.delete('/trades/risk/limits'),
};

// Wallet API
export const walletAPI = {
  getWallets: () => api.get('/wallet'),
  getTransactions: (params?: any) => api.get('/wallet/transactions', { params }),
};

// Finance API
export const financeAPI = {
  // Platform wallets
  getPlatformWallets: () => api.get('/finance/wallets'),

  // Deposits
  createDeposit: (data: any) => api.post('/finance/deposits', data),
  getDeposits: (params?: any) => api.get('/finance/deposits', { params }),
  getDepositById: (id: string) => api.get(`/finance/deposits/${id}`),

  // Withdrawals
  createWithdrawal: (data: any) => api.post('/finance/withdrawals', data),
  getWithdrawals: (params?: any) => api.get('/finance/withdrawals', { params }),
  getWithdrawalById: (id: string) => api.get(`/finance/withdrawals/${id}`),

  // Transactions & P&L
  getTransactions: (params?: any) => api.get('/finance/transactions', { params }),
  getPnL: () => api.get('/finance/pnl'),

  // Admin endpoints - Deposits & Withdrawals
  getPendingDeposits: () => api.get('/finance/admin/deposits/pending'),
  approveDeposit: (id: string) => api.post(`/finance/admin/deposits/${id}/approve`),
  rejectDeposit: (id: string, rejectionReason: string) =>
    api.post(`/finance/admin/deposits/${id}/reject`, { rejectionReason }),
  getPendingWithdrawals: () => api.get('/finance/admin/withdrawals/pending'),
  approveWithdrawal: (id: string, txHash?: string) =>
    api.post(`/finance/admin/withdrawals/${id}/approve`, { txHash }),
  rejectWithdrawal: (id: string, rejectionReason: string) =>
    api.post(`/finance/admin/withdrawals/${id}/reject`, { rejectionReason }),

  // Admin endpoints - Platform Wallets
  getAllPlatformWallets: () => api.get('/finance/admin/wallets'),
  createPlatformWallet: (data: any) => api.post('/finance/admin/wallets', data),
  updatePlatformWallet: (network: string, data: any) => api.put(`/finance/admin/wallets/${network}`, data),
  deactivatePlatformWallet: (network: string) => api.delete(`/finance/admin/wallets/${network}`),
};

// Market API
export const marketAPI = {
  // Assets
  getAssets: (params?: any) => api.get('/market/assets', { params }),
  getAssetDetails: (assetId: string) => api.get(`/market/assets/${assetId}`),
  getMarketStats: () => api.get('/market/stats'),

  // Favorites
  getFavorites: () => api.get('/market/favorites'),
  addFavorite: (assetId: string) => api.post(`/market/favorites/${assetId}`),
  removeFavorite: (assetId: string) => api.delete(`/market/favorites/${assetId}`),
};

// Savings API (My Safe)
export const savingsAPI = {
  // Plans
  getPlans: () => api.get('/savings/plans'),
  estimateReturns: (data: any) => api.post('/savings/estimate', data),

  // User savings
  getMySavings: () => api.get('/savings/my-savings'),
  getAnalytics: () => api.get('/savings/analytics'),
  deposit: (data: any) => api.post('/savings/deposit', data),
  withdraw: (depositId: string) => api.post(`/savings/withdraw/${depositId}`),

  // Admin
  adminGetDeposits: (params?: any) => api.get('/savings/admin/deposits', { params }),
  adminGetPlans: () => api.get('/savings/admin/plans'),
  adminCreatePlan: (data: any) => api.post('/savings/admin/plans', data),
  adminUpdatePlan: (planId: string, data: any) => api.put(`/savings/admin/plans/${planId}`, data),
  adminDeletePlan: (planId: string) => api.delete(`/savings/admin/plans/${planId}`),
};

// Copy Trading API
export const copyTradingAPI = {
  // Browse traders
  getCopyTraders: (params?: any) => api.get('/copy-trading/traders', { params }),
  getTraderDetails: (traderId: string) => api.get(`/copy-trading/traders/${traderId}`),
  getTraderPerformance: (traderId: string, days?: number) =>
    api.get(`/copy-trading/traders/${traderId}/performance`, { params: { days } }),
  getTraderFollowers: (traderId: string) => api.get(`/copy-trading/traders/${traderId}/followers`),

  // Follow/Unfollow
  followTrader: (traderId: string, config: any) => api.post(`/copy-trading/follow/${traderId}`, config),
  unfollowTrader: (traderId: string) => api.post(`/copy-trading/unfollow/${traderId}`),
  pauseCopyRelationship: (traderId: string) => api.post(`/copy-trading/pause/${traderId}`),
  resumeCopyRelationship: (traderId: string) => api.post(`/copy-trading/resume/${traderId}`),
  updateCopySettings: (traderId: string, config: any) =>
    api.put(`/copy-trading/settings/${traderId}`, config),

  // My relationships
  getMyFollowing: () => api.get('/copy-trading/my-following'),

  // My profile (as copy trader)
  getMyCopyTraderProfile: () => api.get('/copy-trading/my-profile'),
  applyAsCopyTrader: (data: any) => api.post('/copy-trading/apply', data),
  updateCopyTraderProfile: (data: any) => api.put('/copy-trading/my-profile', data),
};

// Signals API
export const signalsAPI = {
  // Browse signals
  getSignals: (params?: any) => api.get('/signals', { params }),
  getActiveSignals: (assetId?: string, limit?: number) =>
    api.get('/signals/active', { params: { assetId, limit } }),
  getSignalById: (signalId: string) => api.get(`/signals/${signalId}`),

  // My signals (for providers)
  getMySignals: (status?: string) => api.get('/signals/my-signals', { params: { status } }),
  createSignal: (data: any) => api.post('/signals', data),
  updateSignal: (signalId: string, data: any) => api.put(`/signals/${signalId}`, data),
  closeSignal: (signalId: string, data: { exitPrice: number }) => api.post(`/signals/${signalId}/close`, data),
  deleteSignal: (signalId: string) => api.delete(`/signals/${signalId}`),

  // Subscriptions
  getMySubscriptions: () => api.get('/signals/my-subscriptions'),
  subscribeToSignal: (signalId: string, data: { autoCopy?: boolean; copyAmount?: number }) =>
    api.post(`/signals/${signalId}/subscribe`, data),
  unsubscribeFromSignal: (signalId: string) => api.delete(`/signals/${signalId}/subscribe`),
  updateSubscription: (signalId: string, data: { autoCopy: boolean; copyAmount?: number }) =>
    api.put(`/signals/${signalId}/subscribe`, data),

  // Stats
  getGlobalStats: (days?: number) => api.get('/signals/stats', { params: { days } }),
  getProviderPerformance: (userId: string, days?: number) =>
    api.get(`/signals/provider/${userId}/performance`, { params: { days } }),
};

// Settings API
export const settingsAPI = {
  // General settings
  getSettings: () => api.get('/settings'),
  updateSettings: (data: any) => api.put('/settings', data),
  resetSettings: () => api.post('/settings/reset'),

  // Notifications
  getNotificationPreferences: () => api.get('/settings/notifications'),
  updateNotificationPreferences: (data: any) => api.put('/settings/notifications', data),

  // Security
  getSecuritySettings: () => api.get('/settings/security'),
  changePassword: (data: any) => api.post('/settings/security/password', data),
  setup2FA: () => api.post('/settings/security/2fa/setup'),
  enable2FA: (data: any) => api.post('/settings/security/2fa/enable', data),
  disable2FA: (data: any) => api.post('/settings/security/2fa/disable', data),
  getSessions: () => api.get('/settings/security/sessions'),
  logoutAllSessions: () => api.post('/settings/security/logout-all'),
};

// Affiliate API
export const affiliateAPI = {
  // User endpoints
  apply: (data: any) => api.post('/affiliate/apply', data),
  getDetails: () => api.get('/affiliate/details'),
  getStats: () => api.get('/affiliate/stats'),
  getCommissions: (params?: any) => api.get('/affiliate/commissions', { params }),
  getReferrals: () => api.get('/affiliate/referrals'),
  getReferralStats: () => api.get('/referral/stats'),

  // Analytics
  getAnalytics: (days?: number) => api.get('/affiliate/analytics', { params: { days } }),

  // Payouts
  requestPayout: (data: any) => api.post('/affiliate/payouts/request', data),
  getPayouts: () => api.get('/affiliate/payouts'),

  // Contests
  getContests: () => api.get('/affiliate/contests'),
  getContestLeaderboard: (contestId: string) => api.get(`/affiliate/contests/${contestId}/leaderboard`),

  // Admin endpoints
  adminGetAll: (params?: any) => api.get('/affiliate/admin/all', { params }),
  adminApprove: (affiliateId: string, data?: any) =>
    api.post(`/affiliate/admin/${affiliateId}/approve`, data),
  adminSuspend: (affiliateId: string) => api.post(`/affiliate/admin/${affiliateId}/suspend`),
  adminGetPendingCommissions: (limit?: number) =>
    api.get('/affiliate/admin/commissions/pending', { params: { limit } }),
  adminApproveCommission: (commissionId: string) =>
    api.post(`/affiliate/admin/commissions/${commissionId}/approve`),
  adminPayCommission: (commissionId: string, data?: any) =>
    api.post(`/affiliate/admin/commissions/${commissionId}/pay`, data),
  adminGetDetails: (affiliateId: string) => api.get(`/affiliate/admin/${affiliateId}/details`),

  // Admin - Payouts
  adminGetPendingPayouts: () => api.get('/affiliate/admin/payouts/pending'),
  adminProcessPayout: (payoutId: string, data: any) =>
    api.post(`/affiliate/admin/payouts/${payoutId}/process`, data),

  // Admin - Plans
  adminGetPlans: () => api.get('/affiliate/admin/plans'),
  adminCreatePlan: (data: any) => api.post('/affiliate/admin/plans', data),
  adminUpdatePlan: (planId: string, data: any) => api.put(`/affiliate/admin/plans/${planId}`, data),
  adminDeletePlan: (planId: string) => api.delete(`/affiliate/admin/plans/${planId}`),

  // Admin - Contests
  adminGetContests: () => api.get('/affiliate/admin/contests'),
  adminCreateContest: (data: any) => api.post('/affiliate/admin/contests', data),
  adminUpdateContest: (contestId: string, data: any) =>
    api.put(`/affiliate/admin/contests/${contestId}`, data),
};

// Profile API
export const profileAPI = {
  // User profile
  getProfile: () => api.get('/profile'),
  updateProfile: (data: any) => api.put('/profile', data),

  // KYC
  uploadKYC: (data: any) => api.post('/profile/kyc', data),

  // Security
  changePassword: (data: any) => api.post('/profile/change-password', data),
  getSessions: () => api.get('/profile/sessions'),
  revokeSession: (sessionId: string) => api.delete(`/profile/sessions/${sessionId}`),
  revokeAllSessions: () => api.delete('/profile/sessions'),

  // Activity
  getActivity: (limit?: number) => api.get('/profile/activity', { params: { limit } }),

  // Notifications
  updateNotifications: (preferences: any) => api.put('/profile/notifications', { preferences }),

  // Admin endpoints
  adminGetProfile: (userId: string) => api.get(`/profile/admin/${userId}`),
  adminGetPendingKYC: (limit?: number) => api.get('/profile/admin/kyc/pending', { params: { limit } }),
  adminVerifyKYC: (userId: string, data: any) => api.post(`/profile/admin/kyc/${userId}/verify`, data),
  adminUpdateStatus: (userId: string, data: any) => api.put(`/profile/admin/${userId}/status`, data),
  adminAdjustBalance: (userId: string, data: any) => api.post(`/profile/admin/${userId}/adjust-balance`, data),
};

// Admin API
export const adminAPI = {
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  updateUserStatus: (userId: string, data: any) => api.put(`/admin/users/${userId}/status`, data),
  adjustBalance: (data: any) => api.post('/admin/users/adjust-balance', data),
  getAllTrades: (params?: any) => api.get('/admin/trades', { params }),
  getPlatformStats: () => api.get('/admin/stats'),
  getPlatformExposure: () => api.get('/admin/trades/exposure'),
  getAffiliates: (params?: any) => api.get('/admin/affiliates', { params }),
  approveAffiliate: (affiliateId: string, data: any) => api.post(`/admin/affiliates/${affiliateId}/approve`, data),
  getCopyTraders: (params?: any) => api.get('/admin/copy-traders/pending'),
  approveCopyTrader: (traderId: string) => api.post(`/admin/copy-traders/${traderId}/approve`),
};

export default api;
