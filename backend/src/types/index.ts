import { Request } from 'express';
import { TokenPayload } from '../utils/crypto';

// Extend Express Request to include user
export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

// WebSocket types
export interface WSMessage {
  type: string;
  data: any;
}

export interface PriceUpdate {
  assetId: string;
  symbol: string;
  price: number;
  timestamp: Date;
}

export interface TradeUpdate {
  tradeId: string;
  status: string;
  profit?: number;
  closePrice?: number;
}

// Trading types
export interface TradeParams {
  userId: string;
  assetId: string;
  walletType: 'DEMO' | 'REAL';
  direction: 'UP' | 'DOWN';
  amount: number;
  expirySeconds: number;
  isCopyTrade?: boolean;
  masterTradeId?: string;
}

export interface TradeResult {
  tradeId: string;
  status: string;
  message?: string;
}

export interface SettlementResult {
  tradeId: string;
  won: boolean;
  profit: number;
  closePrice: number;
}

// Market data types
export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataConfig {
  symbol: string;
  interval: string; // 1m, 5m, 15m, etc.
  source: 'binance' | 'internal' | 'otc';
}

// Copy trading types
export interface CopyTradeConfig {
  followerId: string;
  masterTraderId: string;
  copyMode: 'FIXED' | 'PERCENT';
  copyAmount?: number;
  copyPercent?: number;
  maxDailyLoss?: number;
}

// Affiliate types
export interface CommissionCalculation {
  affiliateId: string;
  referredUserId: string;
  type: 'CPA' | 'REVENUE_SHARE';
  amount: number;
  referenceId?: string;
  referenceType?: string;
}

// Admin types
export interface BalanceAdjustment {
  userId: string;
  walletType: 'DEMO' | 'REAL';
  amount: number;
  reason: string;
  adminId: string;
}

export interface RiskMetrics {
  totalExposure: number;
  openTrades: number;
  largestTrade: number;
  totalVolume24h: number;
  winRate: number;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
