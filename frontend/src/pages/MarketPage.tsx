import { useState, useEffect } from 'react';
import { marketAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  CheckCircle,
  X,
  RefreshCcw,
} from 'lucide-react';

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  currentPrice: number | null;
  priceChange24h: number | null;
  priceChangePercent24h: number | null;
  isMarketOpen: boolean;
  isFavorite: boolean;
  icon?: string;
  minTradeAmount: number;
  maxTradeAmount: number;
  payoutPercent: number;
}

export function MarketPage() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'change' | 'price'>('name');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAssets();
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadAssets(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAndSortAssets();
  }, [assets, searchTerm, selectedType, showFavoritesOnly, sortBy]);

  const loadAssets = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const response = await marketAPI.getAssets({
        isActive: true,
        limit: 200,
      });

      setAssets(response.data.data.assets);
    } catch (error: any) {
      if (!silent) {
        toast.error('Failed to load assets');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterAndSortAssets = () => {
    let filtered = [...assets];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(search) ||
          asset.name.toLowerCase().includes(search)
      );
    }

    // Type filter
    if (selectedType !== 'ALL') {
      filtered = filtered.filter((asset) => asset.type === selectedType);
    }

    // Favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter((asset) => asset.isFavorite);
    }

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.symbol.localeCompare(b.symbol);
      } else if (sortBy === 'change') {
        const changeA = a.priceChangePercent24h || 0;
        const changeB = b.priceChangePercent24h || 0;
        return changeB - changeA;
      } else if (sortBy === 'price') {
        const priceA = a.currentPrice || 0;
        const priceB = b.currentPrice || 0;
        return priceB - priceA;
      }
      return 0;
    });

    setFilteredAssets(filtered);
  };

  const toggleFavorite = async (asset: Asset) => {
    try {
      if (asset.isFavorite) {
        await marketAPI.removeFavorite(asset.id);
        toast.success('Removed from favorites');
      } else {
        await marketAPI.addFavorite(asset.id);
        toast.success('Added to favorites');
      }

      // Update local state
      setAssets((prev) =>
        prev.map((a) =>
          a.id === asset.id ? { ...a, isFavorite: !a.isFavorite } : a
        )
      );
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update favorites');
    }
  };

  const getAssetTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      FOREX: 'bg-blue-500/10 text-blue-500',
      CRYPTO: 'bg-purple-500/10 text-purple-500',
      COMMODITY: 'bg-yellow-500/10 text-yellow-500',
      STOCK: 'bg-green-500/10 text-green-500',
      INDEX: 'bg-pink-500/10 text-pink-500',
      OTC: 'bg-gray-500/10 text-gray-500',
    };
    return colors[type] || 'bg-gray-500/10 text-gray-500';
  };

  const getPriceChangeColor = (change: number | null) => {
    if (change === null) return 'text-gray-400';
    return change >= 0 ? 'text-green-500' : 'text-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading market data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">Market</h1>
            <button
              onClick={() => loadAssets()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Search & Filters Bar */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search assets..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="FOREX">Forex</option>
                <option value="CRYPTO">Crypto</option>
                <option value="COMMODITY">Commodities</option>
                <option value="STOCK">Stocks</option>
                <option value="INDEX">Indices</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="name">Sort by Name</option>
                <option value="change">Sort by Change</option>
                <option value="price">Sort by Price</option>
              </select>

              {/* Favorites Toggle */}
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showFavoritesOnly
                    ? 'bg-yellow-500 text-black'
                    : 'bg-gray-900 text-white border border-gray-700'
                }`}
              >
                <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                Favorites
              </button>
            </div>

            {/* Results Count */}
            <div className="mt-3 text-sm text-gray-400">
              Showing {filteredAssets.length} of {assets.length} assets
            </div>
          </div>
        </div>

        {/* Assets Grid */}
        {filteredAssets.length === 0 ? (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-lg">No assets found</p>
            {showFavoritesOnly && (
              <p className="text-gray-500 text-sm mt-2">
                You haven't added any favorites yet. Click the star icon on assets to add them.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5 hover:border-gray-600 transition-all cursor-pointer group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white">{asset.symbol}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getAssetTypeColor(asset.type)}`}>
                        {asset.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{asset.name}</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(asset);
                    }}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        asset.isFavorite
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-gray-400 group-hover:text-yellow-500'
                      }`}
                    />
                  </button>
                </div>

                {/* Price */}
                <div className="mb-3">
                  {asset.currentPrice ? (
                    <>
                      <p className="text-2xl font-bold text-white mb-1">
                        ${asset.currentPrice.toFixed(asset.type === 'CRYPTO' ? 2 : 5)}
                      </p>
                      {asset.priceChangePercent24h !== null && (
                        <div className={`flex items-center gap-1 text-sm font-medium ${getPriceChangeColor(asset.priceChangePercent24h)}`}>
                          {asset.priceChangePercent24h >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>
                            {asset.priceChangePercent24h >= 0 ? '+' : ''}
                            {asset.priceChangePercent24h.toFixed(2)}%
                          </span>
                          <span className="text-gray-500">
                            ({asset.priceChange24h >= 0 ? '+' : ''}
                            {asset.priceChange24h?.toFixed(asset.type === 'CRYPTO' ? 2 : 5)})
                          </span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-gray-500">No price data</p>
                  )}
                </div>

                {/* Market Status */}
                <div className="mb-3 flex items-center gap-2">
                  {asset.isMarketOpen ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-xs text-green-500 font-medium">Market Open</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <span className="text-xs text-red-500 font-medium">Market Closed</span>
                    </>
                  )}
                </div>

                {/* Trading Info */}
                <div className="border-t border-gray-700 pt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Min Trade:</span>
                    <span className="text-white font-medium">${asset.minTradeAmount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Max Trade:</span>
                    <span className="text-white font-medium">${asset.maxTradeAmount}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Payout:</span>
                    <span className="text-green-500 font-medium">{asset.payoutPercent}%</span>
                  </div>
                </div>

                {/* Trade Button */}
                <button
                  disabled={!asset.isMarketOpen}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg font-medium transition-colors"
                >
                  {asset.isMarketOpen ? 'Trade Now' : 'Market Closed'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
