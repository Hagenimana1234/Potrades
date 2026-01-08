import { useState, useEffect } from 'react';
import { financeAPI } from '../services/api';
import toast from 'react-hot-toast';
import { Wallet, Edit2, Trash2, Plus, Copy, Check } from 'lucide-react';

interface PlatformWallet {
  id: string;
  network: string;
  address: string;
  label?: string;
  notes?: string;
  qrCode?: string;
  isActive: boolean;
  totalDeposits: number;
  depositCount: number;
  createdAt: string;
  updatedAt: string;
}

export function AdminWalletsPage() {
  const [wallets, setWallets] = useState<PlatformWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<PlatformWallet | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    network: '',
    address: '',
    label: '',
    notes: '',
  });

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      setLoading(true);
      const response = await financeAPI.getAllPlatformWallets();
      setWallets(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingWallet) {
        // Update existing wallet
        await financeAPI.updatePlatformWallet(editingWallet.network, formData);
        toast.success('Wallet updated successfully');
      } else {
        // Create new wallet
        await financeAPI.createPlatformWallet(formData);
        toast.success('Wallet created successfully');
      }

      setShowCreateModal(false);
      setEditingWallet(null);
      setFormData({ network: '', address: '', label: '', notes: '' });
      loadWallets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save wallet');
    }
  };

  const handleEdit = (wallet: PlatformWallet) => {
    setEditingWallet(wallet);
    setFormData({
      network: wallet.network,
      address: wallet.address,
      label: wallet.label || '',
      notes: wallet.notes || '',
    });
    setShowCreateModal(true);
  };

  const handleDeactivate = async (network: string) => {
    if (!confirm('Are you sure you want to deactivate this wallet?')) {
      return;
    }

    try {
      await financeAPI.deactivatePlatformWallet(network);
      toast.success('Wallet deactivated successfully');
      loadWallets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to deactivate wallet');
    }
  };

  const handleToggleActive = async (wallet: PlatformWallet) => {
    try {
      await financeAPI.updatePlatformWallet(wallet.network, {
        isActive: !wallet.isActive,
      });
      toast.success(`Wallet ${wallet.isActive ? 'deactivated' : 'activated'} successfully`);
      loadWallets();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update wallet');
    }
  };

  const copyToClipboard = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    toast.success('Address copied to clipboard');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const networkColors: Record<string, string> = {
    BTC: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    ETH: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    TRC20: 'bg-red-500/10 text-red-500 border-red-500/20',
    ERC20: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    BEP20: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    SOL: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Platform Wallets</h1>
            <p className="text-gray-400">Manage crypto deposit addresses</p>
          </div>
          <button
            onClick={() => {
              setEditingWallet(null);
              setFormData({ network: '', address: '', label: '', notes: '' });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Wallet
          </button>
        </div>

        {/* Wallets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-gray-600 transition-colors"
            >
              {/* Network Badge */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`px-3 py-1 rounded-lg text-sm font-semibold border ${
                    networkColors[wallet.network] || 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                  }`}
                >
                  {wallet.network}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(wallet)}
                    className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(wallet)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      wallet.isActive
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                        : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                    }`}
                  >
                    {wallet.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Label */}
              {wallet.label && (
                <h3 className="text-white font-semibold mb-2">{wallet.label}</h3>
              )}

              {/* Address */}
              <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-sm font-mono truncate flex-1">
                    {wallet.address}
                  </p>
                  <button
                    onClick={() => copyToClipboard(wallet.address)}
                    className="ml-2 p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    {copiedAddress === wallet.address ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 mb-1">Total Deposits</p>
                  <p className="text-white font-semibold">
                    ${wallet.totalDeposits.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Count</p>
                  <p className="text-white font-semibold">{wallet.depositCount}</p>
                </div>
              </div>

              {/* Notes */}
              {wallet.notes && (
                <p className="text-gray-400 text-sm mt-4 pt-4 border-t border-gray-700">
                  {wallet.notes}
                </p>
              )}
            </div>
          ))}
        </div>

        {wallets.length === 0 && (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No platform wallets configured</p>
            <p className="text-gray-500 text-sm mt-2">
              Add your first wallet to start accepting crypto deposits
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl border border-gray-700 max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingWallet ? 'Edit Wallet' : 'Add Wallet'}
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Network */}
              <div className="mb-4">
                <label className="block text-gray-400 mb-2 text-sm">Network</label>
                <select
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  disabled={!!editingWallet}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  required
                >
                  <option value="">Select Network</option>
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="TRC20">USDT (TRC20)</option>
                  <option value="ERC20">USDT (ERC20)</option>
                  <option value="BEP20">USDT (BEP20)</option>
                  <option value="SOL">Solana (SOL)</option>
                </select>
              </div>

              {/* Address */}
              <div className="mb-4">
                <label className="block text-gray-400 mb-2 text-sm">Wallet Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Enter wallet address"
                  required
                />
              </div>

              {/* Label */}
              <div className="mb-4">
                <label className="block text-gray-400 mb-2 text-sm">Label (Optional)</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="e.g., Main BTC Wallet"
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-gray-400 mb-2 text-sm">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                  rows={3}
                  placeholder="Internal notes..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingWallet(null);
                    setFormData({ network: '', address: '', label: '', notes: '' });
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition-colors"
                >
                  {editingWallet ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
