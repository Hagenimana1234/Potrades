import { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users } from 'lucide-react';
import { copyTradingAPI } from '../services/api';

interface CopyTrader {
  id: string;
  displayName: string;
  totalTrades: number;
  wonTrades: number;
  winRate: number;
  totalProfit: number;
  user: {
    username?: string;
    firstName?: string;
  };
}

export function SocialTrading() {
  const [traders, setTraders] = useState<CopyTrader[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');

  useEffect(() => {
    loadTopTraders();
  }, []);

  const loadTopTraders = async () => {
    try {
      setLoading(true);
      const response = await copyTradingAPI.getTraders({
        sortBy: 'totalProfit',
        limit: 10,
      });
      setTraders(response.data.data.copyTraders);
    } catch (error) {
      console.error('Failed to load traders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTraderName = (trader: CopyTrader) => {
    return (
      trader.displayName ||
      trader.user.username ||
      trader.user.firstName ||
      `Trader ${trader.id.slice(0, 8)}`
    );
  };

  const handleFollow = async (traderId: string) => {
    try {
      await copyTradingAPI.follow(traderId, {
        copyMode: 'FIXED',
        copyAmount: 10,
      });
      alert('Successfully following trader!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to follow trader');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-bold">Social Trading</h3>
        </div>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="bg-gray-700 text-sm rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="24h">Top ranked traders for 24h</option>
          <option value="7d">Top ranked traders for 7d</option>
          <option value="30d">Top ranked traders for 30d</option>
        </select>
      </div>

      {/* Traders List */}
      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : traders.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No traders available</p>
          </div>
        ) : (
          traders.map((trader, index) => (
            <div
              key={trader.id}
              className="bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    index === 0
                      ? 'bg-yellow-500 text-yellow-900'
                      : index === 1
                      ? 'bg-gray-300 text-gray-800'
                      : index === 2
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {index < 3 ? <Trophy className="w-5 h-5" /> : index + 1}
                </div>

                {/* Trader Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-white">
                      {getTraderName(trader)}
                    </h4>
                    <span className="text-green-400 font-bold text-lg">
                      +${trader.totalProfit.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>
                      Trades: <strong className="text-white">{trader.totalTrades}</strong>
                    </span>
                    <span>
                      Win rate:{' '}
                      <strong
                        className={
                          trader.winRate >= 70
                            ? 'text-green-400'
                            : trader.winRate >= 50
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }
                      >
                        {trader.winRate.toFixed(0)}%
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Follow Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow(trader.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                >
                  Follow
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 h-1 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                  style={{ width: `${trader.winRate}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Real Trading Badge */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <TrendingUp className="w-4 h-4" />
          <span className="uppercase font-semibold">REAL TRADING</span>
        </div>
      </div>
    </div>
  );
}
