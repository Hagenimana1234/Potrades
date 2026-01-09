import { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

interface SystemSetting {
  key: string;
  value: string;
  category: string;
}

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  user: {
    email: string;
  };
}

export default function AdminSystemPage() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settingsRes, logsRes] = await Promise.all([
        axios.get('/api/admin/settings'),
        axios.get('/api/admin/audit-logs', { params: { limit: 50 } }),
      ]);
      setSettings(settingsRes.data.data || []);
      setAuditLogs(logsRes.data.data.logs || []);
    } catch (error) {
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await axios.put(`/api/admin/settings/${key}`, { value });
      toast.success('Setting updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">System Management</h1>

      {/* System Settings */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">System Settings</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settings.map((setting) => (
              <div key={setting.key} className="border rounded p-4">
                <label className="block text-sm font-medium mb-1">{setting.key}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    defaultValue={setting.value}
                    className="flex-1 px-3 py-2 border rounded"
                    onBlur={(e) => {
                      if (e.target.value !== setting.value) {
                        handleUpdateSetting(setting.key, e.target.value);
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Category: {setting.category}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Audit Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4">Timestamp</th>
                <th className="text-left p-4">User</th>
                <th className="text-left p-4">Action</th>
                <th className="text-left p-4">Entity</th>
                <th className="text-left p-4">Entity ID</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="p-4 text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="p-4">{log.user.email}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4">{log.entity}</td>
                  <td className="p-4 text-sm font-mono">{log.entityId.substring(0, 8)}...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
