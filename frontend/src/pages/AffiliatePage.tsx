import { useState, useEffect } from 'react';
import { affiliateAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Users,
  DollarSign,
  TrendingUp,
  Copy,
  Check,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  BarChart3,
  Wallet,
  Trophy,
  ArrowUp,
  ArrowDown,
  TrendingDown,
} from 'lucide-react';

interface AffiliateStats {
  affiliate: any;
  totalReferrals: number;
  activeReferrals: number;
  recentReferrals: any[];
  recentCommissions: any[];
  monthlyEarnings: number;
}

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  activeReferrals: number;
  referrals: any[];
}

interface Commission {
  id: string;
  type: string;
  amount: number;
  status: string;
  referredUserId: string;
  referenceType?: string;
  createdAt: string;
  paidAt?: string;
}

export function AffiliatePage() {
  const [loading, setLoading] = useState(true);
  const [isAffiliate, setIsAffiliate] = useState(false);
  const [applying, setApplying] = useState(false);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'referrals' | 'analytics' | 'payouts' | 'contests'>('overview');
  const [analytics, setAnalytics] = useState<any>(null);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [contests, setContests] = useState<any[]>([]);
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    method: 'CRYPTO',
    destination: { address: '' },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Check if user is affiliate
      try {
        const statsResponse = await affiliateAPI.getStats();
        setAffiliateStats(statsResponse.data.data);
        setIsAffiliate(true);

        // Load commissions
        const commissionsResponse = await affiliateAPI.getCommissions({ limit: 50 });
        setCommissions(commissionsResponse.data.data.commissions);

        // Load analytics
        const analyticsResponse = await affiliateAPI.getAnalytics(30);
        setAnalytics(analyticsResponse.data.data);

        // Load payouts
        const payoutsResponse = await affiliateAPI.getPayouts();
        setPayouts(payoutsResponse.data.data);

        // Load contests
        const contestsResponse = await affiliateAPI.getContests();
        setContests(contestsResponse.data.data);
      } catch (error: any) {
        if (error.response?.status === 404) {
          setIsAffiliate(false);
        }
      }

      // Load referral stats (available to all users)
      try {
        const refResponse = await affiliateAPI.getReferrals();
        setReferralStats(refResponse.data.data);
      } catch (error) {
        console.error('Failed to load referral stats:', error);
      }
    } catch (error: any) {
      toast.error('Failed to load affiliate data');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    try {
      setApplying(true);
      await affiliateAPI.apply({ commissionModel: 'REVENUE_SHARE' });
      toast.success('Application submitted! Awaiting admin approval.');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=${referralStats?.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await affiliateAPI.requestPayout({
        amount: parseFloat(payoutForm.amount),
        method: payoutForm.method,
        destination: payoutForm.destination,
      });
      toast.success('Payout requested successfully!');
      setShowPayoutModal(false);
      setPayoutForm({ amount: '', method: 'CRYPTO', destination: { address: '' } });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to request payout');
    }
  };

  const loadContestLeaderboard = async (contestId: string) => {
    try {
      const response = await affiliateAPI.getContestLeaderboard(contestId);
      setLeaderboard(response.data.data);
      setSelectedContest(contestId);
    } catch (error: any) {
      toast.error('Failed to load leaderboard');
    }
  };

  const getTierInfo = (tier: number) => {
    const tiers = [
      { name: 'Bronze', color: 'text-orange-400', icon: '🥉', commission: '30%' },
      { name: 'Silver', color: 'text-gray-300', icon: '🥈', commission: '35%' },
      { name: 'Gold', color: 'text-yellow-400', icon: '🥇', commission: '40%' },
      { name: 'Platinum', color: 'text-blue-400', icon: '💎', commission: '45%' },
    ];
    return tiers[tier - 1] || tiers[0];
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', icon: Clock },
      APPROVED: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: CheckCircle },
      PAID: { bg: 'bg-green-500/10', text: 'text-green-500', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-500/10', text: 'text-red-500', icon: XCircle },
      CANCELLED: { bg: 'bg-gray-500/10', text: 'text-gray-500', icon: XCircle },
    };

    const style = styles[status] || styles.PENDING;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading affiliate data...</div>
      </div>
    );
  }

  // Not an affiliate yet
  if (!isAffiliate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center">
            <Award className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4">Join Our Affiliate Program</h1>
            <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
              Earn generous commissions by referring traders to our platform. Get paid for every
              successful referral and earn ongoing revenue share from their trading activity.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900/50 rounded-lg p-6">
                <DollarSign className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">High Commissions</h3>
                <p className="text-gray-400 text-sm">
                  Earn up to 45% revenue share on referred traders
                </p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-6">
                <TrendingUp className="w-10 h-10 text-blue-500 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Multi-Tier System</h3>
                <p className="text-gray-400 text-sm">
                  Progress through tiers for higher commission rates
                </p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-6">
                <Users className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                <h3 className="text-white font-semibold mb-2">Lifetime Earnings</h3>
                <p className="text-gray-400 text-sm">
                  Earn from every trade your referrals make
                </p>
              </div>
            </div>

            {/* Referral Stats (available to all users) */}
            {referralStats && (
              <div className="bg-gray-900/30 rounded-lg p-6 mb-6">
                <h3 className="text-white font-semibold mb-4">Your Referral Link</h3>
                <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-3 mb-4">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/register?ref=${referralStats.referralCode}`}
                    className="flex-1 bg-transparent text-gray-300 font-mono text-sm focus:outline-none"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {copiedLink ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Total Referrals</p>
                    <p className="text-white font-bold text-xl">{referralStats.totalReferrals}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Active Referrals</p>
                    <p className="text-white font-bold text-xl">{referralStats.activeReferrals}</p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleApply}
              disabled={applying}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {applying ? 'Submitting...' : 'Apply Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Affiliate Dashboard
  const tierInfo = getTierInfo(affiliateStats!.affiliate.tier);
  const affiliate = affiliateStats!.affiliate;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-white">Affiliate Dashboard</h1>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Status:</span>
              {getStatusBadge(affiliate.status)}
            </div>
          </div>

          {/* Tier Badge */}
          <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-sm border border-gray-600/50 rounded-lg p-4 inline-block">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{tierInfo.icon}</span>
              <div>
                <p className="text-gray-400 text-sm">Current Tier</p>
                <p className={`text-xl font-bold ${tierInfo.color}`}>{tierInfo.name}</p>
              </div>
              <div className="ml-4 pl-4 border-l border-gray-600">
                <p className="text-gray-400 text-sm">Commission Rate</p>
                <p className="text-green-500 font-bold text-xl">{tierInfo.commission}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400">Total Earned</p>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              ${affiliate.paidCommission.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Lifetime earnings</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400">Pending</p>
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              ${affiliate.pendingCommission.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Awaiting payment</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400">This Month</p>
              <TrendingUp className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-white">
              ${affiliateStats!.monthlyEarnings.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Current month</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-400">Referrals</p>
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-white">{affiliateStats!.totalReferrals}</p>
            <p className="text-sm text-gray-500 mt-1">
              {affiliateStats!.activeReferrals} active
            </p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Your Referral Link</h2>
          <div className="flex items-center gap-2 bg-gray-900/50 rounded-lg p-4">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/register?ref=${affiliate.user.referralCode}`}
              className="flex-1 bg-transparent text-gray-300 font-mono focus:outline-none"
            />
            <button
              onClick={copyReferralLink}
              className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {copiedLink ? (
                <Check className="w-5 h-5 text-white" />
              ) : (
                <Copy className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { key: 'overview', label: 'Overview', icon: TrendingUp },
              { key: 'analytics', label: 'Analytics', icon: BarChart3 },
              { key: 'payouts', label: 'Payouts', icon: Wallet },
              { key: 'contests', label: 'Contests', icon: Trophy },
              { key: 'commissions', label: 'Commissions', icon: DollarSign },
              { key: 'referrals', label: 'Referrals', icon: Users },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Recent Commissions</h3>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              {affiliateStats!.recentCommissions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  No commissions yet. Start referring traders!
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {affiliateStats!.recentCommissions.slice(0, 5).map((commission: any) => (
                      <tr key={commission.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">
                            {commission.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-500">
                          ${commission.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">{getStatusBadge(commission.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'commissions' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">All Commissions</h3>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              {commissions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No commissions yet</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Paid Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {commissions.map((commission) => (
                      <tr key={commission.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className="px-2 py-1 bg-gray-700 rounded text-gray-300">
                            {commission.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {commission.referenceType || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-500">
                          ${commission.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm">{getStatusBadge(commission.status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {commission.paidAt
                            ? new Date(commission.paidAt).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'referrals' && (
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Your Referrals</h3>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              {affiliateStats!.recentReferrals.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No referrals yet</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Joined Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {affiliateStats!.recentReferrals.map((referral: any) => (
                      <tr key={referral.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4 text-sm text-gray-300">{referral.email}</td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              referral.status === 'ACTIVE'
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-gray-700 text-gray-400'
                            }`}
                          >
                            {referral.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Performance Analytics</h3>

            {/* Conversion Funnel */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400">Total Referrals</p>
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">{analytics.conversionFunnel.totalReferrals}</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400">Deposited</p>
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">{analytics.conversionFunnel.deposited}</p>
                  <p className="text-sm text-green-500 mt-1">
                    {analytics.conversionFunnel.depositRate.toFixed(1)}% conversion
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400">Traded</p>
                    <TrendingUp className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold text-white">{analytics.conversionFunnel.traded}</p>
                  <p className="text-sm text-purple-500 mt-1">
                    {analytics.conversionFunnel.tradeRate.toFixed(1)}% of depositors
                  </p>
                </div>
              </div>
            </div>

            {/* Top Referrals */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-white mb-4">Top Performing Referrals</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Rank</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">User</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Trades</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Total Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {analytics.topReferrals.slice(0, 10).map((ref: any, index: number) => (
                      <tr key={ref.id} className="hover:bg-gray-700/30">
                        <td className="px-4 py-3 text-sm text-gray-300">#{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-white">
                          {ref.firstName} {ref.lastName}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">{ref.tradeCount}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-green-500">
                          ${parseFloat(ref.totalCommissions || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Payouts</h3>
              <button
                onClick={() => setShowPayoutModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Request Payout
              </button>
            </div>

            {/* Payout Modal */}
            {showPayoutModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
                  <h4 className="text-xl font-bold text-white mb-4">Request Payout</h4>
                  <form onSubmit={handleRequestPayout} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Amount (USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={payoutForm.amount}
                        onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                        placeholder="Enter amount"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Available: ${affiliate.pendingCommission.toFixed(2)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Payment Method
                      </label>
                      <select
                        value={payoutForm.method}
                        onChange={(e) => setPayoutForm({ ...payoutForm, method: e.target.value })}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                      >
                        <option value="CRYPTO">Cryptocurrency</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="PAYPAL">PayPal</option>
                        <option value="WISE">Wise</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {payoutForm.method === 'CRYPTO' ? 'Wallet Address' : 'Account Details'}
                      </label>
                      <input
                        type="text"
                        value={payoutForm.destination.address}
                        onChange={(e) =>
                          setPayoutForm({
                            ...payoutForm,
                            destination: { address: e.target.value },
                          })
                        }
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono"
                        placeholder={
                          payoutForm.method === 'CRYPTO'
                            ? '0x...'
                            : 'Enter account details'
                        }
                        required
                      />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowPayoutModal(false)}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        Submit Request
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Payout History */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
              <h4 className="text-lg font-semibold text-white p-6 border-b border-gray-700">
                Payout History
              </h4>
              {payouts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No payouts yet</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                        Processed Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {payouts.map((payout: any) => (
                      <tr key={payout.id} className="hover:bg-gray-700/30">
                        <td className="px-6 py-4 text-sm text-gray-300">
                          {new Date(payout.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-green-500">
                          ${parseFloat(payout.amount).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">{payout.method}</td>
                        <td className="px-6 py-4 text-sm">{getStatusBadge(payout.status)}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {payout.processedAt
                            ? new Date(payout.processedAt).toLocaleDateString()
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Contests Tab */}
        {activeTab === 'contests' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-white">Affiliate Contests</h3>

            {contests.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 text-center text-gray-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p>No active contests at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contests.map((contest: any) => (
                  <div
                    key={contest.id}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-white mb-1">{contest.name}</h4>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            contest.status === 'ACTIVE'
                              ? 'bg-green-500/10 text-green-500'
                              : contest.status === 'UPCOMING'
                              ? 'bg-blue-500/10 text-blue-500'
                              : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {contest.status}
                        </span>
                      </div>
                      <Trophy className="w-6 h-6 text-yellow-500" />
                    </div>

                    <p className="text-gray-400 text-sm mb-4">{contest.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400">
                          {new Date(contest.startDate).toLocaleDateString()} -{' '}
                          {new Date(contest.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <BarChart3 className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400">Metric: {contest.metricType}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => loadContestLeaderboard(contest.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      View Leaderboard
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Leaderboard Modal */}
            {selectedContest && leaderboard.length > 0 && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full border border-gray-700 max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xl font-bold text-white">Contest Leaderboard</h4>
                    <button
                      onClick={() => {
                        setSelectedContest(null);
                        setLeaderboard([]);
                      }}
                      className="text-gray-400 hover:text-white"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <table className="w-full">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Rank</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Affiliate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Score</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Prize</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {leaderboard.map((entry: any) => (
                        <tr
                          key={entry.affiliateId}
                          className={`hover:bg-gray-700/30 ${
                            entry.rank <= 3 ? 'bg-yellow-500/5' : ''
                          }`}
                        >
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`font-bold ${
                                entry.rank === 1
                                  ? 'text-yellow-500'
                                  : entry.rank === 2
                                  ? 'text-gray-400'
                                  : entry.rank === 3
                                  ? 'text-orange-400'
                                  : 'text-white'
                              }`}
                            >
                              #{entry.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-white">
                            {entry.firstName} {entry.lastName}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-green-500">
                            ${parseFloat(entry.score || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {entry.prize || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
