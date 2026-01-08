import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Settings as SettingsIcon,
  Bell,
  Shield,
  DollarSign,
  TrendingUp,
  Palette,
  Key,
  Smartphone,
  LogOut,
  Clock,
  Eye,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { settingsAPI } from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

type Section = 'preferences' | 'notifications' | 'trading' | 'currency' | 'security';

interface Settings {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  emailNotifications?: {
    tradeAlerts?: boolean;
    depositWithdrawal?: boolean;
    marketing?: boolean;
    security?: boolean;
  };
  pushNotifications?: {
    tradeAlerts?: boolean;
    priceAlerts?: boolean;
  };
  tradingDefaults?: {
    defaultWalletType?: 'DEMO' | 'REAL';
    defaultTradeAmount?: number;
    defaultExpirySeconds?: number;
    confirmBeforeTrade?: boolean;
  };
  currencyDisplay?: {
    baseCurrency?: string;
    showCents?: boolean;
    thousandsSeparator?: ',' | '.' | ' ';
    decimalSeparator?: '.' | ',';
  };
  displayPreferences?: {
    compactView?: boolean;
    showBalances?: boolean;
    chartType?: 'candlestick' | 'line' | 'area';
  };
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>('preferences');
  const [localSettings, setLocalSettings] = useState<Settings>({});
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getSettings(),
    onSuccess: (data) => {
      setLocalSettings(data.data);
    },
  });

  // Fetch security settings
  const { data: securityData } = useQuery({
    queryKey: ['settings', 'security'],
    queryFn: () => settingsAPI.getSecuritySettings(),
    enabled: activeSection === 'security',
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Partial<Settings>) => settingsAPI.updateSettings(settings),
    onSuccess: () => {
      toast.success('Settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update settings');
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      settingsAPI.changePassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to change password');
    },
  });

  // Logout all sessions mutation
  const logoutAllMutation = useMutation({
    mutationFn: () => settingsAPI.logoutAllSessions(),
    onSuccess: () => {
      toast.success('All sessions logged out');
      queryClient.invalidateQueries({ queryKey: ['settings', 'security'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to logout sessions');
    },
  });

  const settings: Settings = settingsData?.data || {};
  const security = securityData?.data;

  const handleUpdateSettings = (updates: Partial<Settings>) => {
    const merged = { ...localSettings, ...updates };
    setLocalSettings(merged);
    updateSettingsMutation.mutate(updates);
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  const handleLogoutAll = () => {
    if (confirm('Are you sure you want to logout from all devices?')) {
      logoutAllMutation.mutate();
    }
  };

  const sections = [
    { id: 'preferences', label: 'App Preferences', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'trading', label: 'Trading Defaults', icon: TrendingUp },
    { id: 'currency', label: 'Currency Display', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">Manage your account preferences and settings</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id as Section)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              {/* App Preferences */}
              {activeSection === 'preferences' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">App Preferences</h2>
                  </div>

                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Theme
                    </label>
                    <select
                      value={localSettings.theme || 'dark'}
                      onChange={(e) => handleUpdateSettings({ theme: e.target.value as any })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>

                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Language
                    </label>
                    <select
                      value={localSettings.language || 'en'}
                      onChange={(e) => handleUpdateSettings({ language: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Timezone
                    </label>
                    <select
                      value={localSettings.timezone || 'UTC'}
                      onChange={(e) => handleUpdateSettings({ timezone: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (US)</option>
                      <option value="America/Los_Angeles">Pacific Time (US)</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Paris">Paris</option>
                      <option value="Asia/Tokyo">Tokyo</option>
                    </select>
                  </div>

                  {/* Display Preferences */}
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Display</h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">Compact View</p>
                          <p className="text-sm text-gray-400">Use smaller cards and spacing</p>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdateSettings({
                              displayPreferences: {
                                ...localSettings.displayPreferences,
                                compactView: !localSettings.displayPreferences?.compactView,
                              },
                            })
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            localSettings.displayPreferences?.compactView
                              ? 'bg-blue-500'
                              : 'bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              localSettings.displayPreferences?.compactView
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">Show Balances</p>
                          <p className="text-sm text-gray-400">Display wallet balances on dashboard</p>
                        </div>
                        <button
                          onClick={() =>
                            handleUpdateSettings({
                              displayPreferences: {
                                ...localSettings.displayPreferences,
                                showBalances: !localSettings.displayPreferences?.showBalances,
                              },
                            })
                          }
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            localSettings.displayPreferences?.showBalances !== false
                              ? 'bg-blue-500'
                              : 'bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              localSettings.displayPreferences?.showBalances !== false
                                ? 'translate-x-6'
                                : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Chart Type
                        </label>
                        <select
                          value={localSettings.displayPreferences?.chartType || 'candlestick'}
                          onChange={(e) =>
                            handleUpdateSettings({
                              displayPreferences: {
                                ...localSettings.displayPreferences,
                                chartType: e.target.value as any,
                              },
                            })
                          }
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="candlestick">Candlestick</option>
                          <option value="line">Line</option>
                          <option value="area">Area</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Notifications</h2>
                  </div>

                  {/* Email Notifications */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Email Notifications</h3>
                    <div className="space-y-4">
                      {[
                        { key: 'tradeAlerts', label: 'Trade Alerts', desc: 'Get notified when your trades open and close' },
                        { key: 'depositWithdrawal', label: 'Deposits & Withdrawals', desc: 'Updates on your financial transactions' },
                        { key: 'marketing', label: 'Marketing & Promotions', desc: 'Special offers and platform updates' },
                        { key: 'security', label: 'Security Alerts', desc: 'Important security and account changes' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{item.label}</p>
                            <p className="text-sm text-gray-400">{item.desc}</p>
                          </div>
                          <button
                            onClick={() =>
                              handleUpdateSettings({
                                emailNotifications: {
                                  ...localSettings.emailNotifications,
                                  [item.key]: !(localSettings.emailNotifications as any)?.[item.key],
                                },
                              })
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              (localSettings.emailNotifications as any)?.[item.key] !== false
                                ? 'bg-blue-500'
                                : 'bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                (localSettings.emailNotifications as any)?.[item.key] !== false
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Push Notifications */}
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Push Notifications</h3>
                    <div className="space-y-4">
                      {[
                        { key: 'tradeAlerts', label: 'Trade Alerts', desc: 'Real-time trade notifications' },
                        { key: 'priceAlerts', label: 'Price Alerts', desc: 'Get notified about significant price movements' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{item.label}</p>
                            <p className="text-sm text-gray-400">{item.desc}</p>
                          </div>
                          <button
                            onClick={() =>
                              handleUpdateSettings({
                                pushNotifications: {
                                  ...localSettings.pushNotifications,
                                  [item.key]: !(localSettings.pushNotifications as any)?.[item.key],
                                },
                              })
                            }
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              (localSettings.pushNotifications as any)?.[item.key]
                                ? 'bg-blue-500'
                                : 'bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                (localSettings.pushNotifications as any)?.[item.key]
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Trading Defaults */}
              {activeSection === 'trading' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Trading Defaults</h2>
                  </div>

                  {/* Default Wallet Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Wallet
                    </label>
                    <select
                      value={localSettings.tradingDefaults?.defaultWalletType || 'DEMO'}
                      onChange={(e) =>
                        handleUpdateSettings({
                          tradingDefaults: {
                            ...localSettings.tradingDefaults,
                            defaultWalletType: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="DEMO">Demo Wallet</option>
                      <option value="REAL">Real Wallet</option>
                    </select>
                  </div>

                  {/* Default Trade Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Trade Amount ($)
                    </label>
                    <input
                      type="number"
                      value={localSettings.tradingDefaults?.defaultTradeAmount || 10}
                      onChange={(e) =>
                        handleUpdateSettings({
                          tradingDefaults: {
                            ...localSettings.tradingDefaults,
                            defaultTradeAmount: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Default Expiry */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Default Expiry Time
                    </label>
                    <select
                      value={localSettings.tradingDefaults?.defaultExpirySeconds || 60}
                      onChange={(e) =>
                        handleUpdateSettings({
                          tradingDefaults: {
                            ...localSettings.tradingDefaults,
                            defaultExpirySeconds: parseInt(e.target.value),
                          },
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="60">1 Minute</option>
                      <option value="180">3 Minutes</option>
                      <option value="300">5 Minutes</option>
                      <option value="900">15 Minutes</option>
                      <option value="1800">30 Minutes</option>
                      <option value="3600">1 Hour</option>
                    </select>
                  </div>

                  {/* Confirm Before Trade */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Confirm Before Trade</p>
                      <p className="text-sm text-gray-400">Show confirmation dialog before placing trades</p>
                    </div>
                    <button
                      onClick={() =>
                        handleUpdateSettings({
                          tradingDefaults: {
                            ...localSettings.tradingDefaults,
                            confirmBeforeTrade: !localSettings.tradingDefaults?.confirmBeforeTrade,
                          },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        localSettings.tradingDefaults?.confirmBeforeTrade !== false
                          ? 'bg-blue-500'
                          : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          localSettings.tradingDefaults?.confirmBeforeTrade !== false
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Currency Display */}
              {activeSection === 'currency' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Currency Display</h2>
                  </div>

                  {/* Base Currency */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Base Currency
                    </label>
                    <select
                      value={localSettings.currencyDisplay?.baseCurrency || 'USD'}
                      onChange={(e) =>
                        handleUpdateSettings({
                          currencyDisplay: {
                            ...localSettings.currencyDisplay,
                            baseCurrency: e.target.value,
                          },
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                      <option value="JPY">JPY - Japanese Yen</option>
                    </select>
                  </div>

                  {/* Number Formatting */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Thousands Separator
                    </label>
                    <select
                      value={localSettings.currencyDisplay?.thousandsSeparator || ','}
                      onChange={(e) =>
                        handleUpdateSettings({
                          currencyDisplay: {
                            ...localSettings.currencyDisplay,
                            thousandsSeparator: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value=",">Comma (1,000)</option>
                      <option value=".">Period (1.000)</option>
                      <option value=" ">Space (1 000)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Decimal Separator
                    </label>
                    <select
                      value={localSettings.currencyDisplay?.decimalSeparator || '.'}
                      onChange={(e) =>
                        handleUpdateSettings({
                          currencyDisplay: {
                            ...localSettings.currencyDisplay,
                            decimalSeparator: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value=".">Period (100.50)</option>
                      <option value=",">Comma (100,50)</option>
                    </select>
                  </div>

                  {/* Show Cents */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">Show Cents</p>
                      <p className="text-sm text-gray-400">Display decimal places for amounts</p>
                    </div>
                    <button
                      onClick={() =>
                        handleUpdateSettings({
                          currencyDisplay: {
                            ...localSettings.currencyDisplay,
                            showCents: !localSettings.currencyDisplay?.showCents,
                          },
                        })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        localSettings.currencyDisplay?.showCents !== false
                          ? 'bg-blue-500'
                          : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          localSettings.currencyDisplay?.showCents !== false
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Preview */}
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <p className="text-sm text-blue-500 mb-2">Preview</p>
                    <p className="text-2xl font-bold text-white">
                      {localSettings.currencyDisplay?.baseCurrency || 'USD'}{' '}
                      1{localSettings.currencyDisplay?.thousandsSeparator || ','}234
                      {localSettings.currencyDisplay?.decimalSeparator || '.'}
                      {localSettings.currencyDisplay?.showCents !== false ? '56' : '00'}
                    </p>
                  </div>
                </div>
              )}

              {/* Security */}
              {activeSection === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-4">Security</h2>
                  </div>

                  {/* 2FA Status */}
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-white">Two-Factor Authentication</p>
                          <p className="text-sm text-gray-400">
                            {security?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      {security?.twoFactorEnabled ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      )}
                    </div>
                  </div>

                  {/* Change Password */}
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Change Password</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        onClick={handleChangePassword}
                        disabled={changePasswordMutation.isPending}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                      </button>
                    </div>
                  </div>

                  {/* Active Sessions */}
                  <div className="border-t border-gray-700 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">Active Sessions</h3>
                      <span className="text-sm text-gray-400">
                        {security?.activeSessions || 0} active
                      </span>
                    </div>

                    <button
                      onClick={handleLogoutAll}
                      disabled={logoutAllMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <LogOut className="w-4 h-4" />
                      {logoutAllMutation.isPending ? 'Logging out...' : 'Logout All Devices'}
                    </button>
                  </div>

                  {/* Recent Activity */}
                  {security?.recentActivity && security.recentActivity.length > 0 && (
                    <div className="border-t border-gray-700 pt-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                      <div className="space-y-2">
                        {security.recentActivity.slice(0, 5).map((activity: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <div>
                                <p className="text-sm font-medium text-white">
                                  {activity.action.replace('_', ' ')}
                                </p>
                                <p className="text-xs text-gray-400">{activity.ipAddress}</p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(activity.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
