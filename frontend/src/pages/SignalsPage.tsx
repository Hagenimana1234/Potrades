import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { signalsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { TrendingUp, Bell, BellOff, Eye, Users, Activity, Target, AlertTriangle, Check, X } from 'lucide-react';

type TabType = 'browse' | 'subscriptions' | 'my-signals';

export function SignalsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ACTIVE');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'browse', label: 'Browse Signals', icon: TrendingUp },
    { id: 'subscriptions', label: 'My Subscriptions', icon: Bell },
    { id: 'my-signals', label: 'My Signals', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Trading Signals</h1>
            <p className="text-gray-400 mt-1">Expert signals and recommendations</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            + Create Signal
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 font-semibold transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'browse' && <BrowseSignalsTab selectedAsset={selectedAsset} selectedStatus={selectedStatus} />}
        {activeTab === 'subscriptions' && <SubscriptionsTab />}
        {activeTab === 'my-signals' && <MySignalsTab />}

        {/* Create Signal Modal */}
        {showCreateModal && <CreateSignalModal onClose={() => setShowCreateModal(false)} />}
      </div>
    </div>
  );
}

// Browse Signals Tab
function BrowseSignalsTab({ selectedAsset, selectedStatus }: { selectedAsset: string; selectedStatus: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['signals', 'browse', selectedAsset, selectedStatus],
    queryFn: async () => {
      const response = await signalsAPI.getActiveSignals(selectedAsset || undefined);
      return response.data.data;
    },
  });

  const queryClient = useQueryClient();

  const subscribeMutation = useMutation({
    mutationFn: (signalId: string) => signalsAPI.subscribeToSignal(signalId, { autoCopy: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      toast.success('Subscribed to signal');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const signals = data || [];

  return (
    <div>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Signals" value={signals.length} icon={TrendingUp} color="blue" />
        <StatCard label="Avg Success Rate" value="67.3%" icon={Target} color="green" />
        <StatCard label="Total Subscribers" value="1,243" icon={Users} color="purple" />
        <StatCard label="Avg Profit" value="+12.4%" icon={Activity} color="yellow" />
      </div>

      {/* Signals List */}
      <div className="space-y-4">
        {signals.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-50" />
            <p>No active signals found</p>
          </div>
        ) : (
          signals.map((signal: any) => (
            <div key={signal.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        signal.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {signal.type}
                    </span>
                    <h3 className="text-xl font-bold">{signal.title}</h3>
                  </div>

                  <p className="text-gray-400 mb-4">{signal.description || 'No description provided'}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <InfoItem label="Asset" value={signal.asset?.symbol || 'N/A'} />
                    <InfoItem label="Entry Price" value={`$${parseFloat(signal.entryPrice).toFixed(4)}`} />
                    <InfoItem
                      label="Target"
                      value={signal.targetPrice ? `$${parseFloat(signal.targetPrice).toFixed(4)}` : 'N/A'}
                    />
                    <InfoItem
                      label="Stop Loss"
                      value={signal.stopLoss ? `$${parseFloat(signal.stopLoss).toFixed(4)}` : 'N/A'}
                    />
                  </div>

                  <div className="flex items-center space-x-6 text-sm text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Eye size={16} />
                      <span>{signal.viewCount} views</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users size={16} />
                      <span>{signal.copyCount} subscribers</span>
                    </div>
                    {signal.timeframe && (
                      <div className="flex items-center space-x-1">
                        <Activity size={16} />
                        <span>{signal.timeframe}</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => subscribeMutation.mutate(signal.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                  disabled={subscribeMutation.isPending}
                >
                  {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Subscriptions Tab
function SubscriptionsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['signals', 'subscriptions'],
    queryFn: async () => {
      const response = await signalsAPI.getMySubscriptions();
      return response.data.data;
    },
  });

  const queryClient = useQueryClient();

  const unsubscribeMutation = useMutation({
    mutationFn: (signalId: string) => signalsAPI.unsubscribeFromSignal(signalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      toast.success('Unsubscribed from signal');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unsubscribe');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const subscriptions = data || [];

  return (
    <div>
      {subscriptions.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <BellOff size={48} className="mx-auto mb-4 opacity-50" />
          <p>You haven't subscribed to any signals yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub: any) => (
            <div key={sub.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        sub.signal.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {sub.signal.type}
                    </span>
                    <h3 className="text-xl font-bold">{sub.signal.title}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        sub.signal.status === 'ACTIVE'
                          ? 'bg-green-500/20 text-green-400'
                          : sub.signal.status === 'CLOSED'
                          ? 'bg-gray-500/20 text-gray-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {sub.signal.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <InfoItem label="Asset" value={sub.signal.asset?.symbol || 'N/A'} />
                    <InfoItem label="Entry Price" value={`$${parseFloat(sub.signal.entryPrice).toFixed(4)}`} />
                    <InfoItem
                      label="Auto Copy"
                      value={
                        <span className={sub.autoCopy ? 'text-green-400' : 'text-gray-400'}>
                          {sub.autoCopy ? 'Enabled' : 'Disabled'}
                        </span>
                      }
                    />
                    <InfoItem
                      label="Copy Amount"
                      value={sub.copyAmount ? `$${parseFloat(sub.copyAmount).toFixed(2)}` : 'N/A'}
                    />
                  </div>

                  {sub.signal.status === 'CLOSED' && sub.signal.profitPercent && (
                    <div
                      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-lg font-semibold ${
                        parseFloat(sub.signal.profitPercent) > 0
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {parseFloat(sub.signal.profitPercent) > 0 ? <Check size={16} /> : <X size={16} />}
                      <span>Result: {parseFloat(sub.signal.profitPercent).toFixed(2)}%</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => unsubscribeMutation.mutate(sub.signal.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                  disabled={unsubscribeMutation.isPending}
                >
                  {unsubscribeMutation.isPending ? 'Unsubscribing...' : 'Unsubscribe'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// My Signals Tab (for signal providers)
function MySignalsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['signals', 'my-signals'],
    queryFn: async () => {
      const response = await signalsAPI.getMySignals();
      return response.data.data;
    },
  });

  const queryClient = useQueryClient();

  const closeSignalMutation = useMutation({
    mutationFn: ({ signalId, exitPrice }: { signalId: string; exitPrice: number }) =>
      signalsAPI.closeSignal(signalId, { exitPrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      toast.success('Signal closed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to close signal');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const signals = data || [];

  return (
    <div>
      {signals.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <Activity size={48} className="mx-auto mb-4 opacity-50" />
          <p>You haven't created any signals yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {signals.map((signal: any) => (
            <div key={signal.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        signal.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {signal.type}
                    </span>
                    <h3 className="text-xl font-bold">{signal.title}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        signal.status === 'ACTIVE'
                          ? 'bg-green-500/20 text-green-400'
                          : signal.status === 'CLOSED'
                          ? 'bg-gray-500/20 text-gray-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {signal.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <InfoItem label="Asset" value={signal.asset?.symbol || 'N/A'} />
                    <InfoItem label="Entry Price" value={`$${parseFloat(signal.entryPrice).toFixed(4)}`} />
                    <InfoItem
                      label="Exit Price"
                      value={signal.exitPrice ? `$${parseFloat(signal.exitPrice).toFixed(4)}` : 'N/A'}
                    />
                    <InfoItem label="Subscribers" value={signal.subscribers?.length || 0} />
                    <InfoItem label="Views" value={signal.viewCount} />
                  </div>

                  {signal.status === 'CLOSED' && signal.profitPercent && (
                    <div
                      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-lg font-semibold ${
                        parseFloat(signal.profitPercent) > 0
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {parseFloat(signal.profitPercent) > 0 ? <Check size={16} /> : <X size={16} />}
                      <span>Result: {parseFloat(signal.profitPercent).toFixed(2)}%</span>
                    </div>
                  )}
                </div>

                {signal.status === 'ACTIVE' && (
                  <button
                    onClick={() => {
                      const exitPrice = prompt('Enter exit price:');
                      if (exitPrice) {
                        closeSignalMutation.mutate({
                          signalId: signal.id,
                          exitPrice: parseFloat(exitPrice),
                        });
                      }
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                  >
                    Close Signal
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Create Signal Modal
function CreateSignalModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    assetId: '',
    type: 'BUY',
    entryPrice: '',
    targetPrice: '',
    stopLoss: '',
    title: '',
    description: '',
    timeframe: '4H',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => signalsAPI.createSignal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signals'] });
      toast.success('Signal created successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create signal');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      entryPrice: parseFloat(formData.entryPrice),
      targetPrice: formData.targetPrice ? parseFloat(formData.targetPrice) : undefined,
      stopLoss: formData.stopLoss ? parseFloat(formData.stopLoss) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Create New Signal</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Signal Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Timeframe</label>
              <select
                value={formData.timeframe}
                onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="15M">15 Minutes</option>
                <option value="1H">1 Hour</option>
                <option value="4H">4 Hours</option>
                <option value="1D">1 Day</option>
                <option value="1W">1 Week</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Entry Price</label>
              <input
                type="number"
                step="0.0001"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Target Price</label>
              <input
                type="number"
                step="0.0001"
                value={formData.targetPrice}
                onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Stop Loss</label>
              <input
                type="number"
                step="0.0001"
                value={formData.stopLoss}
                onChange={(e) => setFormData({ ...formData, stopLoss: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              rows={4}
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Signal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${colors[color]} mb-2`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-gray-400 text-sm">{label}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
