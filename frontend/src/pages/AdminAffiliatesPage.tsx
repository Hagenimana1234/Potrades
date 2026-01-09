import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface Affiliate {
  id: string;
  userId: string;
  status: string;
  totalCommission: number;
  totalReferrals: number;
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [pendingCommissions, setPendingCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [affiliatesRes, commissionsRes] = await Promise.all([
        axios.get('/api/admin/affiliates'),
        axios.get('/api/admin/commissions/pending'),
      ]);
      setAffiliates(affiliatesRes.data.data.affiliates || []);
      setPendingCommissions(commissionsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load affiliates');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveAffiliate = async (affiliateId: string) => {
    try {
      await axios.post(`/api/admin/affiliates/${affiliateId}/approve`);
      toast.success('Affiliate approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve affiliate');
    }
  };

  const handleApproveCommission = async (commissionId: string) => {
    try {
      await axios.post(`/api/admin/commissions/${commissionId}/approve`);
      toast.success('Commission approved');
      fetchData();
    } catch (error) {
      toast.error('Failed to approve commission');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Affiliate Management</h1>

      {/* Affiliates List */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Affiliates</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Name</th>
              <th className="text-left p-4">Email</th>
              <th className="text-center p-4">Status</th>
              <th className="text-right p-4">Total Referrals</th>
              <th className="text-right p-4">Total Commission</th>
              <th className="text-center p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {affiliates.map((affiliate) => (
              <tr key={affiliate.id} className="hover:bg-gray-50">
                <td className="p-4">
                  {affiliate.user.firstName} {affiliate.user.lastName}
                </td>
                <td className="p-4">{affiliate.user.email}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    affiliate.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {affiliate.status}
                  </span>
                </td>
                <td className="p-4 text-right">{affiliate.totalReferrals}</td>
                <td className="p-4 text-right">${affiliate.totalCommission.toFixed(2)}</td>
                <td className="p-4 text-center">
                  {affiliate.status === 'PENDING' && (
                    <button
                      onClick={() => handleApproveAffiliate(affiliate.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                    >
                      Approve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Commissions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Pending Commissions</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Affiliate</th>
              <th className="text-right p-4">Amount</th>
              <th className="text-left p-4">Date</th>
              <th className="text-center p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {pendingCommissions.map((commission) => (
              <tr key={commission.id} className="hover:bg-gray-50">
                <td className="p-4">{commission.affiliate?.user?.email || 'N/A'}</td>
                <td className="p-4 text-right">${commission.amount?.toFixed(2) || '0.00'}</td>
                <td className="p-4">{new Date(commission.createdAt).toLocaleDateString()}</td>
                <td className="p-4 text-center">
                  <button
                    onClick={() => handleApproveCommission(commission.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
