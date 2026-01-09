import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface CopyTrader {
  id: string;
  userId: string;
  status: string;
  totalFollowers: number;
  totalTrades: number;
  winRate: number;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminCopyTradersPage() {
  const [pending, setPending] = useState<CopyTrader[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/copy-traders/pending');
      setPending(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load pending copy traders');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (copyTraderId: string) => {
    try {
      await axios.post(`/api/admin/copy-traders/${copyTraderId}/approve`);
      toast.success('Copy trader approved');
      fetchPending();
    } catch (error) {
      toast.error('Failed to approve copy trader');
    }
  };

  const handleSuspend = async (copyTraderId: string) => {
    try {
      await axios.post(`/api/admin/copy-traders/${copyTraderId}/suspend`);
      toast.success('Copy trader suspended');
      fetchPending();
    } catch (error) {
      toast.error('Failed to suspend copy trader');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Copy Trader Management</h1>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Pending Approvals</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Email</th>
              <th className="text-center p-4">Total Trades</th>
              <th className="text-center p-4">Win Rate</th>
              <th className="text-center p-4">Followers</th>
              <th className="text-center p-4">Status</th>
              <th className="text-center p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pending.map((trader) => (
              <tr key={trader.id} className="hover:bg-gray-50">
                <td className="p-4">
                  {trader.user.firstName} {trader.user.lastName}
                </td>
                <td className="p-4">{trader.user.email}</td>
                <td className="p-4 text-center">{trader.totalTrades}</td>
                <td className="p-4 text-center">{trader.winRate}%</td>
                <td className="p-4 text-center">{trader.totalFollowers}</td>
                <td className="p-4 text-center">
                  <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                    {trader.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => handleApprove(trader.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleSuspend(trader.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
