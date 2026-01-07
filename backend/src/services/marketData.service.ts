import prisma from '../utils/database';
import logger from '../utils/logger';
import { cache } from '../utils/redis';
import { EventEmitter } from 'events';
import { Decimal } from 'decimal.js';

export interface PriceUpdate {
  assetId: string;
  symbol: string;
  price: number;
  timestamp: Date;
  change24h?: number;
  changePercent24h?: number;
}

export interface Candle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class MarketDataService extends EventEmitter {
  private priceIntervals: Map<string, NodeJS.Timeout> = new Map();
  private currentPrices: Map<string, number> = new Map();
  private readonly PRICE_UPDATE_INTERVAL = 1000; // 1 second
  private readonly CACHE_TTL = 60; // 1 minute

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners
  }

  /**
   * Start price streaming for an asset
   */
  async startPriceStream(assetId: string) {
    if (this.priceIntervals.has(assetId)) {
      return; // Already streaming
    }

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new Error('Asset not found');
    }

    logger.info(`Starting price stream for ${asset.symbol}`);

    // Get or generate initial price
    let currentPrice = await this.getCurrentPrice(assetId);
    if (!currentPrice) {
      currentPrice = await this.generateInitialPrice(asset.symbol);
    }

    this.currentPrices.set(assetId, currentPrice);

    // Start price updates
    const interval = setInterval(async () => {
      try {
        const newPrice = await this.generateNextPrice(assetId, asset.symbol, currentPrice);
        this.currentPrices.set(assetId, newPrice);

        // Save to database
        await this.savePriceToDatabase(assetId, newPrice);

        // Emit price update event
        const priceUpdate: PriceUpdate = {
          assetId,
          symbol: asset.symbol,
          price: newPrice,
          timestamp: new Date(),
        };

        this.emit('price:update', priceUpdate);
        this.emit(`price:update:${assetId}`, priceUpdate);

        currentPrice = newPrice;
      } catch (error) {
        logger.error(`Error updating price for ${asset.symbol}:`, error);
      }
    }, this.PRICE_UPDATE_INTERVAL);

    this.priceIntervals.set(assetId, interval);
  }

  /**
   * Stop price streaming for an asset
   */
  stopPriceStream(assetId: string) {
    const interval = this.priceIntervals.get(assetId);
    if (interval) {
      clearInterval(interval);
      this.priceIntervals.delete(assetId);
      this.currentPrices.delete(assetId);
      logger.info(`Stopped price stream for asset ${assetId}`);
    }
  }

  /**
   * Stop all price streams
   */
  stopAllPriceStreams() {
    for (const [assetId, interval] of this.priceIntervals) {
      clearInterval(interval);
      this.priceIntervals.delete(assetId);
      this.currentPrices.delete(assetId);
    }
    logger.info('Stopped all price streams');
  }

  /**
   * Generate initial price for an asset (for demo/OTC)
   */
  private async generateInitialPrice(symbol: string): Promise<number> {
    // Define base prices for common assets
    const basePrices: Record<string, number> = {
      'BTC/USD': 42000,
      'ETH/USD': 2200,
      'EUR/USD': 1.08,
      'GBP/USD': 1.27,
      'USD/JPY': 148.5,
      'XAU/USD': 2050, // Gold
      'OIL/USD': 75,
      'SPX/USD': 4500, // S&P 500
    };

    const basePrice = basePrices[symbol] || 100;

    // Add some randomness (±2%)
    const variance = basePrice * 0.02;
    const price = basePrice + (Math.random() - 0.5) * variance;

    return Math.round(price * 100) / 100;
  }

  /**
   * Generate next price based on random walk with realistic volatility
   */
  private async generateNextPrice(
    assetId: string,
    symbol: string,
    currentPrice: number
  ): Promise<number> {
    // Volatility parameters by asset type
    const volatility = this.getVolatilityForSymbol(symbol);

    // Random walk with mean reversion
    const randomChange = (Math.random() - 0.5) * 2; // -1 to 1
    const changePercent = randomChange * volatility;

    // Apply change
    const priceDecimal = new Decimal(currentPrice);
    const change = priceDecimal.times(changePercent).dividedBy(100);
    const newPrice = priceDecimal.plus(change);

    // Ensure price is positive and round appropriately
    const finalPrice = Math.max(newPrice.toNumber(), 0.01);

    // Round based on price magnitude
    if (finalPrice > 1000) {
      return Math.round(finalPrice * 100) / 100; // 2 decimals
    } else if (finalPrice > 1) {
      return Math.round(finalPrice * 10000) / 10000; // 4 decimals
    } else {
      return Math.round(finalPrice * 100000) / 100000; // 5 decimals
    }
  }

  /**
   * Get volatility parameter for asset
   */
  private getVolatilityForSymbol(symbol: string): number {
    // Annualized volatility percentage
    const volatilities: Record<string, number> = {
      'BTC/USD': 0.15, // High volatility
      'ETH/USD': 0.15,
      'EUR/USD': 0.02, // Low volatility
      'GBP/USD': 0.03,
      'USD/JPY': 0.03,
      'XAU/USD': 0.05, // Medium volatility
      'OIL/USD': 0.08,
      'SPX/USD': 0.04,
    };

    return volatilities[symbol] || 0.05;
  }

  /**
   * Save price to database
   */
  private async savePriceToDatabase(assetId: string, price: number) {
    try {
      await prisma.price.create({
        data: {
          assetId,
          price,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error saving price to database:', error);
    }
  }

  /**
   * Get current price (from memory or database)
   */
  async getCurrentPrice(assetId: string): Promise<number | null> {
    // Check memory first
    if (this.currentPrices.has(assetId)) {
      return this.currentPrices.get(assetId)!;
    }

    // Check cache
    const cached = await cache.get<number>(`price:${assetId}`);
    if (cached) {
      return cached;
    }

    // Get from database
    const priceRecord = await prisma.price.findFirst({
      where: { assetId },
      orderBy: { timestamp: 'desc' },
    });

    if (priceRecord) {
      const price = priceRecord.price.toNumber();
      await cache.set(`price:${assetId}`, price, this.CACHE_TTL);
      return price;
    }

    return null;
  }

  /**
   * Get price history (candles)
   */
  async getPriceHistory(
    assetId: string,
    interval: string = '1m',
    limit: number = 100
  ): Promise<Candle[]> {
    // Get raw price data
    const prices = await prisma.price.findMany({
      where: { assetId },
      orderBy: { timestamp: 'desc' },
      take: limit * 60, // Approximate for 1m intervals
    });

    if (prices.length === 0) {
      return [];
    }

    // Aggregate into candles based on interval
    const intervalMs = this.parseIntervalToMs(interval);
    const candles: Candle[] = [];

    let currentCandle: any = null;
    let candleStartTime: number = 0;

    for (const price of prices.reverse()) {
      const priceTime = price.timestamp.getTime();

      if (!currentCandle || priceTime >= candleStartTime + intervalMs) {
        if (currentCandle) {
          candles.push(currentCandle);
        }

        candleStartTime = Math.floor(priceTime / intervalMs) * intervalMs;

        currentCandle = {
          timestamp: new Date(candleStartTime),
          open: price.price.toNumber(),
          high: price.price.toNumber(),
          low: price.price.toNumber(),
          close: price.price.toNumber(),
          volume: 0,
        };
      } else {
        const priceNum = price.price.toNumber();
        currentCandle.high = Math.max(currentCandle.high, priceNum);
        currentCandle.low = Math.min(currentCandle.low, priceNum);
        currentCandle.close = priceNum;
      }
    }

    if (currentCandle) {
      candles.push(currentCandle);
    }

    return candles.slice(-limit);
  }

  /**
   * Parse interval string to milliseconds
   */
  private parseIntervalToMs(interval: string): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 1000; // Default to 1 minute
    }
  }

  /**
   * Get all active assets
   */
  async getActiveAssets() {
    return prisma.asset.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        symbol: true,
        name: true,
        type: true,
        payoutPercent: true,
        minTradeAmount: true,
        maxTradeAmount: true,
        icon: true,
      },
    });
  }

  /**
   * Start streaming all active assets
   */
  async startAllActiveStreams() {
    const assets = await this.getActiveAssets();

    for (const asset of assets) {
      await this.startPriceStream(asset.id);
    }

    logger.info(`Started price streams for ${assets.length} assets`);
  }

  /**
   * Get asset by symbol
   */
  async getAssetBySymbol(symbol: string) {
    return prisma.asset.findUnique({
      where: { symbol },
    });
  }

  /**
   * Admin: Create or update asset
   */
  async adminUpsertAsset(data: {
    symbol: string;
    name: string;
    type: string;
    isActive?: boolean;
    payoutPercent?: number;
    minTradeAmount?: number;
    maxTradeAmount?: number;
  }) {
    const asset = await prisma.asset.upsert({
      where: { symbol: data.symbol },
      update: {
        name: data.name,
        isActive: data.isActive,
        payoutPercent: data.payoutPercent,
        minTradeAmount: data.minTradeAmount,
        maxTradeAmount: data.maxTradeAmount,
      },
      create: {
        symbol: data.symbol,
        name: data.name,
        type: data.type as any,
        isActive: data.isActive ?? true,
        payoutPercent: data.payoutPercent ?? 80,
        minTradeAmount: data.minTradeAmount ?? 1,
        maxTradeAmount: data.maxTradeAmount ?? 10000,
      },
    });

    logger.info(`Asset upserted: ${asset.symbol}`);

    return asset;
  }
}

export default new MarketDataService();
