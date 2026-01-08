import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportAPI } from '../services/api';
import toast from 'react-hot-toast';
import { MessageCircle, Plus, Send, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type TabType = 'my-tickets' | 'create';

export function SupportPage() {
  const [activeTab, setActiveTab] = useState<TabType>('my-tickets');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'my-tickets', label: 'My Tickets' },
    { id: 'create', label: 'Create Ticket' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <MessageCircle size={32} />
              <span>Support Center</span>
            </h1>
            <p className="text-gray-400 mt-1">Get help from our support team</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-semibold transition border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'my-tickets' && !selectedTicket && <MyTicketsTab onSelectTicket={setSelectedTicket} />}
        {activeTab === 'my-tickets' && selectedTicket && (
          <TicketDetailsView ticket={selectedTicket} onBack={() => setSelectedTicket(null)} />
        )}
        {activeTab === 'create' && <CreateTicketTab onSuccess={() => setActiveTab('my-tickets')} />}
      </div>
    </div>
  );
}

// My Tickets Tab
function MyTicketsTab({ onSelectTicket }: { onSelectTicket: (ticket: any) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['support', 'my-tickets'],
    queryFn: async () => {
      const response = await supportAPI.getMyTickets();
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const tickets = data || [];

  return (
    <div>
      {tickets.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
          <p>No support tickets found</p>
          <p className="text-sm mt-2">Create a ticket to get help from our support team</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket: any) => (
            <div
              key={ticket.id}
              onClick={() => onSelectTicket(ticket)}
              className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-gray-400 font-mono text-sm">{ticket.ticketNumber}</span>
                    <StatusBadge status={ticket.status} />
                    <PriorityBadge priority={ticket.priority} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{ticket.subject}</h3>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Category: {ticket.category}</span>
                    <span>Messages: {ticket._count?.messages || 0}</span>
                    <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Ticket Details View
function TicketDetailsView({ ticket: initialTicket, onBack }: { ticket: any; onBack: () => void }) {
  const [messageText, setMessageText] = useState('');
  const queryClient = useQueryClient();

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['support', 'ticket', initialTicket.id],
    queryFn: async () => {
      const response = await supportAPI.getTicketById(initialTicket.id);
      return response.data.data;
    },
    initialData: initialTicket,
  });

  const addMessageMutation = useMutation({
    mutationFn: (message: string) => supportAPI.addMessage(ticket.id, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'ticket', ticket.id] });
      queryClient.invalidateQueries({ queryKey: ['support', 'my-tickets'] });
      setMessageText('');
      toast.success('Message sent');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send message');
    },
  });

  const closeTicketMutation = useMutation({
    mutationFn: () => supportAPI.closeTicket(ticket.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support'] });
      toast.success('Ticket closed');
    },
  });

  const reopenTicketMutation = useMutation({
    mutationFn: () => supportAPI.reopenTicket(ticket.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support'] });
      toast.success('Ticket reopened');
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim()) {
      addMessageMutation.mutate(messageText);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={onBack} className="text-blue-400 hover:text-blue-300 mb-4">
        ← Back to tickets
      </button>

      {/* Ticket Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-gray-400 font-mono">{ticket.ticketNumber}</span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h2 className="text-2xl font-bold">{ticket.subject}</h2>
          </div>
          <div className="flex space-x-2">
            {ticket.status !== 'CLOSED' && (
              <button
                onClick={() => closeTicketMutation.mutate()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                disabled={closeTicketMutation.isPending}
              >
                Close Ticket
              </button>
            )}
            {ticket.status === 'CLOSED' && (
              <button
                onClick={() => reopenTicketMutation.mutate()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
                disabled={reopenTicketMutation.isPending}
              >
                Reopen Ticket
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Category</p>
            <p className="font-semibold">{ticket.category}</p>
          </div>
          <div>
            <p className="text-gray-400">Created</p>
            <p className="font-semibold">{new Date(ticket.createdAt).toLocaleString()}</p>
          </div>
          {ticket.resolvedAt && (
            <div>
              <p className="text-gray-400">Resolved</p>
              <p className="font-semibold">{new Date(ticket.resolvedAt).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">Conversation</h3>
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
          {/* Initial description */}
          <div className="flex space-x-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold">
              {ticket.user?.firstName?.[0] || 'U'}
            </div>
            <div className="flex-1">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold">{ticket.user?.email || 'You'}</p>
                  <p className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleString()}</p>
                </div>
                <p className="text-gray-300">{ticket.description}</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          {ticket.messages?.map((msg: any) => (
            <div key={msg.id} className={`flex space-x-3 ${msg.isStaff ? 'flex-row' : 'flex-row'}`}>
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full ${
                  msg.isStaff ? 'bg-green-500' : 'bg-blue-500'
                } flex items-center justify-center font-bold`}
              >
                {msg.isStaff ? 'S' : 'U'}
              </div>
              <div className="flex-1">
                <div className={`rounded-lg p-4 ${msg.isStaff ? 'bg-green-900/20' : 'bg-gray-700'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-semibold">{msg.isStaff ? 'Support Team' : 'You'}</p>
                    <p className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString()}</p>
                  </div>
                  <p className="text-gray-300">{msg.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reply form */}
        {ticket.status !== 'CLOSED' && (
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center space-x-2"
              disabled={addMessageMutation.isPending || !messageText.trim()}
            >
              <Send size={18} />
              <span>Send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Create Ticket Tab
function CreateTicketTab({ onSuccess }: { onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    category: 'ACCOUNT',
    subject: '',
    description: '',
    priority: 'NORMAL',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => supportAPI.createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support'] });
      toast.success('Support ticket created successfully');
      setFormData({ category: 'ACCOUNT', subject: '', description: '', priority: 'NORMAL' });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create ticket');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Create Support Ticket</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
              required
            >
              <option value="ACCOUNT">Account</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
              <option value="TRADING">Trading</option>
              <option value="TECHNICAL">Technical</option>
              <option value="VERIFICATION">Verification</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Subject</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            required
            minLength={5}
            maxLength={200}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
            rows={6}
            required
            minLength={10}
            maxLength={5000}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition"
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
        </button>
      </form>
    </div>
  );
}

// Helper Components
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: 'bg-blue-500/20 text-blue-400',
    WAITING_REPLY: 'bg-yellow-500/20 text-yellow-400',
    ANSWERED: 'bg-green-500/20 text-green-400',
    RESOLVED: 'bg-purple-500/20 text-purple-400',
    CLOSED: 'bg-gray-500/20 text-gray-400',
  };

  const icons: Record<string, any> = {
    OPEN: <Clock size={14} />,
    WAITING_REPLY: <AlertCircle size={14} />,
    ANSWERED: <CheckCircle size={14} />,
    RESOLVED: <CheckCircle size={14} />,
    CLOSED: <XCircle size={14} />,
  };

  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-semibold ${colors[status]}`}>
      {icons[status]}
      <span>{status.replace('_', ' ')}</span>
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-500/20 text-gray-400',
    NORMAL: 'bg-blue-500/20 text-blue-400',
    HIGH: 'bg-orange-500/20 text-orange-400',
    URGENT: 'bg-red-500/20 text-red-400',
  };

  return <span className={`px-2 py-1 rounded text-xs font-semibold ${colors[priority]}`}>{priority}</span>;
}
