import prisma from '../utils/database';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger';

/**
 * PRICE ORCHESTRATION LAYER (POL)
 *
 * CRITICAL COMPONENT - Core Philosophy of the Platform
 *
 * This platform does NOT pass external prices directly to users.
 * All prices are synthetic and generated internally.
 *
 * Real market data (Binance / Twelve Data) is used ONLY as a SEED.
 * Final prices shown to users and used for settlement are generated here.
 *
 * Formula: P_display = P_seed + Spread + Bias + GaussianNoise
 *
 * Responsibilities:
 * - Spread control (per asset)
 * - Trend bias injection (time-based)
 * - Slippage & execution smoothing
 * - Risk-based skewing
 * - Liquidity simulation (anti-freeze)
 * - Micro-price movements using Brownian Motion
 * - Admins can subtly influence trend direction without obvious manipulation
 */

interface SyntheticPriceParams {
  assetId: string;
  seedPrice: number;
  timestamp?: Date;
  platformExposure?: number; // Net platform exposure (positive = more longs, negative = more shorts)
}

interface PriceConfig {
  spreadPercent: number;
  slippagePercent: number;
  priceAdjustment: number;
  executionDelayMs: number;
}

class PriceOrchestrationService {
  // Cache for price configs to avoid DB hits on every price generation
  private configCache: Map<string, PriceConfig> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute

  /**
   * Generate synthetic price from seed price
   * This is the CORE method of the entire platform
   */
  async generateSyntheticPrice(params: SyntheticPriceParams): Promise<number> {
    const { assetId, seedPrice, timestamp = new Date(), platformExposure = 0 } = params;

    // Get pricing configuration for asset
    const config = await this.getPricingConfig(assetId);

    // 1. BASE SPREAD
    const spreadAmount = seedPrice * (config.spreadPercent / 100);

    // 2. TREND BIAS INJECTION (time-based)
    const bias = this.calculateTrendBias(timestamp);

    // 3. GAUSSIAN NOISE (randomization)
    const gaussianNoise = this.generateGaussianNoise(seedPrice, 0.0001); // 0.01% volatility

    // 4. BROWNIAN MOTION (micro-movements for liquidity simulation)
    const brownianMotion = this.generateBrownianMotion(seedPrice, 0.00005); // 0.005% micro-movement

    // 5. RISK-BASED SKEWING
    // If platform has too much exposure in one direction, skew price against it
    const riskSkew = this.calculateRiskSkew(platformExposure, seedPrice);

    // 6. PRICE ADJUSTMENT (admin-controlled markup/discount)
    const adminAdjustment = seedPrice * (config.priceAdjustment / 100);

    // 7. SLIPPAGE SIMULATION
    const slippage = this.calculateSlippage(seedPrice, config.slippagePercent);

    // FINAL SYNTHETIC PRICE
    let syntheticPrice =
      seedPrice +
      spreadAmount +
      bias +
      gaussianNoise +
      brownianMotion +
      riskSkew +
      adminAdjustment +
      slippage;

    // Ensure price doesn't deviate too much from seed (safety check)
    const maxDeviation = seedPrice * 0.05; // 5% max deviation
    if (Math.abs(syntheticPrice - seedPrice) > maxDeviation) {
      syntheticPrice = seedPrice + (syntheticPrice > seedPrice ? maxDeviation : -maxDeviation);
      logger.warn(
        `Synthetic price deviation capped for asset ${assetId}: ${syntheticPrice} vs seed ${seedPrice}`
      );
    }

    // Round to appropriate decimal places
    syntheticPrice = this.roundPrice(syntheticPrice);

    return syntheticPrice;
  }

  /**
   * Get pricing configuration for an asset
   */
  private async getPricingConfig(assetId: string): Promise<PriceConfig> {
    // Check cache first
    const cachedConfig = this.configCache.get(assetId);
    const cacheTime = this.cacheExpiry.get(assetId) || 0;

    if (cachedConfig && Date.now() < cacheTime) {
      return cachedConfig;
    }

    // Fetch from database
    let otcConfig = await prisma.oTCPricingConfig.findUnique({
      where: { assetId },
    });

    // If no config exists, create default
    if (!otcConfig) {
      otcConfig = await prisma.oTCPricingConfig.create({
        data: {
          assetId,
          spreadPercent: new Prisma.Decimal(0.1), // 0.1% default spread
          slippagePercent: new Prisma.Decimal(0.05), // 0.05% slippage
          priceAdjustment: new Prisma.Decimal(0), // No adjustment by default
          executionDelayMs: 0,
          isActive: true,
        },
      });
    }

    const config: PriceConfig = {
      spreadPercent: otcConfig.spreadPercent.toNumber(),
      slippagePercent: otcConfig.slippagePercent.toNumber(),
      priceAdjustment: otcConfig.priceAdjustment.toNumber(),
      executionDelayMs: otcConfig.executionDelayMs,
    };

    // Cache it
    this.configCache.set(assetId, config);
    this.cacheExpiry.set(assetId, Date.now() + this.CACHE_TTL);

    return config;
  }

  /**
   * Calculate trend bias based on time of day
   * Can be used to create artificial "market conditions"
   */
  private calculateTrendBias(timestamp: Date): number {
    const hour = timestamp.getHours();

    // Example: slight upward bias during "market open" hours (9-16)
    // This can be made more sophisticated with admin controls
    if (hour >= 9 && hour <= 16) {
      return Math.random() * 0.00001; // Tiny positive bias
    } else if (hour >= 0 && hour <= 6) {
      return -Math.random() * 0.00001; // Tiny negative bias
    }

    return 0; // Neutral bias otherwise
  }

  /**
   * Generate Gaussian (normal) noise
   * Uses Box-Muller transformation
   */
  private generateGaussianNoise(price: number, volatility: number): number {
    const u1 = Math.random();
    const u2 = Math.random();

    // Box-Muller transformation
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    return price * volatility * z0;
  }

  /**
   * Generate Brownian motion for micro-price movements
   * Simulates liquidity and creates organic-looking price action
   */
  private generateBrownianMotion(price: number, scale: number): number {
    const randomWalk = Math.random() - 0.5; // -0.5 to 0.5
    return price * scale * randomWalk;
  }

  /**
   * Calculate risk-based skewing
   * If platform has too much exposure in one direction, nudge price against it
   * This is a B-Book broker risk management technique
   */
  private calculateRiskSkew(platformExposure: number, price: number): number {
    if (platformExposure === 0) return 0;

    // If exposure is positive (more long positions), nudge price slightly down
    // If exposure is negative (more short positions), nudge price slightly up
    // This reduces platform risk

    const maxSkewPercent = 0.0002; // 0.02% max skew
    const skewFactor = Math.tanh(platformExposure / 1000); // Sigmoid-like scaling

    return -price * maxSkewPercent * skewFactor;
  }

  /**
   * Calculate slippage
   * Simulates execution delay and market impact
   */
  private calculateSlippage(price: number, slippagePercent: number): number {
    // Random slippage within the configured range
    const randomFactor = Math.random(); // 0 to 1
    return price * (slippagePercent / 100) * randomFactor * (Math.random() > 0.5 ? 1 : -1);
  }

  /**
   * Round price to appropriate decimal places
   */
  private roundPrice(price: number): number {
    // For prices > 1000, round to 2 decimals
    // For prices > 1, round to 4 decimals
    // For prices < 1, round to 8 decimals
    if (price >= 1000) {
      return Math.round(price * 100) / 100;
    } else if (price >= 1) {
      return Math.round(price * 10000) / 10000;
    } else {
      return Math.round(price * 100000000) / 100000000;
    }
  }

  /**
   * Generate bid and ask prices from seed price
   * Used for displaying market depth
   */
  async generateBidAskPrices(
    assetId: string,
    seedPrice: number
  ): Promise<{ bid: number; ask: number; mid: number }> {
    const config = await this.getPricingConfig(assetId);

    const spreadAmount = seedPrice * (config.spreadPercent / 100);
    const halfSpread = spreadAmount / 2;

    const mid = seedPrice;
    const bid = this.roundPrice(mid - halfSpread);
    const ask = this.roundPrice(mid + halfSpread);

    return { bid, ask, mid };
  }

  /**
   * Calculate platform exposure for an asset
   * Used for risk-based skewing
   */
  async calculatePlatformExposure(assetId: string): Promise<number> {
    const openTrades = await prisma.trade.findMany({
      where: {
        assetId,
        status: 'OPEN',
      },
      select: {
        direction: true,
        amount: true,
      },
    });

    let exposure = 0;

    openTrades.forEach((trade) => {
      const tradeAmount = trade.amount.toNumber();
      if (trade.direction === 'UP') {
        exposure += tradeAmount; // Long positions add to exposure
      } else {
        exposure -= tradeAmount; // Short positions subtract from exposure
      }
    });

    return exposure;
  }

  /**
   * Update pricing configuration for an asset
   * Admin function to control spread, slippage, adjustment
   */
  async updatePricingConfig(
    assetId: string,
    updates: {
      spreadPercent?: number;
      slippagePercent?: number;
      priceAdjustment?: number;
      executionDelayMs?: number;
      maxExposure?: number;
    }
  ) {
    const config = await prisma.oTCPricingConfig.upsert({
      where: { assetId },
      create: {
        assetId,
        spreadPercent: new Prisma.Decimal(updates.spreadPercent || 0.1),
        slippagePercent: new Prisma.Decimal(updates.slippagePercent || 0.05),
        priceAdjustment: new Prisma.Decimal(updates.priceAdjustment || 0),
        executionDelayMs: updates.executionDelayMs || 0,
        maxExposure: updates.maxExposure ? new Prisma.Decimal(updates.maxExposure) : null,
        isActive: true,
      },
      update: {
        ...(updates.spreadPercent !== undefined && { spreadPercent: new Prisma.Decimal(updates.spreadPercent) }),
        ...(updates.slippagePercent !== undefined && {
          slippagePercent: new Prisma.Decimal(updates.slippagePercent),
        }),
        ...(updates.priceAdjustment !== undefined && {
          priceAdjustment: new Prisma.Decimal(updates.priceAdjustment),
        }),
        ...(updates.executionDelayMs !== undefined && { executionDelayMs: updates.executionDelayMs }),
        ...(updates.maxExposure !== undefined && {
          maxExposure: updates.maxExposure ? new Prisma.Decimal(updates.maxExposure) : null,
        }),
      },
    });

    // Invalidate cache
    this.configCache.delete(assetId);
    this.cacheExpiry.delete(assetId);

    logger.info(`Pricing config updated for asset ${assetId}`);

    return config;
  }

  /**
   * Get all pricing configurations
   * Admin function
   */
  async getAllPricingConfigs() {
    const configs = await prisma.oTCPricingConfig.findMany({
      include: {
        asset: {
          select: {
            symbol: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return configs;
  }

  /**
   * Clear cache
   * Useful when configs are updated externally
   */
  clearCache() {
    this.configCache.clear();
    this.cacheExpiry.clear();
    logger.info('Price orchestration cache cleared');
  }
}

export const priceOrchestrationService = new PriceOrchestrationService();
