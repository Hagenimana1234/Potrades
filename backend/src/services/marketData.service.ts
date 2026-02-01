import prisma from '../utils/database';
import logger from '../utils/logger';
import { EventEmitter } from 'events';
import { Decimal } from 'decimal.js';
import axios from 'axios';
import WebSocket from 'ws';
import { priceOrchestrationService } from './priceOrchestration.service';

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

  // External API configuration
  private readonly BINANCE_BASE_URL = 'https://api.binance.com/api/v3';
  private readonly BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
  private readonly TWELVEDATA_BASE_URL = 'https://api.twelvedata.com';
  private readonly TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY || '';

  // Rate limiting for external APIs
  private lastBinanceRequest = 0;
  private lastTwelveDataRequest = 0;
  private readonly BINANCE_RATE_LIMIT = 100; // ms
  private readonly TWELVEDATA_RATE_LIMIT = 1000; // ms

  // Seed price cache
  private seedPriceCache: Map<string, { price: number; timestamp: number }> = new Map();

  // WebSocket connections for real-time data
  private binanceWebSockets: Map<string, WebSocket> = new Map();
  private wsReconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly WS_RECONNECT_DELAY = 5000; // 5 seconds
  private readonly WS_PING_INTERVAL = 30000; // 30 seconds

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

    // Connect to Binance WebSocket for live prices (crypto only)
    if (asset.type === 'CRYPTO') {
      this.connectBinanceWebSocket(asset.symbol, assetId);
    }

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
      this.disconnectBinanceWebSocket(assetId);
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
   * Generate next price using POL with real market data as seed
   * This is the integration point between external data and POL
   */
  private async generateNextPrice(
    assetId: string,
    symbol: string,
    currentPrice: number
  ): Promise<number> {
    try {
      // Get asset details to determine type
      const asset = await prisma.asset.findUnique({
        where: { id: assetId },
        select: { type: true },
      });

      if (!asset) {
        throw new Error(`Asset ${assetId} not found`);
      }

      // Get seed price from external source
      let seedPrice = await this.getSeedPrice(symbol, asset.type);

      // If seed price unavailable, use simulated price
      if (!seedPrice) {
        seedPrice = await this.generateSimulatedSeedPrice(symbol, currentPrice);
      }

      // Calculate platform exposure for risk-based skewing
      const platformExposure = await priceOrchestrationService.calculatePlatformExposure(assetId);

      // Generate synthetic price through POL
      const syntheticPrice = await priceOrchestrationService.generateSyntheticPrice({
        assetId,
        seedPrice,
        timestamp: new Date(),
        platformExposure,
      });

      return syntheticPrice;
    } catch (error: any) {
      logger.error(`Error generating price for ${symbol}: ${error.message}`);
      // Fallback to simulated price
      return this.generateSimulatedSeedPrice(symbol, currentPrice);
    }
  }

  /**
   * Get seed price from external market data sources
   * CRITICAL: This is where real Binance/Twelve Data integration happens
   */
  private async getSeedPrice(symbol: string, assetType: string): Promise<number | null> {
    // Check cache first (5 second TTL to reduce API calls)
    const cacheKey = `seed:${symbol}`;
    const cached = this.seedPriceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 5000) {
      return cached.price;
    }

    let seedPrice: number | null = null;

    try {
      if (assetType === 'CRYPTO') {
        seedPrice = await this.getBinanceSeedPrice(symbol);
      } else if (assetType === 'FOREX') {
        seedPrice = await this.getTwelveDataSeedPrice(symbol);
      }

      if (seedPrice) {
        this.seedPriceCache.set(cacheKey, {
          price: seedPrice,
          timestamp: Date.now(),
        });
      }

      return seedPrice;
    } catch (error: any) {
      logger.error(`Failed to get seed price for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get seed price from Binance for crypto assets
   */
  private async getBinanceSeedPrice(symbol: string): Promise<number | null> {
    try {
      await this.rateLimitBinance();

      // Convert symbol format: BTC/USD -> BTCUSDT
      const binanceSymbol = symbol.replace('/', '') + 'T';

      const response = await axios.get(`${this.BINANCE_BASE_URL}/ticker/price`, {
        params: { symbol: binanceSymbol },
        timeout: 3000,
      });

      return parseFloat(response.data.price);
    } catch (error: any) {
      // Try alternative format
      try {
        const altSymbol = symbol.replace('/', '');
        const response = await axios.get(`${this.BINANCE_BASE_URL}/ticker/price`, {
          params: { symbol: altSymbol },
          timeout: 3000,
        });
        return parseFloat(response.data.price);
      } catch {
        logger.warn(`Binance price unavailable for ${symbol}`);
        return null;
      }
    }
  }

  /**
   * Get seed price from Twelve Data for forex assets
   */
  private async getTwelveDataSeedPrice(symbol: string): Promise<number | null> {
    if (!this.TWELVEDATA_API_KEY) {
      logger.warn('Twelve Data API key not configured');
      return null;
    }

    try {
      await this.rateLimitTwelveData();

      const response = await axios.get(`${this.TWELVEDATA_BASE_URL}/price`, {
        params: {
          symbol: symbol.replace('/', ''),
          apikey: this.TWELVEDATA_API_KEY,
        },
        timeout: 3000,
      });

      return parseFloat(response.data.price);
    } catch (error: any) {
      logger.warn(`Twelve Data price unavailable for ${symbol}`);
      return null;
    }
  }

  /**
   * Generate simulated seed price when external APIs are unavailable
   * Uses realistic random walk
   */
  private async generateSimulatedSeedPrice(symbol: string, currentPrice: number): Promise<number> {
    const volatility = this.getVolatilityForSymbol(symbol);
    const randomChange = (Math.random() - 0.5) * 2;
    const changePercent = randomChange * volatility;

    const priceDecimal = new Decimal(currentPrice);
    const change = priceDecimal.times(changePercent).dividedBy(100);
    const newPrice = priceDecimal.plus(change);

    return Math.max(newPrice.toNumber(), 0.01);
  }

  /**
   * Rate limiting for Binance
   */
  private async rateLimitBinance(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastBinanceRequest;
    if (elapsed < this.BINANCE_RATE_LIMIT) {
      await new Promise((resolve) => setTimeout(resolve, this.BINANCE_RATE_LIMIT - elapsed));
    }
    this.lastBinanceRequest = Date.now();
  }

  /**
   * Rate limiting for Twelve Data
   */
  private async rateLimitTwelveData(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastTwelveDataRequest;
    if (elapsed < this.TWELVEDATA_RATE_LIMIT) {
      await new Promise((resolve) => setTimeout(resolve, this.TWELVEDATA_RATE_LIMIT - elapsed));
    }
    this.lastTwelveDataRequest = Date.now();
  }

  /**
   * ==================== BINANCE WEBSOCKET FOR LIVE PRICES ====================
   * Real-time price streaming from Binance for crypto assets
   */

  /**
   * Connect to Binance WebSocket for a crypto symbol
   */
  private connectBinanceWebSocket(symbol: string, assetId: string): void {
    // Convert symbol format: BTC/USD -> btcusdt@trade
    const binanceSymbol = symbol.replace('/', '').toLowerCase() + 't@trade';
    const wsUrl = `${this.BINANCE_WS_URL}/${binanceSymbol}`;

    logger.info(`Connecting to Binance WebSocket for ${symbol}`);

    const ws = new WebSocket(wsUrl);

    ws.on('open', () => {
      logger.info(`Binance WebSocket connected: ${symbol}`);

      // Set up ping/pong to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, this.WS_PING_INTERVAL);
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Binance trade stream format: { p: "price", q: "quantity", ... }
        if (message.p) {
          const price = parseFloat(message.p);

          // Update seed price cache
          const cacheKey = `seed:${symbol}`;
          this.seedPriceCache.set(cacheKey, {
            price,
            timestamp: Date.now(),
          });

          logger.debug(`Binance WebSocket price update: ${symbol} = ${price}`);
        }
      } catch (error) {
        logger.error(`Error parsing Binance WebSocket message for ${symbol}:`, error);
      }
    });

    ws.on('error', (error) => {
      logger.error(`Binance WebSocket error for ${symbol}:`, error);
    });

    ws.on('close', () => {
      logger.warn(`Binance WebSocket closed for ${symbol}, scheduling reconnect...`);
      this.scheduleWebSocketReconnect(symbol, assetId);
    });

    this.binanceWebSockets.set(assetId, ws);
  }

  /**
   * Schedule WebSocket reconnection with exponential backoff
   */
  private scheduleWebSocketReconnect(symbol: string, assetId: string): void {
    // Clear existing timeout if any
    const existingTimeout = this.wsReconnectTimeouts.get(assetId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Schedule reconnect
    const timeout = setTimeout(() => {
      logger.info(`Reconnecting Binance WebSocket for ${symbol}`);
      this.connectBinanceWebSocket(symbol, assetId);
      this.wsReconnectTimeouts.delete(assetId);
    }, this.WS_RECONNECT_DELAY);

    this.wsReconnectTimeouts.set(assetId, timeout);
  }

  /**
   * Disconnect Binance WebSocket for an asset
   */
  private disconnectBinanceWebSocket(assetId: string): void {
    const ws = this.binanceWebSockets.get(assetId);
    if (ws) {
      ws.close();
      this.binanceWebSockets.delete(assetId);
    }

    const timeout = this.wsReconnectTimeouts.get(assetId);
    if (timeout) {
      clearTimeout(timeout);
      this.wsReconnectTimeouts.delete(assetId);
    }
  }

  /**
   * ==================== SYNTHETIC PRICE TRANSFORMATION ====================
   * Apply POL spread to external historical candles
   * CRITICAL: Maintains core philosophy - no raw external prices to users
   */

  /**
   * Apply synthetic spread to historical candles from external APIs
   * Uses the asset's configured spread from OTC pricing config
   */
  private async applySyntheticSpread(assetId: string, candles: Candle[]): Promise<Candle[]> {
    try {
      // Get the asset's OTC pricing configuration
      const pricingConfig = await prisma.oTCPricingConfig.findUnique({
        where: { assetId },
      });

      if (!pricingConfig) {
        logger.warn(`No pricing config for asset ${assetId}, using default spread`);
        // Apply default 0.1% spread if no config
        return this.applySpreadToCandles(candles, 0.1);
      }

      const spreadPercent = pricingConfig.spreadPercent.toNumber();
      logger.debug(`Applying ${spreadPercent}% spread to historical candles`);

      return this.applySpreadToCandles(candles, spreadPercent);
    } catch (error: any) {
      logger.error(`Error applying synthetic spread: ${error.message}`);
      // Return candles with minimal spread rather than raw
      return this.applySpreadToCandles(candles, 0.1);
    }
  }

  /**
   * Apply spread percentage to all OHLC values in candles
   */
  private applySpreadToCandles(candles: Candle[], spreadPercent: number): Candle[] {
    const spreadMultiplier = 1 + spreadPercent / 100;

    return candles.map((candle) => ({
      timestamp: candle.timestamp,
      open: candle.open * spreadMultiplier,
      high: candle.high * spreadMultiplier,
      low: candle.low * spreadMultiplier,
      close: candle.close * spreadMultiplier,
      volume: candle.volume,
    }));
  }

  /**
   * ==================== HISTORICAL CANDLES FROM EXTERNAL APIS ====================
   * Fetch historical candles from Binance (crypto) and Twelve Data (forex)
   */

  /**
   * Get historical candles from Binance for crypto assets
   */
  private async getBinanceHistoricalCandles(
    symbol: string,
    interval: string = '1m',
    limit: number = 100
  ): Promise<Candle[]> {
    try {
      await this.rateLimitBinance();

      // Convert symbol format: BTC/USD -> BTCUSDT
      const binanceSymbol = symbol.replace('/', '') + 'T';

      const response = await axios.get(`${this.BINANCE_BASE_URL}/klines`, {
        params: {
          symbol: binanceSymbol,
          interval, // 1m, 5m, 15m, 1h, 4h, 1d
          limit,
        },
        timeout: 5000,
      });

      // Binance klines format: [timestamp, open, high, low, close, volume, ...]
      const candles: Candle[] = response.data.map((kline: any[]) => ({
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));

      logger.debug(`Fetched ${candles.length} historical candles from Binance for ${symbol}`);
      return candles;
    } catch (error: any) {
      logger.error(`Failed to fetch Binance historical candles for ${symbol}:`, error.message);
      return [];
    }
  }

  /**
   * Get historical candles from Twelve Data for forex assets
   */
  private async getTwelveDataHistoricalCandles(
    symbol: string,
    interval: string = '1min',
    limit: number = 100
  ): Promise<Candle[]> {
    if (!this.TWELVEDATA_API_KEY) {
      logger.warn('Twelve Data API key not configured');
      return [];
    }

    try {
      await this.rateLimitTwelveData();

      const response = await axios.get(`${this.TWELVEDATA_BASE_URL}/time_series`, {
        params: {
          symbol: symbol.replace('/', ''),
          interval, // 1min, 5min, 15min, 1h, 4h, 1day
          outputsize: limit,
          apikey: this.TWELVEDATA_API_KEY,
        },
        timeout: 5000,
      });

      if (!response.data.values || response.data.values.length === 0) {
        logger.warn(`No historical data from Twelve Data for ${symbol}`);
        return [];
      }

      // Twelve Data format: { datetime, open, high, low, close, volume }
      const candles: Candle[] = response.data.values.map((item: any) => ({
        timestamp: new Date(item.datetime),
        open: parseFloat(item.open),
        high: parseFloat(item.high),
        low: parseFloat(item.low),
        close: parseFloat(item.close),
        volume: parseFloat(item.volume || '0'),
      }));

      logger.debug(`Fetched ${candles.length} historical candles from Twelve Data for ${symbol}`);
      return candles.reverse(); // Twelve Data returns newest first, reverse to oldest first
    } catch (error: any) {
      logger.error(`Failed to fetch Twelve Data historical candles for ${symbol}:`, error.message);
      return [];
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
   * Returns the latest synthetic price generated through POL
   */
  async getCurrentPrice(assetId: string): Promise<number | null> {
    // Check memory first
    if (this.currentPrices.has(assetId)) {
      return this.currentPrices.get(assetId)!;
    }

    // Get from database
    const priceRecord = await prisma.price.findFirst({
      where: { assetId },
      orderBy: { timestamp: 'desc' },
    });

    if (priceRecord) {
      const price = priceRecord.price.toNumber();
      return price;
    }

    return null;
  }

  /**
   * Get price history (candles)
   * Attempts to fetch from external APIs first, falls back to database
   */
  async getPriceHistory(
    assetId: string,
    interval: string = '1m',
    limit: number = 100
  ): Promise<Candle[]> {
    // Get asset to determine type
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { symbol: true, type: true },
    });

    if (!asset) {
      logger.warn(`Asset ${assetId} not found`);
      return [];
    }

    let candles: Candle[] = [];

    // Try to fetch from external APIs first
    if (asset.type === 'CRYPTO') {
      candles = await this.getBinanceHistoricalCandles(asset.symbol, interval, limit);
    } else if (asset.type === 'FOREX') {
      // Convert interval format: 1m -> 1min for Twelve Data
      const tdInterval = interval.replace('m', 'min').replace('h', 'h').replace('d', 'day');
      candles = await this.getTwelveDataHistoricalCandles(asset.symbol, tdInterval, limit);
    }

    // If external API returned data, apply synthetic spread before returning
    if (candles.length > 0) {
      logger.debug(`Applying synthetic spread to ${candles.length} external candles for ${asset.symbol}`);
      const syntheticCandles = await this.applySyntheticSpread(assetId, candles);
      return syntheticCandles;
    }

    // Fallback: Generate from database prices
    logger.debug(`Falling back to database prices for ${asset.symbol}`);

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
    candles = [];

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
