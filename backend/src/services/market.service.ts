import { PrismaClient, AssetType, Prisma } from '@prisma/client';
import { NotFoundError, ValidationError } from '../utils/errors';

const prisma = new PrismaClient();

interface GetAssetsFilters {
  type?: AssetType;
  search?: string;
  isActive?: boolean;
  favoritesOnly?: boolean;
  limit?: number;
  offset?: number;
}

class MarketService {
  /**
   * Get all assets with filters and search
   */
  async getAssets(userId: string | null, filters: GetAssetsFilters = {}) {
    const {
      type,
      search,
      isActive = true,
      favoritesOnly = false,
      limit = 100,
      offset = 0,
    } = filters;

    const where: Prisma.AssetWhereInput = {
      isActive,
    };

    // Type filter
    if (type) {
      where.type = type;
    }

    // Search filter (symbol or name)
    if (search) {
      where.OR = [
        { symbol: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Favorites filter
    if (favoritesOnly && userId) {
      where.favorites = {
        some: {
          userId,
        },
      };
    }

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          prices: {
            orderBy: { timestamp: 'desc' },
            take: 1, // Latest price only
          },
          favorites: userId
            ? {
                where: { userId },
                take: 1,
              }
            : false,
          _count: {
            select: {
              trades: true,
            },
          },
        },
        orderBy: [{ order: 'asc' }, { symbol: 'asc' }],
        skip: offset,
        take: limit,
      }),
      prisma.asset.count({ where }),
    ]);

    // Calculate price changes and market status
    const assetsWithMetrics = await Promise.all(
      assets.map(async (asset) => {
        const latestPrice = asset.prices[0];
        const currentPrice = latestPrice?.price || null;

        // Get 24h ago price for price change calculation
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dayAgoPrice = await prisma.price.findFirst({
          where: {
            assetId: asset.id,
            timestamp: { lte: dayAgo },
          },
          orderBy: { timestamp: 'desc' },
        });

        // Calculate 24h change
        let priceChange24h = null;
        let priceChangePercent24h = null;
        if (currentPrice && dayAgoPrice) {
          priceChange24h = Number(currentPrice) - Number(dayAgoPrice.price);
          priceChangePercent24h =
            (priceChange24h / Number(dayAgoPrice.price)) * 100;
        }

        // Determine market status based on trading hours
        const isMarketOpen = this.isMarketOpen(asset);

        return {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          isActive: asset.isActive,
          icon: asset.icon,
          currentPrice,
          priceChange24h,
          priceChangePercent24h,
          isMarketOpen,
          isFavorite: userId ? asset.favorites.length > 0 : false,
          tradeCount: asset._count.trades,
          minTradeAmount: asset.minTradeAmount,
          maxTradeAmount: asset.maxTradeAmount,
          payoutPercent: asset.payoutPercent,
          tradingHours: asset.tradingHours,
        };
      })
    );

    return {
      assets: assetsWithMetrics,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get single asset details
   */
  async getAssetDetails(assetId: string, userId: string | null) {
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        prices: {
          orderBy: { timestamp: 'desc' },
          take: 100, // Last 100 prices for chart
        },
        favorites: userId
          ? {
              where: { userId },
              take: 1,
            }
          : false,
        _count: {
          select: {
            trades: true,
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    const latestPrice = asset.prices[0];
    const currentPrice = latestPrice?.price || null;

    // Get 24h ago price
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dayAgoPrice = await prisma.price.findFirst({
      where: {
        assetId: asset.id,
        timestamp: { lte: dayAgo },
      },
      orderBy: { timestamp: 'desc' },
    });

    let priceChange24h = null;
    let priceChangePercent24h = null;
    if (currentPrice && dayAgoPrice) {
      priceChange24h = Number(currentPrice) - Number(dayAgoPrice.price);
      priceChangePercent24h = (priceChange24h / Number(dayAgoPrice.price)) * 100;
    }

    // Get 7d ago price for weekly change
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoPrice = await prisma.price.findFirst({
      where: {
        assetId: asset.id,
        timestamp: { lte: weekAgo },
      },
      orderBy: { timestamp: 'desc' },
    });

    let priceChange7d = null;
    let priceChangePercent7d = null;
    if (currentPrice && weekAgoPrice) {
      priceChange7d = Number(currentPrice) - Number(weekAgoPrice.price);
      priceChangePercent7d = (priceChange7d / Number(weekAgoPrice.price)) * 100;
    }

    const isMarketOpen = this.isMarketOpen(asset);

    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      type: asset.type,
      isActive: asset.isActive,
      icon: asset.icon,
      currentPrice,
      priceChange24h,
      priceChangePercent24h,
      priceChange7d,
      priceChangePercent7d,
      isMarketOpen,
      isFavorite: userId ? asset.favorites.length > 0 : false,
      tradeCount: asset._count.trades,
      minTradeAmount: asset.minTradeAmount,
      maxTradeAmount: asset.maxTradeAmount,
      payoutPercent: asset.payoutPercent,
      tradingHours: asset.tradingHours,
      priceHistory: asset.prices.map((p) => ({
        price: p.price,
        timestamp: p.timestamp,
      })),
    };
  }

  /**
   * Add asset to favorites
   */
  async addFavorite(userId: string, assetId: string) {
    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundError('Asset not found');
    }

    // Check if already favorited
    const existing = await prisma.favoriteAsset.findUnique({
      where: {
        userId_assetId: {
          userId,
          assetId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    // Add to favorites
    const favorite = await prisma.favoriteAsset.create({
      data: {
        userId,
        assetId,
      },
      include: {
        asset: {
          include: {
            prices: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    return favorite;
  }

  /**
   * Remove asset from favorites
   */
  async removeFavorite(userId: string, assetId: string) {
    const favorite = await prisma.favoriteAsset.findUnique({
      where: {
        userId_assetId: {
          userId,
          assetId,
        },
      },
    });

    if (!favorite) {
      throw new NotFoundError('Favorite not found');
    }

    await prisma.favoriteAsset.delete({
      where: {
        id: favorite.id,
      },
    });

    return { message: 'Asset removed from favorites' };
  }

  /**
   * Get user's favorite assets
   */
  async getFavorites(userId: string) {
    const favorites = await prisma.favoriteAsset.findMany({
      where: { userId },
      include: {
        asset: {
          include: {
            prices: {
              orderBy: { timestamp: 'desc' },
              take: 1,
            },
            _count: {
              select: {
                trades: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const favoritesWithMetrics = await Promise.all(
      favorites.map(async (favorite) => {
        const asset = favorite.asset;
        const latestPrice = asset.prices[0];
        const currentPrice = latestPrice?.price || null;

        // Get 24h ago price
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const dayAgoPrice = await prisma.price.findFirst({
          where: {
            assetId: asset.id,
            timestamp: { lte: dayAgo },
          },
          orderBy: { timestamp: 'desc' },
        });

        let priceChange24h = null;
        let priceChangePercent24h = null;
        if (currentPrice && dayAgoPrice) {
          priceChange24h = Number(currentPrice) - Number(dayAgoPrice.price);
          priceChangePercent24h =
            (priceChange24h / Number(dayAgoPrice.price)) * 100;
        }

        const isMarketOpen = this.isMarketOpen(asset);

        return {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          isActive: asset.isActive,
          icon: asset.icon,
          currentPrice,
          priceChange24h,
          priceChangePercent24h,
          isMarketOpen,
          isFavorite: true,
          tradeCount: asset._count.trades,
          minTradeAmount: asset.minTradeAmount,
          maxTradeAmount: asset.maxTradeAmount,
          payoutPercent: asset.payoutPercent,
          addedAt: favorite.createdAt,
        };
      })
    );

    return favoritesWithMetrics;
  }

  /**
   * Determine if market is currently open based on trading hours
   */
  private isMarketOpen(asset: any): boolean {
    // If no trading hours specified, assume 24/7 (crypto)
    if (!asset.tradingHours) {
      return true;
    }

    try {
      const tradingHours = asset.tradingHours as any;

      // If 24/7 flag is set
      if (tradingHours.is24_7) {
        return true;
      }

      const now = new Date();
      const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // minutes since midnight

      const daySchedule = tradingHours[currentDay];

      if (!daySchedule || daySchedule.closed) {
        return false;
      }

      // Parse open and close times
      const [openHour, openMinute] = daySchedule.open.split(':').map(Number);
      const [closeHour, closeMinute] = daySchedule.close.split(':').map(Number);

      const openTime = openHour * 60 + openMinute;
      const closeTime = closeHour * 60 + closeMinute;

      return currentTime >= openTime && currentTime <= closeTime;
    } catch (error) {
      // If parsing fails, assume market is open
      return true;
    }
  }

  /**
   * Get market statistics (for dashboard)
   */
  async getMarketStats() {
    const [totalAssets, activeAssets, topGainers, topLosers] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { isActive: true } }),

      // Top gainers (24h)
      this.getTopMovers('gainers'),

      // Top losers (24h)
      this.getTopMovers('losers'),
    ]);

    return {
      totalAssets,
      activeAssets,
      topGainers,
      topLosers,
    };
  }

  /**
   * Get top gainers or losers
   */
  private async getTopMovers(type: 'gainers' | 'losers', limit: number = 5) {
    const assets = await prisma.asset.findMany({
      where: { isActive: true },
      include: {
        prices: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      take: 100, // Get more to calculate changes
    });

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const assetsWithChange = await Promise.all(
      assets.map(async (asset) => {
        const currentPrice = asset.prices[0]?.price;

        if (!currentPrice) return null;

        const dayAgoPrice = await prisma.price.findFirst({
          where: {
            assetId: asset.id,
            timestamp: { lte: dayAgo },
          },
          orderBy: { timestamp: 'desc' },
        });

        if (!dayAgoPrice) return null;

        const priceChange = Number(currentPrice) - Number(dayAgoPrice.price);
        const priceChangePercent = (priceChange / Number(dayAgoPrice.price)) * 100;

        return {
          id: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          currentPrice,
          priceChangePercent,
        };
      })
    );

    const validAssets = assetsWithChange.filter((a) => a !== null) as any[];

    // Sort by change percentage
    validAssets.sort((a, b) => {
      if (type === 'gainers') {
        return b.priceChangePercent - a.priceChangePercent;
      } else {
        return a.priceChangePercent - b.priceChangePercent;
      }
    });

    return validAssets.slice(0, limit);
  }
}

export default new MarketService();
