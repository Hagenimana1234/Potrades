import { useEffect, useState } from 'react';
import axios from 'axios';

interface Trade {
  id: string;
  userId: string;
  assetId: string;
  direction: string;
  amount: number;
  entryPrice: number;
  exitPrice?: number;
  profit?: number;
  status: string;
  createdAt: string;
  user: {
    email: string;
  };
  asset: {
    symbol: string;
  };
}

export default function AdminTradesPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchTrades();
  }, [filter]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get('/api/admin/trades', { params });
      setTrades(response.data.data.trades);
    } catch (error) {
      console.error('Failed to load trades:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Trade Monitoring</h1>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('OPEN')}
          className={`px-4 py-2 rounded ${filter === 'OPEN' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Open
        </button>
        <button
          onClick={() => setFilter('CLOSED')}
          className={`px-4 py-2 rounded ${filter === 'CLOSED' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Closed
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Trade ID</th>
              <th className="text-left p-4">User</th>
              <th className="text-left p-4">Asset</th>
              <th className="text-center p-4">Direction</th>
              <th className="text-right p-4">Amount</th>
              <th className="text-right p-4">Entry</th>
              <th className="text-right p-4">Exit</th>
              <th className="text-right p-4">Profit</th>
              <th className="text-center p-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {trades.map((trade) => (
              <tr key={trade.id} className="hover:bg-gray-50">
                <td className="p-4 text-sm">{trade.id.substring(0, 8)}...</td>
                <td className="p-4">{trade.user.email}</td>
                <td className="p-4">{trade.asset.symbol}</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    trade.direction === 'UP' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.direction}
                  </span>
                </td>
                <td className="p-4 text-right">${trade.amount}</td>
                <td className="p-4 text-right">{trade.entryPrice}</td>
                <td className="p-4 text-right">{trade.exitPrice || '-'}</td>
                <td className="p-4 text-right">
                  {trade.profit ? (
                    <span className={trade.profit > 0 ? 'text-green-600' : 'text-red-600'}>
                      ${trade.profit.toFixed(2)}
                    </span>
                  ) : '-'}
                </td>
                <td className="p-4 text-center">{trade.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
