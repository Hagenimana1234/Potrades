import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface OTCPricingConfig {
  id: string;
  assetId: string;
  spreadPercent: number;
  slippagePercent: number;
  priceAdjustment: number;
  executionDelayMs: number;
  maxExposure: number;
  asset: {
    symbol: string;
    name: string;
    type: string;
  };
}

export default function AdminOTCPricingPage() {
  const [configs, setConfigs] = useState<OTCPricingConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<OTCPricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [spreadPercent, setSpreadPercent] = useState('');
  const [slippagePercent, setSlippagePercent] = useState('');
  const [priceAdjustment, setPriceAdjustment] = useState('');
  const [executionDelayMs, setExecutionDelayMs] = useState('');
  const [maxExposure, setMaxExposure] = useState('');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/otc-pricing');
      setConfigs(response.data.data);
    } catch (error) {
      toast.error('Failed to load pricing configurations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: OTCPricingConfig) => {
    setSelectedConfig(config);
    setSpreadPercent(config.spreadPercent.toString());
    setSlippagePercent(config.slippagePercent.toString());
    setPriceAdjustment(config.priceAdjustment.toString());
    setExecutionDelayMs(config.executionDelayMs.toString());
    setMaxExposure(config.maxExposure.toString());
    setEditMode(true);
  };

  const handleUpdate = async () => {
    if (!selectedConfig) return;

    try {
      await axios.put(`/api/admin/otc-pricing/${selectedConfig.assetId}`, {
        spreadPercent: parseFloat(spreadPercent),
        slippagePercent: parseFloat(slippagePercent),
        priceAdjustment: parseFloat(priceAdjustment),
        executionDelayMs: parseInt(executionDelayMs),
        maxExposure: parseFloat(maxExposure),
      });

      toast.success('Pricing configuration updated successfully');
      setEditMode(false);
      setSelectedConfig(null);
      fetchConfigs();
    } catch (error) {
      toast.error('Failed to update configuration');
      console.error(error);
    }
  };

  const handleClearCache = async () => {
    try {
      await axios.post('/api/admin/otc-pricing/clear-cache');
      toast.success('POL cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading OTC pricing configurations...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">OTC Pricing Configuration</h1>
        <button
          onClick={handleClearCache}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear POL Cache
        </button>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <p className="text-yellow-700">
          <strong>⚠️ Critical:</strong> These settings control the Price Orchestration Layer (POL).
          Changes affect synthetic price generation for all trades.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Asset Configurations</h2>
          </div>
          <div className="divide-y">
            {configs.map((config) => (
              <div
                key={config.id}
                className="p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleEdit(config)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{config.asset.symbol}</h3>
                    <p className="text-sm text-gray-600">{config.asset.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Spread: {config.spreadPercent}%
                    </p>
                    <p className="text-sm text-gray-600">
                      Slippage: {config.slippagePercent}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        {editMode && selectedConfig && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">
              Edit: {selectedConfig.asset.symbol}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Spread Percent (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={spreadPercent}
                  onChange={(e) => setSpreadPercent(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Base spread added to seed price
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Slippage Percent (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={slippagePercent}
                  onChange={(e) => setSlippagePercent(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Simulated order execution slippage
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Price Adjustment (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={priceAdjustment}
                  onChange={(e) => setPriceAdjustment(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Manual price adjustment (positive or negative)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Execution Delay (ms)
                </label>
                <input
                  type="number"
                  value={executionDelayMs}
                  onChange={(e) => setExecutionDelayMs(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Simulated order execution delay
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Exposure ($)
                </label>
                <input
                  type="number"
                  value={maxExposure}
                  onChange={(e) => setMaxExposure(e.target.value)}
                  className="w-full px-3 py-2 border rounded"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum platform exposure for this asset
                </p>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setSelectedConfig(null);
                  }}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Price Formula Info */}
      <div className="mt-8 bg-blue-50 p-6 rounded-lg">
        <h3 className="font-bold text-lg mb-2">Price Orchestration Layer Formula</h3>
        <p className="text-sm text-gray-700 font-mono">
          P_display = P_seed + Spread + Bias + GaussianNoise + BrownianMotion + RiskSkew + AdminAdjustment + Slippage
        </p>
        <p className="text-sm text-gray-600 mt-2">
          All prices shown to users are synthetic. Real market data is used as seeds only.
        </p>
      </div>
    </div>
  );
}
