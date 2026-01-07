import { useEffect, useState } from 'react';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { useTradingStore } from '../store/tradingStore';
import { tradingAPI } from '../services/api';

export function AssetSelector() {
  const { selectedAsset, assets, setSelectedAsset, setAssets } = useTradingStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

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
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50 border border-gray-700">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            assets.map((asset) => {
              const change = getPriceChange(asset);
              const isPositive = change >= 0;

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
                  <span className="text-xl">{getAssetIcon(asset.type)}</span>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{asset.symbol}</div>
                    <div className="text-xs text-gray-400">{asset.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-white">
                      {asset.currentPrice?.toFixed(5) || '---'}
                    </div>
                    <div className="flex items-center gap-1">
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
                  <div className="text-xs text-gray-500 bg-gray-900 px-2 py-1 rounded">
                    {asset.payoutPercent}%
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
