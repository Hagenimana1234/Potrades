import { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Upload,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { financeAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-hot-toast';

interface PlatformWallet {
  id: string;
  network: string;
  address: string;
  qrCode?: string;
  label?: string;
}

interface Deposit {
  id: string;
  amount: string;
  currency: string;
  method: string;
  status: string;
  cryptoNetwork?: string;
  txHash?: string;
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
}

interface Withdrawal {
  id: string;
  amount: string;
  currency: string;
  method: string;
  status: string;
  cryptoNetwork?: string;
  cryptoAddress?: string;
  txHash?: string;
  createdAt: string;
  approvedAt?: string;
  rejectionReason?: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  currency: string;
  description?: string;
  createdAt: string;
}

interface PnLSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  totalWins: number;
  totalLosses: number;
  netTradingPnL: number;
  totalPnL: number;
}

export function FinancePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw' | 'history'>('deposit');
  const [platformWallets, setPlatformWallets] = useState<PlatformWallet[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pnl, setPnl] = useState<PnLSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Deposit form state
  const [depositForm, setDepositForm] = useState({
    amount: '',
    method: 'CRYPTO_BTC',
    cryptoNetwork: 'BTC',
    txHash: '',
    walletAddress: '',
  });

  // Withdrawal form state
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    method: 'CRYPTO_BTC',
    cryptoNetwork: 'BTC',
    cryptoAddress: '',
  });

  useEffect(() => {
    loadPlatformWallets();
    loadDeposits();
    loadWithdrawals();
    loadTransactions();
    loadPnL();
  }, []);

  const loadPlatformWallets = async () => {
    try {
      const response = await financeAPI.getPlatformWallets();
      setPlatformWallets(response.data.data);
    } catch (error) {
      console.error('Failed to load platform wallets:', error);
    }
  };

  const loadDeposits = async () => {
    try {
      const response = await financeAPI.getDeposits();
      setDeposits(response.data.data);
    } catch (error) {
      console.error('Failed to load deposits:', error);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const response = await financeAPI.getWithdrawals();
      setWithdrawals(response.data.data);
    } catch (error) {
      console.error('Failed to load withdrawals:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await financeAPI.getTransactions();
      setTransactions(response.data.data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const loadPnL = async () => {
    try {
      const response = await financeAPI.getPnL();
      setPnl(response.data.data);
    } catch (error) {
      console.error('Failed to load P&L:', error);
    }
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await financeAPI.createDeposit({
        amount: parseFloat(depositForm.amount),
        currency: 'USD',
        method: depositForm.method,
        cryptoNetwork: depositForm.cryptoNetwork,
        txHash: depositForm.txHash,
        walletAddress: depositForm.walletAddress,
      });

      toast.success('Deposit request submitted! Awaiting admin approval.');
      setDepositForm({
        amount: '',
        method: 'CRYPTO_BTC',
        cryptoNetwork: 'BTC',
        txHash: '',
        walletAddress: '',
      });
      loadDeposits();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await financeAPI.createWithdrawal({
        amount: parseFloat(withdrawalForm.amount),
        currency: 'USD',
        method: withdrawalForm.method,
        cryptoNetwork: withdrawalForm.cryptoNetwork,
        cryptoAddress: withdrawalForm.cryptoAddress,
        destination: {
          cryptoAddress: withdrawalForm.cryptoAddress,
          network: withdrawalForm.cryptoNetwork,
        },
      });

      toast.success('Withdrawal request submitted! Awaiting admin approval.');
      setWithdrawalForm({
        amount: '',
        method: 'CRYPTO_BTC',
        cryptoNetwork: 'BTC',
        cryptoAddress: '',
      });
      loadWithdrawals();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      PENDING: 'bg-yellow-500/20 text-yellow-500',
      COMPLETED: 'bg-green-500/20 text-green-500',
      FAILED: 'bg-red-500/20 text-red-500',
      REJECTED: 'bg-red-500/20 text-red-500',
      APPROVED: 'bg-blue-500/20 text-blue-500',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-500/20 text-gray-500'}`}>
        {status}
      </span>
    );
  };

  const selectedWallet = platformWallets.find((w) => w.network === depositForm.cryptoNetwork);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Finance</h1>
          <p className="text-gray-400">Manage your deposits, withdrawals, and view transaction history</p>
        </div>

        {/* P&L Summary Cards */}
        {pnl && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Deposits</p>
                  <p className="text-2xl font-bold text-green-500">${pnl.totalDeposits.toFixed(2)}</p>
                </div>
                <ArrowDownCircle className="w-10 h-10 text-green-500" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Withdrawals</p>
                  <p className="text-2xl font-bold text-red-500">${pnl.totalWithdrawals.toFixed(2)}</p>
                </div>
                <ArrowUpCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Net Trading P&L</p>
                  <p className={`text-2xl font-bold ${pnl.netTradingPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${pnl.netTradingPnL.toFixed(2)}
                  </p>
                </div>
                {pnl.netTradingPnL >= 0 ? (
                  <TrendingUp className="w-10 h-10 text-green-500" />
                ) : (
                  <TrendingDown className="w-10 h-10 text-red-500" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg mb-6">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('deposit')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'deposit' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setActiveTab('withdraw')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'withdraw' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              Withdraw
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'history' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
              }`}
            >
              History
            </button>
          </div>

          {/* Deposit Tab */}
          {activeTab === 'deposit' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Deposit Form */}
                <div>
                  <h3 className="text-xl font-bold mb-4">Submit Deposit</h3>
                  <form onSubmit={handleDepositSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Network</label>
                      <select
                        value={depositForm.cryptoNetwork}
                        onChange={(e) =>
                          setDepositForm({
                            ...depositForm,
                            cryptoNetwork: e.target.value,
                            method: `CRYPTO_${e.target.value.split('_')[0]}`,
                          })
                        }
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="BTC">Bitcoin (BTC)</option>
                        <option value="ETH">Ethereum (ETH)</option>
                        <option value="TRC20">USDT (TRC20 - Tron)</option>
                        <option value="ERC20">USDT (ERC20 - Ethereum)</option>
                        <option value="BEP20">USDT (BEP20 - BSC)</option>
                        <option value="SOL">Solana (SOL)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={depositForm.amount}
                        onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="100.00"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Transaction Hash</label>
                      <input
                        type="text"
                        value={depositForm.txHash}
                        onChange={(e) => setDepositForm({ ...depositForm, txHash: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter transaction hash"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                    >
                      {loading ? 'Submitting...' : 'Submit Deposit'}
                    </button>
                  </form>
                </div>

                {/* Platform Wallet Address */}
                <div>
                  <h3 className="text-xl font-bold mb-4">Deposit Address</h3>
                  {selectedWallet ? (
                    <div className="bg-gray-700 rounded-lg p-6 space-y-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-2">Network</p>
                        <p className="font-semibold">{selectedWallet.label || selectedWallet.network}</p>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400 mb-2">Wallet Address</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={selectedWallet.address}
                            readOnly
                            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => copyToClipboard(selectedWallet.address)}
                            className="p-2 bg-gray-800 hover:bg-gray-600 rounded transition-colors"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <p className="text-yellow-500 text-sm">
                          <strong>Important:</strong> Send only {selectedWallet.network} to this address. After
                          sending, submit the transaction hash above for verification.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-700 rounded-lg p-6">
                      <p className="text-gray-400">Select a network to view deposit address</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Deposits */}
              <div className="mt-8">
                <h3 className="text-xl font-bold mb-4">Recent Deposits</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Network</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">TX Hash</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {deposits.slice(0, 5).map((deposit) => (
                        <tr key={deposit.id} className="hover:bg-gray-700/50">
                          <td className="px-4 py-3 font-semibold">${parseFloat(deposit.amount).toFixed(2)}</td>
                          <td className="px-4 py-3">{deposit.cryptoNetwork || deposit.method}</td>
                          <td className="px-4 py-3 text-sm text-gray-400 truncate max-w-xs">
                            {deposit.txHash || '-'}
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(deposit.status)}</td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {new Date(deposit.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {deposits.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                            No deposits yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Withdraw Tab */}
          {activeTab === 'withdraw' && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <h3 className="text-xl font-bold mb-4">Submit Withdrawal</h3>
                <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Network</label>
                    <select
                      value={withdrawalForm.cryptoNetwork}
                      onChange={(e) =>
                        setWithdrawalForm({
                          ...withdrawalForm,
                          cryptoNetwork: e.target.value,
                          method: `CRYPTO_${e.target.value.split('_')[0]}`,
                        })
                      }
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="ETH">Ethereum (ETH)</option>
                      <option value="TRC20">USDT (TRC20 - Tron)</option>
                      <option value="ERC20">USDT (ERC20 - Ethereum)</option>
                      <option value="BEP20">USDT (BEP20 - BSC)</option>
                      <option value="SOL">Solana (SOL)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={withdrawalForm.amount}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Your Wallet Address</label>
                    <input
                      type="text"
                      value={withdrawalForm.cryptoAddress}
                      onChange={(e) => setWithdrawalForm({ ...withdrawalForm, cryptoAddress: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your wallet address"
                      required
                    />
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <p className="text-yellow-500 text-sm">
                      <strong>Warning:</strong> Double-check your wallet address. Withdrawals to incorrect addresses
                      cannot be recovered.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold py-3 rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Submitting...' : 'Submit Withdrawal'}
                  </button>
                </form>

                {/* Recent Withdrawals */}
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-4">Recent Withdrawals</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Network</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {withdrawals.slice(0, 5).map((withdrawal) => (
                          <tr key={withdrawal.id} className="hover:bg-gray-700/50">
                            <td className="px-4 py-3 font-semibold">${parseFloat(withdrawal.amount).toFixed(2)}</td>
                            <td className="px-4 py-3">{withdrawal.cryptoNetwork || withdrawal.method}</td>
                            <td className="px-4 py-3">{getStatusBadge(withdrawal.status)}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {new Date(withdrawal.createdAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                        {withdrawals.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                              No withdrawals yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Transaction History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Balance After</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              tx.type.includes('WIN') || tx.type === 'DEPOSIT'
                                ? 'bg-green-500/20 text-green-500'
                                : 'bg-red-500/20 text-red-500'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className={`px-4 py-3 font-semibold ${parseFloat(tx.amount) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          ${Math.abs(parseFloat(tx.amount)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">${parseFloat(tx.balanceAfter).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{tx.description || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          No transactions yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
