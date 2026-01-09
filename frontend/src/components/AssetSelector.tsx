import { useEffect, useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Search, Star } from 'lucide-react';
import { useTradingStore } from '../store/tradingStore';
import { tradingAPI } from '../services/api';

type CategoryFilter = 'all' | 'CRYPTO' | 'FOREX' | 'COMMODITY' | 'STOCK' | 'INDEX';

export function AssetSelector() {
  const { selectedAsset, assets, setSelectedAsset, setAssets } = useTradingStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const response = await tradingAPI.getAssets();
      const loadedAssets = response.data.data;
      setAssets(loadedAssets);
      if (loadedAssets.length > 0 && !selectedAsset) {
        setSelectedAsset(loadedAssets[0]);
      }
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriceChange = (asset: any) => {
    // Simulated price change for demo
    return (Math.random() - 0.5) * 5;
  };

  const getAssetIcon = (type: string) => {
    const icons: Record<string, string> = {
      CRYPTO: '₿',
      FOREX: '💱',
      COMMODITY: '🥇',
      STOCK: '📈',
      INDEX: '📊',
    };
    return icons[type] || '💹';
  };

  const toggleFavorite = (assetId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(assetId)) {
        newFavorites.delete(assetId);
      } else {
        newFavorites.add(assetId);
      }
      return newFavorites;
    });
  };

  const categories = [
    { id: 'all' as CategoryFilter, name: 'All', icon: '🌐' },
    { id: 'FOREX' as CategoryFilter, name: 'Forex', icon: '💱' },
    { id: 'CRYPTO' as CategoryFilter, name: 'Crypto', icon: '₿' },
    { id: 'COMMODITY' as CategoryFilter, name: 'Commodities', icon: '🥇' },
    { id: 'STOCK' as CategoryFilter, name: 'Stocks', icon: '📈' },
    { id: 'INDEX' as CategoryFilter, name: 'Indices', icon: '📊' },
  ];

  const filteredAssets = assets.filter((asset: any) => {
    const matchesCategory = activeCategory === 'all' || asset.type === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFavorites = !showFavoritesOnly || favorites.has(asset.id);
    return matchesCategory && matchesSearch && matchesFavorites;
  });

  return (
    <div className="relative">
      {/* Selected Asset */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-lg transition-colors w-full"
      >
        {selectedAsset ? (
          <>
            <span className="text-2xl">{getAssetIcon(selectedAsset.type)}</span>
            <div className="flex-1 text-left">
              <div className="font-bold text-white">{selectedAsset.symbol}</div>
              <div className="text-xs text-gray-400">{selectedAsset.name}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-white">
                {selectedAsset.currentPrice?.toFixed(5) || '---'}
              </div>
              <div
                className={`text-xs font-semibold ${
                  getPriceChange(selectedAsset) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {getPriceChange(selectedAsset) >= 0 ? '+' : ''}
                {getPriceChange(selectedAsset).toFixed(2)}%
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </>
        ) : (
          <span className="text-gray-400">Select an asset...</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 w-[600px] mt-2 bg-gray-800 rounded-lg shadow-xl max-h-[600px] overflow-hidden z-50 border border-gray-700 flex flex-col">
          {/* Search and Favorites Bar */}
          <div className="p-4 border-b border-gray-700 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                showFavoritesOnly
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favorites
            </button>
          </div>

          {/* Category Tabs */}
          <div className="px-4 py-3 border-b border-gray-700 flex gap-2 overflow-x-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-2 whitespace-nowrap transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-900 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            ))}
          </div>

          {/* Assets List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Search className="w-12 h-12 mb-3 opacity-50" />
                <p>No assets found</p>
              </div>
            ) : (
              filteredAssets.map((asset) => {
                const change = getPriceChange(asset);
                const isPositive = change >= 0;
                const isFavorite = favorites.has(asset.id);

                return (
                  <button
                    key={asset.id}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-700 transition-colors ${
                      selectedAsset?.id === asset.id ? 'bg-gray-700' : ''
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(asset.id);
                      }}
                      className={`transition-colors ${
                        isFavorite ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                    <span className="text-xl">{getAssetIcon(asset.type)}</span>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white flex items-center gap-2">
                        {asset.symbol}
                        {asset.isOTC && (
                          <span className="text-xs px-1.5 py-0.5 bg-orange-500/20 border border-orange-500 rounded text-orange-400">
                            OTC
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{asset.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm text-white">
                        {asset.currentPrice?.toFixed(5) || '---'}
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3 text-green-400" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-red-400" />
                        )}
                        <span
                          className={`text-xs font-semibold ${
                            isPositive ? 'text-green-400' : 'text-red-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}
                          {change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-blue-400 bg-blue-500/20 border border-blue-500 px-2 py-1 rounded">
                      {asset.payoutPercent}%
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
