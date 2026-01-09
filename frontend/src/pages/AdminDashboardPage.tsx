import { useEffect, useState } from 'react';
import axios from 'axios';

interface PlatformStats {
  totalUsers: number;
  activeUsers: number;
  totalTrades: number;
  totalVolume: number;
  platformProfit: number;
  pendingWithdrawals: number;
}

interface ExposureData {
  assetId: string;
  symbol: string;
  exposure: number;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [exposure, setExposure] = useState<ExposureData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, exposureRes] = await Promise.all([
        axios.get('/api/admin/stats'),
        axios.get('/api/admin/trades/exposure'),
      ]);

      setStats(statsRes.data.data);
      setExposure(exposureRes.data.data.assets || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm uppercase">Total Users</h3>
          <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
          <p className="text-sm text-green-600">
            {stats?.activeUsers || 0} active
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm uppercase">Total Trades</h3>
          <p className="text-3xl font-bold">{stats?.totalTrades || 0}</p>
          <p className="text-sm text-gray-600">
            ${(stats?.totalVolume || 0).toLocaleString()} volume
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm uppercase">Platform Profit</h3>
          <p className="text-3xl font-bold text-green-600">
            ${(stats?.platformProfit || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            {stats?.pendingWithdrawals || 0} pending withdrawals
          </p>
        </div>
      </div>

      {/* Platform Exposure */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-bold mb-4">Platform Exposure</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Asset</th>
                <th className="text-right p-3">Exposure</th>
                <th className="text-center p-3">Direction</th>
              </tr>
            </thead>
            <tbody>
              {exposure.map((item) => (
                <tr key={item.assetId} className="border-b hover:bg-gray-50">
                  <td className="p-3">{item.symbol}</td>
                  <td className="p-3 text-right">
                    ${Math.abs(item.exposure).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        item.direction === 'LONG'
                          ? 'bg-green-100 text-green-800'
                          : item.direction === 'SHORT'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.direction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href="/admin/users"
          className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 text-center"
        >
          Manage Users
        </a>
        <a
          href="/admin/otc-pricing"
          className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 text-center"
        >
          OTC Pricing
        </a>
        <a
          href="/admin/trades"
          className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 text-center"
        >
          Monitor Trades
        </a>
        <a
          href="/admin/system"
          className="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 text-center"
        >
          System Settings
        </a>
      </div>
    </div>
  );
}
