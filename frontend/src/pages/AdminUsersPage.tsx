import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  role: string;
  kycStatus: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/users', {
        params: { search, limit: 50 },
      });
      setUsers(response.data.data.users);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await axios.put(`/api/admin/users/${userId}/status`, {
        status: newStatus,
        reason: 'Admin action',
      });
      toast.success('User status updated');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded w-full max-w-md"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">User</th>
              <th className="text-left p-4">Email</th>
              <th className="text-center p-4">Status</th>
              <th className="text-center p-4">KYC</th>
              <th className="text-center p-4">Role</th>
              <th className="text-center p-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="p-4">
                  {user.firstName} {user.lastName}
                </td>
                <td className="p-4">{user.email}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <span className="px-2 py-1 rounded text-xs bg-gray-100">
                    {user.kycStatus}
                  </span>
                </td>
                <td className="p-4 text-center">{user.role}</td>
                <td className="p-4 text-center">
                  <select
                    onChange={(e) => handleStatusChange(user.id, e.target.value)}
                    className="px-2 py-1 border rounded text-sm"
                    defaultValue={user.status}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspend</option>
                    <option value="BANNED">Ban</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
