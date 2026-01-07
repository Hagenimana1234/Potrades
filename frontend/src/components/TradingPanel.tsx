import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Clock, DollarSign } from 'lucide-react';
import { useTradingStore } from '../store/tradingStore';
import { tradingAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const EXPIRY_OPTIONS = [
  { label: '1m', value: 60 },
  { label: '2m', value: 120 },
  { label: '3m', value: 180 },
  { label: '5m', value: 300 },
];

const AMOUNT_PRESETS = [10, 20, 50, 100, 500];

export function TradingPanel() {
  const {
    selectedAsset,
    amount,
    expirySeconds,
    walletType,
    balance,
    setAmount,
    setExpirySeconds,
    addTrade,
  } = useTradingStore();

  const [isTrading, setIsTrading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  const placeTrade = async (direction: 'UP' | 'DOWN') => {
    if (!selectedAsset) {
      toast.error('Please select an asset');
      return;
    }

    if (amount < selectedAsset.minTradeAmount) {
      toast.error(`Minimum amount is $${selectedAsset.minTradeAmount}`);
      return;
    }

    if (amount > selectedAsset.maxTradeAmount) {
      toast.error(`Maximum amount is $${selectedAsset.maxTradeAmount}`);
      return;
    }

    if (amount > balance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsTrading(true);

    try {
      const response = await tradingAPI.placeTrade({
        assetId: selectedAsset.id,
        direction,
        amount,
        expirySeconds,
        walletType,
      });

      const trade = response.data.data;
      addTrade(trade);
      setCountdown(expirySeconds);

      toast.success(`Trade placed: ${direction}`, {
        icon: direction === 'UP' ? '📈' : '📉',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to place trade');
    } finally {
      setIsTrading(false);
    }
  };

  const payout = selectedAsset
    ? (amount * selectedAsset.payoutPercent) / 100
    : 0;

  const totalReturn = amount + payout;

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      {/* Time Selection */}
      <div className="space-y-2">
        <label className="flex items-center text-sm text-gray-400">
          <Clock className="w-4 h-4 mr-2" />
          Expiration time
        </label>
        <div className="grid grid-cols-4 gap-2">
          {EXPIRY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setExpirySeconds(option.value)}
              className={`py-2 px-4 rounded-lg font-semibold transition-colors ${
                expirySeconds === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {countdown !== null && (
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
            </div>
            <div className="text-xs text-gray-500">Time remaining</div>
          </div>
        )}
      </div>

      {/* Amount Selection */}
      <div className="space-y-2">
        <label className="flex items-center text-sm text-gray-400">
          <DollarSign className="w-4 h-4 mr-2" />
          Investment amount
        </label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full bg-gray-700 text-white text-2xl font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={selectedAsset?.minTradeAmount || 1}
            max={selectedAsset?.maxTradeAmount || 10000}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {AMOUNT_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset)}
              className="flex-1 min-w-[60px] py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition-colors"
            >
              ${preset}
            </button>
          ))}
        </div>
      </div>

      {/* Payout Info */}
      <div className="bg-gray-700/50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Payout</span>
          <span className="text-green-400 font-bold">
            +{selectedAsset?.payoutPercent || 0}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Potential profit</span>
          <span className="text-white font-bold">+${payout.toFixed(2)}</span>
        </div>
        <div className="border-t border-gray-600 pt-2 flex justify-between">
          <span className="text-gray-400">Total return</span>
          <span className="text-white font-bold text-lg">
            ${totalReturn.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Trading Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => placeTrade('UP')}
          disabled={isTrading || !selectedAsset}
          className="group relative overflow-hidden bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95"
        >
          <div className="flex flex-col items-center gap-2">
            <ArrowUp className="w-6 h-6" />
            <span className="text-lg">UP</span>
          </div>
          {isTrading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        <button
          onClick={() => placeTrade('DOWN')}
          disabled={isTrading || !selectedAsset}
          className="group relative overflow-hidden bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-all transform hover:scale-105 active:scale-95"
        >
          <div className="flex flex-col items-center gap-2">
            <ArrowDown className="w-6 h-6" />
            <span className="text-lg">DOWN</span>
          </div>
          {isTrading && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
      </div>

      {/* Balance Info */}
      <div className="text-center text-sm text-gray-400">
        Available balance:{' '}
        <span className="text-white font-bold">${(typeof balance === 'number' ? balance : 0).toFixed(2)}</span>
      </div>
    </div>
  );
}
