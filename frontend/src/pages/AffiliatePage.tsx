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
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'referrals'>('overview');

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
          <div className="flex gap-6">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'commissions', label: 'Commissions' },
              { key: 'referrals', label: 'Referrals' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-4 px-2 font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-blue-500 border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
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
      </div>
    </div>
  );
}
