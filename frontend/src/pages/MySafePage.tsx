import { useState, useEffect } from 'react';
import { savingsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Vault,
  TrendingUp,
  Clock,
  DollarSign,
  Lock,
  Unlock,
  AlertTriangle,
  Calculator,
  PiggyBank,
  Calendar,
  BarChart3,
  Plus,
  X,
} from 'lucide-react';

interface SavingsPlan {
  id: string;
  name: string;
  type: 'FIXED' | 'FLEXIBLE';
  annualRate: number;
  compoundFrequency: string;
  minAmount: number;
  maxAmount: number | null;
  lockDays: number | null;
  earlyWithdrawalFee: number | null;
  description: string;
  activeDeposits: number;
}

interface SavingsDeposit {
  id: string;
  planName: string;
  planType: 'FIXED' | 'FLEXIBLE';
  status: string;
  principal: number;
  currentInterest: number;
  totalValue: number;
  interestRate: number;
  lockedUntil: Date | null;
  daysRemaining: number | null;
  isMatured: boolean;
  earlyWithdrawalFee: number | null;
  createdAt: Date;
}

interface Analytics {
  totalPrincipal: number;
  totalCurrentValue: number;
  totalInterestEarned: number;
  totalProfit: number;
  activeDepositsCount: number;
  averageAPY: number;
  byPlanType: Record<string, { count: number; totalValue: number }>;
}

export function MySafePage() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [mySavings, setMySavings] = useState<SavingsDeposit[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activeTab, setActiveTab] = useState<'plans' | 'my-savings' | 'analytics'>('plans');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SavingsPlan | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<SavingsDeposit | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [estimatedReturns, setEstimatedReturns] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [plansRes, savingsRes, analyticsRes] = await Promise.all([
        savingsAPI.getPlans(),
        savingsAPI.getMySavings(),
        savingsAPI.getAnalytics(),
      ]);

      setPlans(plansRes.data.data);
      setMySavings(savingsRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (error: any) {
      toast.error('Failed to load savings data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!selectedPlan || !depositAmount) return;

    try {
      setSubmitting(true);

      await savingsAPI.deposit({
        planId: selectedPlan.id,
        amount: parseFloat(depositAmount),
      });

      toast.success('Deposit successful!');
      setShowDepositModal(false);
      setSelectedPlan(null);
      setDepositAmount('');
      setEstimatedReturns(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create deposit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedDeposit) return;

    try {
      setSubmitting(true);

      const result = await savingsAPI.withdraw(selectedDeposit.id);

      if (result.data.data.earlyWithdrawal) {
        toast.success(`Withdrawal completed. Penalty: $${result.data.data.penalty.toFixed(2)}`);
      } else {
        toast.success('Withdrawal completed successfully!');
      }

      setShowWithdrawModal(false);
      setSelectedDeposit(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to withdraw');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEstimateReturns = async () => {
    if (!selectedPlan || !depositAmount) return;

    try {
      const response = await savingsAPI.estimateReturns({
        planId: selectedPlan.id,
        amount: parseFloat(depositAmount),
        days: selectedPlan.lockDays || 365,
      });

      setEstimatedReturns(response.data.data);
    } catch (error: any) {
      toast.error('Failed to estimate returns');
    }
  };

  useEffect(() => {
    if (selectedPlan && depositAmount && parseFloat(depositAmount) >= selectedPlan.minAmount) {
      handleEstimateReturns();
    } else {
      setEstimatedReturns(null);
    }
  }, [selectedPlan, depositAmount]);

  const getPlanIcon = (type: string) => {
    return type === 'FIXED' ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-500/10 text-green-500',
      MATURED: 'bg-blue-500/10 text-blue-500',
      WITHDRAWN: 'bg-gray-500/10 text-gray-500',
      CLOSED: 'bg-red-500/10 text-red-500',
    };
    return colors[status] || colors.ACTIVE;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading My Safe...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Vault className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-white">My Safe</h1>
          </div>
          <p className="text-gray-400">Grow your wealth with our secure savings plans</p>
        </div>

        {/* Quick Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Total Value</p>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-white">${analytics.totalCurrentValue.toFixed(2)}</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Total Interest</p>
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-white">${analytics.totalProfit.toFixed(2)}</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Active Deposits</p>
                <PiggyBank className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-white">{analytics.activeDepositsCount}</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-400 text-sm">Avg APY</p>
                <BarChart3 className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-2xl font-bold text-white">{analytics.averageAPY.toFixed(2)}%</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <div className="flex gap-6">
            {[
              { key: 'plans', label: 'Savings Plans', icon: Vault },
              { key: 'my-savings', label: 'My Savings', icon: PiggyBank },
              { key: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-4 px-2 font-medium transition-colors flex items-center gap-2 ${
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

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">Available Savings Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                      <div className="flex items-center gap-2">
                        {getPlanIcon(plan.type)}
                        <span className="text-sm text-gray-400">{plan.type}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-green-500">{plan.annualRate.toFixed(2)}%</p>
                      <p className="text-xs text-gray-400">APY</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-400 mb-4">{plan.description}</p>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Min Amount:</span>
                      <span className="text-white font-medium">${plan.minAmount}</span>
                    </div>
                    {plan.maxAmount && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Max Amount:</span>
                        <span className="text-white font-medium">${plan.maxAmount}</span>
                      </div>
                    )}
                    {plan.lockDays && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Lock Period:</span>
                        <span className="text-white font-medium">{plan.lockDays} days</span>
                      </div>
                    )}
                    {plan.earlyWithdrawalFee && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Early Penalty:</span>
                        <span className="text-yellow-500 font-medium">{plan.earlyWithdrawalFee}%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Compound:</span>
                      <span className="text-white font-medium">{plan.compoundFrequency}</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setShowDepositModal(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Deposit Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Savings Tab */}
        {activeTab === 'my-savings' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4">My Active Savings</h2>
            {mySavings.length === 0 ? (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-12 text-center">
                <PiggyBank className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No savings yet</p>
                <p className="text-gray-500 text-sm mt-2">Start growing your wealth with our savings plans</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mySavings.map((deposit) => (
                  <div
                    key={deposit.id}
                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{deposit.planName}</h3>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(deposit.status)}`}>
                          {deposit.status}
                        </span>
                      </div>
                      {getPlanIcon(deposit.planType)}
                    </div>

                    {/* Amounts */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Total Value</p>
                        <p className="text-2xl font-bold text-white">${deposit.totalValue.toFixed(2)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Principal</p>
                          <p className="text-lg font-semibold text-gray-300">${deposit.principal.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Interest Earned</p>
                          <p className="text-lg font-semibold text-green-500">+${deposit.currentInterest.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Lock Status */}
                    {deposit.planType === 'FIXED' && deposit.lockedUntil && (
                      <div className={`p-3 rounded-lg mb-4 ${deposit.isMatured ? 'bg-blue-500/10' : 'bg-yellow-500/10'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Clock className={`w-4 h-4 ${deposit.isMatured ? 'text-blue-500' : 'text-yellow-500'}`} />
                          <p className={`text-sm font-medium ${deposit.isMatured ? 'text-blue-500' : 'text-yellow-500'}`}>
                            {deposit.isMatured ? 'Matured' : `${deposit.daysRemaining} days remaining`}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400">
                          Matures: {new Date(deposit.lockedUntil).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {/* Early Withdrawal Warning */}
                    {deposit.planType === 'FIXED' && !deposit.isMatured && deposit.earlyWithdrawalFee && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg mb-4">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-yellow-500 font-medium">Early Withdrawal Penalty</p>
                          <p className="text-xs text-gray-400">
                            {deposit.earlyWithdrawalFee}% penalty on principal if withdrawn before maturity
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div className="border-t border-gray-700 pt-3 space-y-1 mb-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">APY:</span>
                        <span className="text-white font-medium">{deposit.interestRate.toFixed(2)}%</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">Started:</span>
                        <span className="text-white font-medium">
                          {new Date(deposit.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Withdraw Button */}
                    {deposit.status === 'ACTIVE' && (
                      <button
                        onClick={() => {
                          setSelectedDeposit(deposit);
                          setShowWithdrawModal(true);
                        }}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium transition-colors"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && analytics && (
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Savings Analytics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Summary Card */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Principal:</span>
                    <span className="text-white font-bold text-lg">${analytics.totalPrincipal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Current Value:</span>
                    <span className="text-white font-bold text-lg">${analytics.totalCurrentValue.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total Profit:</span>
                    <span className="text-green-500 font-bold text-lg">+${analytics.totalProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">ROI:</span>
                    <span className="text-blue-500 font-bold text-lg">
                      {analytics.totalPrincipal > 0
                        ? ((analytics.totalProfit / analytics.totalPrincipal) * 100).toFixed(2)
                        : '0.00'}
                      %
                    </span>
                  </div>
                </div>
              </div>

              {/* By Plan Type */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">By Plan Type</h3>
                <div className="space-y-4">
                  {Object.entries(analytics.byPlanType).map(([type, data]) => (
                    <div key={type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getPlanIcon(type)}
                          <span className="text-white font-medium">{type}</span>
                        </div>
                        <span className="text-gray-400 text-sm">{data.count} deposits</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">Total Value:</span>
                        <span className="text-white font-semibold">${data.totalValue.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${analytics.totalCurrentValue > 0 ? (data.totalValue / analytics.totalCurrentValue) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Modal */}
        {showDepositModal && selectedPlan && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Deposit to {selectedPlan.name}</h3>
                <button
                  onClick={() => {
                    setShowDepositModal(false);
                    setSelectedPlan(null);
                    setDepositAmount('');
                    setEstimatedReturns(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                    placeholder={`Min: $${selectedPlan.minAmount}`}
                    min={selectedPlan.minAmount}
                    max={selectedPlan.maxAmount || undefined}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Min: ${selectedPlan.minAmount}
                    {selectedPlan.maxAmount && ` | Max: $${selectedPlan.maxAmount}`}
                  </p>
                </div>

                {/* Estimated Returns */}
                {estimatedReturns && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Calculator className="w-4 h-4 text-blue-500" />
                      <p className="text-sm font-medium text-blue-500">Estimated Returns</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Period:</span>
                        <span className="text-white">{estimatedReturns.days} days</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Interest:</span>
                        <span className="text-green-500 font-bold">
                          +${estimatedReturns.estimatedInterest.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Final Value:</span>
                        <span className="text-white font-bold text-lg">
                          ${estimatedReturns.estimatedValue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lock Warning */}
                {selectedPlan.type === 'FIXED' && selectedPlan.lockDays && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10 rounded-lg">
                    <Lock className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-yellow-500 font-medium">Lock Period</p>
                      <p className="text-xs text-gray-400">
                        Funds will be locked for {selectedPlan.lockDays} days. Early withdrawal incurs a {selectedPlan.earlyWithdrawalFee}% penalty.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowDepositModal(false);
                      setSelectedPlan(null);
                      setDepositAmount('');
                      setEstimatedReturns(null);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeposit}
                    disabled={
                      submitting ||
                      !depositAmount ||
                      parseFloat(depositAmount) < selectedPlan.minAmount ||
                      (selectedPlan.maxAmount && parseFloat(depositAmount) > selectedPlan.maxAmount)
                    }
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
                  >
                    {submitting ? 'Processing...' : 'Confirm Deposit'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && selectedDeposit && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Withdraw from {selectedDeposit.planName}</h3>
                <button
                  onClick={() => {
                    setShowWithdrawModal(false);
                    setSelectedDeposit(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Withdrawal Amount */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-2">You will receive:</p>
                  <p className="text-3xl font-bold text-white mb-2">
                    ${selectedDeposit.totalValue.toFixed(2)}
                  </p>
                  <div className="text-xs text-gray-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Principal:</span>
                      <span>${selectedDeposit.principal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interest:</span>
                      <span className="text-green-500">+${selectedDeposit.currentInterest.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Early Withdrawal Warning */}
                {selectedDeposit.planType === 'FIXED' && !selectedDeposit.isMatured && selectedDeposit.earlyWithdrawalFee && (
                  <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-red-500 font-medium">Early Withdrawal Penalty</p>
                      <p className="text-xs text-gray-400 mb-2">
                        Withdrawing before maturity will incur a {selectedDeposit.earlyWithdrawalFee}% penalty on your principal.
                      </p>
                      <p className="text-xs text-red-400">
                        Penalty: ${((selectedDeposit.principal * selectedDeposit.earlyWithdrawalFee) / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-white font-medium mt-1">
                        Final Amount: ${(selectedDeposit.totalValue - (selectedDeposit.principal * selectedDeposit.earlyWithdrawalFee) / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowWithdrawModal(false);
                      setSelectedDeposit(null);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWithdraw}
                    disabled={submitting}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
                  >
                    {submitting ? 'Processing...' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
