import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Users,
  TrendingUp,
  Award,
  DollarSign,
  BarChart3,
  UserPlus,
  UserMinus,
  Pause,
  Play,
  Settings,
  Star,
  Filter,
  Trophy,
  Target,
  Activity,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { copyTradingAPI } from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

interface CopyTrader {
  id: string;
  user: {
    id: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
  displayName?: string;
  bio?: string;
  avatar?: string;
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  winRate: number;
  totalProfit: number;
  totalVolume: number;
  minCopyAmount: number;
  maxCopyAmount: number;
  profitSharePercent: number;
  _count: {
    followers: number;
  };
}

interface CopyRelationship {
  id: string;
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  copyMode: 'FIXED' | 'PERCENT';
  copyAmount?: number;
  copyPercent?: number;
  maxDailyLoss?: number;
  totalCopied: number;
  totalProfit: number;
  startedAt: string;
  masterTrader: {
    id: string;
    displayName?: string;
    winRate: number;
    totalProfit: number;
    user: {
      username?: string;
      firstName?: string;
      lastName?: string;
    };
  };
}

type TabType = 'browse' | 'following' | 'profile';
type SortBy = 'winRate' | 'totalProfit' | 'totalTrades';

export function SocialTradingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [sortBy, setSortBy] = useState<SortBy>('winRate');
  const [minWinRate, setMinWinRate] = useState(60);
  const [minTrades, setMinTrades] = useState(10);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<CopyTrader | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<CopyRelationship | null>(null);

  // Follow modal form state
  const [copyMode, setCopyMode] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [copyAmount, setCopyAmount] = useState('');
  const [copyPercent, setCopyPercent] = useState('100');
  const [maxDailyLoss, setMaxDailyLoss] = useState('');

  const queryClient = useQueryClient();

  // Fetch public copy traders
  const { data: tradersData, isLoading: loadingTraders } = useQuery({
    queryKey: ['copy-traders', sortBy, minWinRate, minTrades],
    queryFn: () =>
      copyTradingAPI.getCopyTraders({
        sortBy,
        minWinRate,
        minTotalTrades: minTrades,
        limit: 50,
      }),
    enabled: activeTab === 'browse',
  });

  // Fetch my following
  const { data: followingData, isLoading: loadingFollowing } = useQuery({
    queryKey: ['my-following'],
    queryFn: () => copyTradingAPI.getMyFollowing(),
    enabled: activeTab === 'following',
  });

  // Fetch my profile
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ['my-copy-profile'],
    queryFn: () => copyTradingAPI.getMyCopyTraderProfile(),
    enabled: activeTab === 'profile',
  });

  // Follow trader mutation
  const followMutation = useMutation({
    mutationFn: (data: any) => copyTradingAPI.followTrader(data.traderId, data.config),
    onSuccess: () => {
      toast.success('Successfully started following trader');
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
      setShowFollowModal(false);
      setSelectedTrader(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to follow trader');
    },
  });

  // Unfollow mutation
  const unfollowMutation = useMutation({
    mutationFn: (traderId: string) => copyTradingAPI.unfollowTrader(traderId),
    onSuccess: () => {
      toast.success('Successfully unfollowed trader');
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to unfollow trader');
    },
  });

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: (traderId: string) => copyTradingAPI.pauseCopyRelationship(traderId),
    onSuccess: () => {
      toast.success('Copy relationship paused');
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to pause');
    },
  });

  // Resume mutation
  const resumeMutation = useMutation({
    mutationFn: (traderId: string) => copyTradingAPI.resumeCopyRelationship(traderId),
    onSuccess: () => {
      toast.success('Copy relationship resumed');
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to resume');
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) =>
      copyTradingAPI.updateCopySettings(data.traderId, data.config),
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['my-following'] });
      setShowSettingsModal(false);
      setSelectedRelationship(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    },
  });

  const traders: CopyTrader[] = tradersData?.data?.copyTraders || [];
  const following: CopyRelationship[] = followingData?.data || [];
  const myProfile = profileData?.data;

  const handleFollow = (trader: CopyTrader) => {
    setSelectedTrader(trader);
    setCopyAmount(trader.minCopyAmount.toString());
    setShowFollowModal(true);
  };

  const handleConfirmFollow = () => {
    if (!selectedTrader) return;

    const config: any = {
      copyMode,
      maxDailyLoss: maxDailyLoss ? parseFloat(maxDailyLoss) : undefined,
    };

    if (copyMode === 'FIXED') {
      config.copyAmount = parseFloat(copyAmount);
    } else {
      config.copyPercent = parseFloat(copyPercent);
    }

    followMutation.mutate({
      traderId: selectedTrader.id,
      config,
    });
  };

  const handleUnfollow = (traderId: string) => {
    if (confirm('Are you sure you want to stop following this trader?')) {
      unfollowMutation.mutate(traderId);
    }
  };

  const handlePause = (traderId: string) => {
    pauseMutation.mutate(traderId);
  };

  const handleResume = (traderId: string) => {
    resumeMutation.mutate(traderId);
  };

  const handleOpenSettings = (relationship: CopyRelationship) => {
    setSelectedRelationship(relationship);
    setCopyMode(relationship.copyMode);
    setCopyAmount(relationship.copyAmount?.toString() || '');
    setCopyPercent(relationship.copyPercent?.toString() || '100');
    setMaxDailyLoss(relationship.maxDailyLoss?.toString() || '');
    setShowSettingsModal(true);
  };

  const handleUpdateSettings = () => {
    if (!selectedRelationship) return;

    const config: any = {
      copyMode,
      maxDailyLoss: maxDailyLoss ? parseFloat(maxDailyLoss) : undefined,
    };

    if (copyMode === 'FIXED') {
      config.copyAmount = parseFloat(copyAmount);
    } else {
      config.copyPercent = parseFloat(copyPercent);
    }

    updateSettingsMutation.mutate({
      traderId: selectedRelationship.masterTrader.id,
      config,
    });
  };

  const getTraderName = (user: any, displayName?: string) => {
    if (displayName) return displayName;
    if (user.username) return user.username;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return 'Anonymous Trader';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Social Trading</h1>
          <p className="text-gray-400 mt-1">Copy successful traders and grow your portfolio</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'browse'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Browse Traders
            </div>
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'following'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              My Following ({following.filter((f) => f.status === 'ACTIVE').length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'profile'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              My Profile
            </div>
          </button>
        </div>

        {/* Browse Traders Tab */}
        {activeTab === 'browse' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-blue-500" />
                <h2 className="text-lg font-semibold text-white">Filters</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="winRate">Win Rate</option>
                    <option value="totalProfit">Total Profit</option>
                    <option value="totalTrades">Total Trades</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Min Win Rate (%)
                  </label>
                  <input
                    type="number"
                    value={minWinRate}
                    onChange={(e) => setMinWinRate(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Min Trades
                  </label>
                  <input
                    type="number"
                    value={minTrades}
                    onChange={(e) => setMinTrades(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Traders Grid */}
            {loadingTraders ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-gray-400 mt-4">Loading traders...</p>
              </div>
            ) : traders.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No traders found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {traders.map((trader) => (
                  <div
                    key={trader.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    {/* Trader Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {getTraderName(trader.user, trader.displayName)[0]}
                        </div>
                        <div>
                          <p className="font-bold text-white">
                            {getTraderName(trader.user, trader.displayName)}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Users className="w-3 h-3" />
                            {trader._count.followers} followers
                          </div>
                        </div>
                      </div>
                      <Award className="w-5 h-5 text-yellow-500" />
                    </div>

                    {/* Bio */}
                    {trader.bio && (
                      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{trader.bio}</p>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Win Rate</p>
                        <p className="text-lg font-bold text-green-500">{trader.winRate.toFixed(1)}%</p>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Total Profit</p>
                        <p className={`text-lg font-bold ${trader.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${Math.abs(trader.totalProfit).toFixed(0)}
                        </p>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Total Trades</p>
                        <p className="text-lg font-bold text-white">{trader.totalTrades}</p>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Profit Share</p>
                        <p className="text-lg font-bold text-blue-500">{trader.profitSharePercent}%</p>
                      </div>
                    </div>

                    {/* Copy Range */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                      <p className="text-xs text-blue-500 mb-1">Copy Range</p>
                      <p className="text-sm text-white font-medium">
                        ${trader.minCopyAmount} - ${trader.maxCopyAmount}
                      </p>
                    </div>

                    {/* Follow Button */}
                    <button
                      onClick={() => handleFollow(trader)}
                      className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Follow Trader
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Following Tab */}
        {activeTab === 'following' && (
          <div className="space-y-4">
            {loadingFollowing ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-gray-400 mt-4">Loading following...</p>
              </div>
            ) : following.length === 0 ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <Star className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Not following any traders yet</p>
                <p className="text-gray-500 text-sm mt-2">Browse traders to start copy trading</p>
                <button
                  onClick={() => setActiveTab('browse')}
                  className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Browse Traders
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {following.map((relationship) => (
                  <div
                    key={relationship.id}
                    className="bg-gray-800 rounded-lg p-6 border border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        {/* Trader Info */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                          {getTraderName(
                            relationship.masterTrader.user,
                            relationship.masterTrader.displayName
                          )[0]}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="font-bold text-white">
                              {getTraderName(
                                relationship.masterTrader.user,
                                relationship.masterTrader.displayName
                              )}
                            </p>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                relationship.status === 'ACTIVE'
                                  ? 'bg-green-500/10 text-green-500'
                                  : relationship.status === 'PAUSED'
                                  ? 'bg-yellow-500/10 text-yellow-500'
                                  : 'bg-gray-700 text-gray-400'
                              }`}
                            >
                              {relationship.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <div>
                              <span className="text-gray-400">Win Rate: </span>
                              <span className="text-green-500 font-semibold">
                                {relationship.masterTrader.winRate.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Copy Mode: </span>
                              <span className="text-white font-semibold">
                                {relationship.copyMode === 'FIXED'
                                  ? `$${relationship.copyAmount}`
                                  : `${relationship.copyPercent}%`}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Copied: </span>
                              <span className="text-white font-semibold">
                                {relationship.totalCopied} trades
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-400">Profit: </span>
                              <span
                                className={`font-semibold ${
                                  relationship.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'
                                }`}
                              >
                                ${relationship.totalProfit.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenSettings(relationship)}
                          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                          title="Settings"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {relationship.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handlePause(relationship.masterTrader.id)}
                            className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg transition-colors"
                            title="Pause"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        ) : relationship.status === 'PAUSED' ? (
                          <button
                            onClick={() => handleResume(relationship.masterTrader.id)}
                            className="px-3 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                            title="Resume"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleUnfollow(relationship.masterTrader.id)}
                          className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                          title="Unfollow"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {loadingProfile ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="text-gray-400 mt-4">Loading profile...</p>
              </div>
            ) : !myProfile ? (
              <div className="bg-gray-800 rounded-lg p-12 text-center border border-gray-700">
                <Trophy className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">You are not a copy trader yet</p>
                <p className="text-gray-500 text-sm mt-2">
                  Apply to become a copy trader and earn profit share from followers
                </p>
                <button className="mt-4 px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                  Apply as Copy Trader
                </button>
              </div>
            ) : (
              <div>
                {/* Profile Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-400">Followers</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{myProfile.activeFollowers}</p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-gray-400">Win Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-green-500">{myProfile.winRate.toFixed(1)}%</p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-yellow-500" />
                      <span className="text-xs text-gray-400">Total Profit</span>
                    </div>
                    <p
                      className={`text-2xl font-bold ${
                        myProfile.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      ${myProfile.totalProfit.toFixed(2)}
                    </p>
                  </div>

                  <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-gray-400">Total Trades</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{myProfile.totalTrades}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-2">Trader Status</h3>
                      <p className="text-gray-400">
                        {myProfile.status === 'PENDING' && 'Pending admin approval'}
                        {myProfile.status === 'ACTIVE' && 'Active and available for copying'}
                        {myProfile.status === 'SUSPENDED' && 'Account suspended'}
                        {myProfile.status === 'INACTIVE' && 'Profile inactive'}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-lg font-semibold ${
                        myProfile.status === 'ACTIVE'
                          ? 'bg-green-500/10 text-green-500'
                          : myProfile.status === 'PENDING'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {myProfile.status}
                    </span>
                  </div>
                </div>

                {/* Recent Trades */}
                {myProfile.recentTrades && myProfile.recentTrades.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-bold text-white mb-4">Recent Trades</h3>
                    <div className="space-y-2">
                      {myProfile.recentTrades.slice(0, 5).map((trade: any) => (
                        <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-lg">
                          <div className="flex items-center gap-3">
                            <CheckCircle
                              className={`w-4 h-4 ${
                                trade.status === 'WON'
                                  ? 'text-green-500'
                                  : trade.status === 'LOST'
                                  ? 'text-red-500'
                                  : 'text-gray-500'
                              }`}
                            />
                            <span className="font-medium text-white">{trade.asset.symbol}</span>
                            <span className="text-xs text-gray-400">
                              {new Date(trade.closedAt || trade.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <span
                            className={`font-semibold ${
                              (trade.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}
                          >
                            {trade.profit ? `${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}` : '-'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Follow Trader Modal */}
        {showFollowModal && selectedTrader && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">
                Follow {getTraderName(selectedTrader.user, selectedTrader.displayName)}
              </h2>

              <div className="space-y-4">
                {/* Copy Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Copy Mode</label>
                  <select
                    value={copyMode}
                    onChange={(e) => setCopyMode(e.target.value as 'FIXED' | 'PERCENT')}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="FIXED">Fixed Amount</option>
                    <option value="PERCENT">Percentage of Trade</option>
                  </select>
                </div>

                {/* Copy Amount/Percent */}
                {copyMode === 'FIXED' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Copy Amount ($)
                    </label>
                    <input
                      type="number"
                      value={copyAmount}
                      onChange={(e) => setCopyAmount(e.target.value)}
                      min={selectedTrader.minCopyAmount}
                      max={selectedTrader.maxCopyAmount}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Range: ${selectedTrader.minCopyAmount} - ${selectedTrader.maxCopyAmount}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Copy Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={copyPercent}
                      onChange={(e) => setCopyPercent(e.target.value)}
                      min="1"
                      max="100"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Percentage of trader's position size
                    </p>
                  </div>
                )}

                {/* Max Daily Loss */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Daily Loss ($) - Optional
                  </label>
                  <input
                    type="number"
                    value={maxDailyLoss}
                    onChange={(e) => setMaxDailyLoss(e.target.value)}
                    placeholder="No limit"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Profit Share Notice */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-xs text-blue-500">
                    Profit Share: {selectedTrader.profitSharePercent}% of your profits will go to the trader
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleConfirmFollow}
                    disabled={followMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {followMutation.isPending ? 'Following...' : 'Confirm Follow'}
                  </button>
                  <button
                    onClick={() => {
                      setShowFollowModal(false);
                      setSelectedTrader(null);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && selectedRelationship && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Copy Settings</h2>

              <div className="space-y-4">
                {/* Copy Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Copy Mode</label>
                  <select
                    value={copyMode}
                    onChange={(e) => setCopyMode(e.target.value as 'FIXED' | 'PERCENT')}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="FIXED">Fixed Amount</option>
                    <option value="PERCENT">Percentage of Trade</option>
                  </select>
                </div>

                {/* Copy Amount/Percent */}
                {copyMode === 'FIXED' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Copy Amount ($)
                    </label>
                    <input
                      type="number"
                      value={copyAmount}
                      onChange={(e) => setCopyAmount(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Copy Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={copyPercent}
                      onChange={(e) => setCopyPercent(e.target.value)}
                      min="1"
                      max="100"
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Max Daily Loss */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Max Daily Loss ($)
                  </label>
                  <input
                    type="number"
                    value={maxDailyLoss}
                    onChange={(e) => setMaxDailyLoss(e.target.value)}
                    placeholder="No limit"
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleUpdateSettings}
                    disabled={updateSettingsMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {updateSettingsMutation.isPending ? 'Updating...' : 'Update Settings'}
                  </button>
                  <button
                    onClick={() => {
                      setShowSettingsModal(false);
                      setSelectedRelationship(null);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
