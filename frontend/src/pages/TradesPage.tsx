import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  BarChart3,
  Shield,
  Settings,
  CheckCircle,
  XCircle,
  Minus,
  Filter,
  Calendar,
  Activity,
} from 'lucide-react';
import { tradesAPI } from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

interface Trade {
  id: string;
  asset: {
    symbol: string;
    name: string;
  };
  wallet: {
    type: string;
  };
  direction: 'UP' | 'DOWN';
  amount: number;
  payoutPercent: number;
  expirySeconds: number;
  status: 'PENDING' | 'OPEN' | 'WON' | 'LOST' | 'DRAW' | 'CANCELLED' | 'REFUNDED';
  openPrice: number;
  closePrice?: number;
  openedAt: string;
  closedAt?: string;
  expiresAt?: string;
  profit?: number;
  profitPercent?: number;
  createdAt: string;
}

interface TradeStats {
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  drawTrades: number;
  winRate: number;
  totalProfit: number;
}

interface RiskLimits {
  maxTradeAmount: number | null;
  maxDailyLoss: number | null;
  maxOpenTrades: number | null;
  maxDailyTrades: number | null;
  cooldownSeconds: number | null;
  isActive: boolean;
}

type TabType = 'open' | 'history';
type StatusFilter = 'ALL' | 'WON' | 'LOST' | 'DRAW' | 'CANCELLED';

export function TradesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('open');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showRiskSettings, setShowRiskSettings] = useState(false);
  const [riskLimits, setRiskLimits] = useState<Partial<RiskLimits>>({
    maxTradeAmount: null,
    maxDailyLoss: null,
    maxOpenTrades: null,
    maxDailyTrades: null,
    cooldownSeconds: null,
  });

  const queryClient = useQueryClient();

  // Fetch open trades
  const { data: openTrades, isLoading: loadingOpenTrades } = useQuery({
    queryKey: ['trades', 'open'],
    queryFn: () => tradesAPI.getOpenTrades(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch trade history
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['trades', 'history', statusFilter],
    queryFn: () => {
      const status = statusFilter === 'ALL' ? undefined : statusFilter;
      return tradesAPI.getTradeHistory({ status, limit: 50 });
    },
    enabled: activeTab === 'history',
  });

  // Fetch trade stats
  const { data: statsData } = useQuery({
    queryKey: ['trades', 'stats'],
    queryFn: () => tradesAPI.getTradeStats(),
    refetchInterval: 10000,
  });

  // Fetch risk limits
  const { data: riskLimitsData } = useQuery({
    queryKey: ['trades', 'risk-limits'],
    queryFn: () => tradesAPI.getRiskLimits(),
  });

  // Update local risk limits when data loads
  useEffect(() => {
    if (riskLimitsData?.data) {
      setRiskLimits({
        maxTradeAmount: riskLimitsData.data.maxTradeAmount,
        maxDailyLoss: riskLimitsData.data.maxDailyLoss,
        maxOpenTrades: riskLimitsData.data.maxOpenTrades,
        maxDailyTrades: riskLimitsData.data.maxDailyTrades,
        cooldownSeconds: riskLimitsData.data.cooldownSeconds,
      });
    }
  }, [riskLimitsData]);

  // Close trade mutation
  const closeTradeM = useMutation({
    mutationFn: (tradeId: string) => tradesAPI.closeTrade(tradeId),
    onSuccess: (response) => {
      toast.success(response.data.message || 'Trade closed successfully');
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to close trade');
    },
  });

  // Update risk limits mutation
  const updateRiskLimitsM = useMutation({
    mutationFn: (limits: Partial<RiskLimits>) => tradesAPI.updateRiskLimits(limits),
    onSuccess: () => {
      toast.success('Risk limits updated successfully');
      queryClient.invalidateQueries({ queryKey: ['trades', 'risk-limits'] });
      setShowRiskSettings(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update risk limits');
    },
  });

  const trades: Trade[] = openTrades?.data || [];
  const history: Trade[] = historyData?.data?.trades || [];
  const stats: TradeStats | undefined = statsData?.data;

  // Calculate time remaining
  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  // Calculate current P&L (simulated - in real system would need current price)
  const getCurrentPnL = (trade: Trade) => {
    // Placeholder - would need real-time price
    return 0;
  };

  const handleCloseTrade = (tradeId: string) => {
    if (confirm('Are you sure you want to close this trade?')) {
      closeTradeM.mutate(tradeId);
    }
  };

  const handleUpdateRiskLimits = () => {
    updateRiskLimitsM.mutate(riskLimits);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'WON':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'LOST':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'DRAW':
        return <Minus className="w-5 h-5 text-gray-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Trades</h1>
            <p className="text-gray-400 mt-1">Manage your positions and view trade history</p>
          </div>
          <button
            onClick={() => setShowRiskSettings(!showRiskSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Shield className="w-4 h-4" />
            Risk Settings
          </button>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-400">Total Trades</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.totalTrades}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-400">Won</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{stats.wonTrades}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-gray-400">Lost</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{stats.lostTrades}</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-400">Win Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</p>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-gray-400">Total P&L</span>
              </div>
              <p className={`text-2xl font-bold ${stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${stats.totalProfit.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Risk Settings Panel */}
        {showRiskSettings && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-white">Risk Management Settings</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Trade Amount ($)
                </label>
                <input
                  type="number"
                  value={riskLimits.maxTradeAmount || ''}
                  onChange={(e) => setRiskLimits({ ...riskLimits, maxTradeAmount: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="No limit"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Daily Loss ($)
                </label>
                <input
                  type="number"
                  value={riskLimits.maxDailyLoss || ''}
                  onChange={(e) => setRiskLimits({ ...riskLimits, maxDailyLoss: e.target.value ? parseFloat(e.target.value) : null })}
                  placeholder="No limit"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Open Trades
                </label>
                <input
                  type="number"
                  value={riskLimits.maxOpenTrades || ''}
                  onChange={(e) => setRiskLimits({ ...riskLimits, maxOpenTrades: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="No limit"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Max Daily Trades
                </label>
                <input
                  type="number"
                  value={riskLimits.maxDailyTrades || ''}
                  onChange={(e) => setRiskLimits({ ...riskLimits, maxDailyTrades: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="No limit"
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateRiskLimits}
                disabled={updateRiskLimitsM.isPending}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {updateRiskLimitsM.isPending ? 'Updating...' : 'Save Settings'}
              </button>
              <button
                onClick={() => setShowRiskSettings(false)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'open'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Open Positions ({trades.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            History
          </button>
        </div>

        {/* Open Positions Tab */}
        {activeTab === 'open' && (
          <div className="space-y-4">
            {loadingOpenTrades ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-gray-400 mt-4">Loading open positions...</p>
              </div>
            ) : trades.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No open positions</p>
                <p className="text-gray-500 text-sm mt-2">Place a trade to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trades.map((trade) => (
                  <div
                    key={trade.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Asset Info */}
                        <div className="flex items-center gap-3">
                          {trade.direction === 'UP' ? (
                            <div className="p-3 bg-green-500/10 rounded-lg">
                              <TrendingUp className="w-6 h-6 text-green-500" />
                            </div>
                          ) : (
                            <div className="p-3 bg-red-500/10 rounded-lg">
                              <TrendingDown className="w-6 h-6 text-red-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white">{trade.asset.symbol}</p>
                            <p className="text-xs text-gray-400">{trade.asset.name}</p>
                          </div>
                        </div>

                        {/* Trade Details */}
                        <div className="grid grid-cols-4 gap-6 flex-1">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Amount</p>
                            <p className="font-semibold text-white">${trade.amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Entry Price</p>
                            <p className="font-semibold text-white">${trade.openPrice.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Payout</p>
                            <p className="font-semibold text-green-500">+{trade.payoutPercent}%</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Time Remaining</p>
                            <p className="font-semibold text-blue-500">
                              {trade.expiresAt && getTimeRemaining(trade.expiresAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Close Button */}
                      <button
                        onClick={() => handleCloseTrade(trade.id)}
                        disabled={closeTradeM.isPending}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            {/* Status Filter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">Filter:</span>
              </div>
              <div className="flex gap-2">
                {(['ALL', 'WON', 'LOST', 'DRAW', 'CANCELLED'] as StatusFilter[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      statusFilter === status
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* History List */}
            {loadingHistory ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-gray-400 mt-4">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No trade history</p>
                <p className="text-gray-500 text-sm mt-2">Your completed trades will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((trade) => (
                  <div
                    key={trade.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Status Icon */}
                        <div>{getStatusIcon(trade.status)}</div>

                        {/* Asset Info */}
                        <div className="flex items-center gap-3">
                          {trade.direction === 'UP' ? (
                            <TrendingUp className="w-5 h-5 text-green-500" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-500" />
                          )}
                          <div>
                            <p className="font-bold text-white">{trade.asset.symbol}</p>
                            <p className="text-xs text-gray-400">
                              {new Date(trade.closedAt || trade.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Trade Details */}
                        <div className="grid grid-cols-5 gap-4 flex-1">
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Amount</p>
                            <p className="font-semibold text-white">${trade.amount.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Entry</p>
                            <p className="font-semibold text-white">${trade.openPrice.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Exit</p>
                            <p className="font-semibold text-white">
                              {trade.closePrice ? `$${trade.closePrice.toFixed(4)}` : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Status</p>
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                                trade.status === 'WON'
                                  ? 'bg-green-500/10 text-green-500'
                                  : trade.status === 'LOST'
                                  ? 'bg-red-500/10 text-red-500'
                                  : 'bg-gray-700 text-gray-400'
                              }`}
                            >
                              {trade.status}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 mb-1">Profit/Loss</p>
                            <p
                              className={`font-bold ${
                                (trade.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                              }`}
                            >
                              {trade.profit !== undefined
                                ? `${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}`
                                : '-'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
