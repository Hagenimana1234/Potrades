import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  referralCode: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  twoFactorCode: z.string().length(6).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Trading schemas
export const placeTradeSchema = z.object({
  assetId: z.string().cuid(),
  direction: z.enum(['UP', 'DOWN']),
  amount: z.number().positive('Amount must be positive'),
  expirySeconds: z.number().int().positive().min(5).max(3600),
  walletType: z.enum(['DEMO', 'REAL']).default('DEMO'),
});

// Wallet schemas
export const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CREDIT_CARD', 'BANK_TRANSFER', 'CRYPTO', 'E_WALLET', 'OTHER']),
  currency: z.string().default('USD'),
});

export const withdrawalSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum(['CREDIT_CARD', 'BANK_TRANSFER', 'CRYPTO', 'E_WALLET', 'OTHER']),
  destination: z.object({
    type: z.string(),
    address: z.string(),
    details: z.any().optional(),
  }),
});

// Copy trading schemas
export const createCopyTraderSchema = z.object({
  minCopyAmount: z.number().positive(),
  maxCopyAmount: z.number().positive(),
  profitSharePercent: z.number().min(0).max(50),
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
});

export const followTraderSchema = z.object({
  masterTraderId: z.string().cuid(),
  copyMode: z.enum(['FIXED', 'PERCENT']).default('FIXED'),
  copyAmount: z.number().positive().optional(),
  copyPercent: z.number().min(1).max(100).optional(),
  maxDailyLoss: z.number().positive().optional(),
});

// Admin schemas
export const updateUserStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION']),
  reason: z.string().optional(),
});

export const adjustBalanceSchema = z.object({
  userId: z.string().cuid(),
  walletType: z.enum(['DEMO', 'REAL']),
  amount: z.number(),
  reason: z.string().min(1),
});

export const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  payoutPercent: z.number().min(0).max(100).optional(),
  minTradeAmount: z.number().positive().optional(),
  maxTradeAmount: z.number().positive().optional(),
});

// Helper function
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
