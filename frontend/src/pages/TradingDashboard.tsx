import { useEffect, useState } from 'react';
import {
  BarChart3,
  Wallet,
  User,
  ShoppingBag,
  Trophy,
  MessageSquare,
  HelpCircle,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { TradingChart } from '../components/TradingChart';
import { TradingPanel } from '../components/TradingPanel';
import { SocialTrading } from '../components/SocialTrading';
import { AssetSelector } from '../components/AssetSelector';
import { useAuthStore } from '../store/authStore';
import { useTradingStore } from '../store/tradingStore';
import wsService from '../services/websocket';
import { walletAPI } from '../services/api';

export function TradingDashboard() {
  const { user, accessToken, logout } = useAuthStore();
  const { balance, walletType, setWalletType, setBalances, updatePrice } = useTradingStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'chart' | 'social'>('chart');

  useEffect(() => {
    if (accessToken) {
      wsService.connect(accessToken);
      loadWallets();

      // Subscribe to all price updates
      wsService.subscribeToAllPrices((priceUpdate) => {
        updatePrice(priceUpdate.assetId, priceUpdate.price);
      });

      // Subscribe to wallet updates
      wsService.subscribeToWallet((walletUpdate) => {
        loadWallets();
      });
    }

    return () => {
      wsService.disconnect();
    };
  }, [accessToken]);

  const loadWallets = async () => {
    try {
      const response = await walletAPI.getWallets();
      const wallets = response.data.data;
      const demoWallet = wallets.find((w: any) => w.type === 'DEMO');
      const realWallet = wallets.find((w: any) => w.type === 'REAL');

      setBalances(
        demoWallet?.balance || 0,
        realWallet?.balance || 0
      );
    } catch (error) {
      console.error('Failed to load wallets:', error);
    }
  };

  const handleLogout = () => {
    logout();
    wsService.disconnect();
    window.location.href = '/login';
  };

  const menuItems = [
    { icon: BarChart3, label: 'Trading', action: () => setActiveView('chart') },
    { icon: Wallet, label: 'Finance', action: () => {} },
    { icon: User, label: 'Profile', action: () => {} },
    { icon: ShoppingBag, label: 'Market', action: () => {} },
    { icon: Trophy, label: 'Tournaments', action: () => {} },
    { icon: MessageSquare, label: 'Chat', badge: '32', action: () => {} },
    { icon: HelpCircle, label: 'Help', action: () => {} },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen bg-gray-950 border-r border-gray-800 z-50 transition-transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } w-64 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-2xl font-bold">P</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">PoTrades</h1>
              <p className="text-xs text-gray-500">Trading Platform</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors group relative"
            >
              <item.icon className="w-5 h-5 text-gray-400 group-hover:text-white" />
              <span className="flex-1 text-left text-gray-300 group-hover:text-white">
                {item.label}
              </span>
              {item.badge && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
            <span className="text-gray-300">Settings</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-900/20 text-red-400 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-950 border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Asset Selector */}
            <div className="flex-1 max-w-md">
              <AssetSelector />
            </div>

            {/* Wallet Switcher & Balance */}
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setWalletType('DEMO')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    walletType === 'DEMO'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Demo
                </button>
                <button
                  onClick={() => setWalletType('REAL')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    walletType === 'REAL'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Real
                </button>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-400">
                  {walletType === 'DEMO' ? 'Demo Balance' : 'Real Balance'}
                </div>
                <div className="text-2xl font-bold">${balance.toFixed(2)}</div>
              </div>

              <button className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                + Deposit
              </button>

              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
            </div>
          </div>
        </header>

        {/* Trading Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 p-4 overflow-hidden">
          {/* Chart & Trading Panel */}
          <div className="grid grid-rows-[1fr_auto] gap-4">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <TradingChart />
            </div>
          </div>

          {/* Side Panel */}
          <div className="flex flex-col gap-4 overflow-y-auto">
            <TradingPanel />

            {/* Tab Switcher */}
            <div className="flex bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveView('chart')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeView === 'chart'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Active Trades
              </button>
              <button
                onClick={() => setActiveView('social')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeView === 'social'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Social Trading
              </button>
            </div>

            {/* Content based on active view */}
            {activeView === 'social' && <SocialTrading />}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}
    </div>
  );
}
