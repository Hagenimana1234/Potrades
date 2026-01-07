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

// Wallet API
export const walletAPI = {
  getWallets: () => api.get('/wallet'),
  getTransactions: (params?: any) => api.get('/wallet/transactions', { params }),
};

// Copy Trading API
export const copyTradingAPI = {
  getTraders: (params?: any) => api.get('/copy-trading/traders', { params }),
  apply: (data: any) => api.post('/copy-trading/apply', data),
  follow: (traderId: string, data: any) => api.post(`/copy-trading/follow/${traderId}`, data),
  unfollow: (traderId: string) => api.delete(`/copy-trading/follow/${traderId}`),
  getMyRelationships: () => api.get('/copy-trading/my-relationships'),
};

// Affiliate API
export const affiliateAPI = {
  apply: (data: any) => api.post('/affiliate/apply', data),
  getStats: () => api.get('/affiliate/stats'),
  getCommissions: (params?: any) => api.get('/affiliate/commissions', { params }),
  getReferralStats: () => api.get('/referral/stats'),
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
