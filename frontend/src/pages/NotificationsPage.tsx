import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  Bell,
  BellOff,
  Check,
  Trash2,
  Archive,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Shield,
  Users,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';

type TabType = 'all' | 'unread' | 'archived';

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const queryClient = useQueryClient();

  const tabs: { id: TabType; label: string }[] = [
    { id: 'all', label: 'All Notifications' },
    { id: 'unread', label: 'Unread' },
    { id: 'archived', label: 'Archived' },
  ];

  // Fetch notifications based on active tab
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications', activeTab],
    queryFn: async () => {
      const status = activeTab === 'unread' ? 'UNREAD' : activeTab === 'archived' ? 'ARCHIVED' : undefined;
      const response = await notificationsAPI.getNotifications({ status });
      return response.data.data;
    },
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await notificationsAPI.getUnreadCount();
      return response.data.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsAPI.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark all as read');
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsAPI.archiveNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification archived');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => notificationsAPI.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted');
    },
  });

  // Delete all mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => notificationsAPI.deleteAllNotifications(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete notifications');
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (notification.status === 'UNREAD') {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const notifications = data?.notifications || [];
  const unreadCount = unreadData?.count || 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-3">
              <Bell size={32} />
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-sm px-2 py-1 rounded-full">{unreadCount}</span>
              )}
            </h1>
            <p className="text-gray-400 mt-1">Stay updated with your account activity</p>
          </div>

          <div className="flex space-x-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={() => markAllAsReadMutation.mutate()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2"
                  disabled={markAllAsReadMutation.isPending}
                >
                  <Check size={18} />
                  <span>Mark All Read</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete all notifications?')) {
                      deleteAllMutation.mutate();
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center space-x-2"
                  disabled={deleteAllMutation.isPending}
                >
                  <Trash2 size={18} />
                  <span>Delete All</span>
                </button>
              </>
            )}
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
              {tab.id === 'unread' && unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <BellOff size={48} className="mx-auto mb-4 opacity-50" />
            <p>No notifications found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification: any) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onClick={() => handleNotificationClick(notification)}
                onArchive={() => archiveMutation.mutate(notification.id)}
                onDelete={() => deleteMutation.mutate(notification.id)}
                onMarkRead={() => markAsReadMutation.mutate(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Notification Card Component
function NotificationCard({
  notification,
  onClick,
  onArchive,
  onDelete,
  onMarkRead,
}: {
  notification: any;
  onClick: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onMarkRead: () => void;
}) {
  const isUnread = notification.status === 'UNREAD';
  const icon = getNotificationIcon(notification.type);
  const iconColor = getNotificationColor(notification.type);

  const timeAgo = getTimeAgo(new Date(notification.createdAt));

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition cursor-pointer ${
        isUnread ? 'border-l-4 border-blue-500' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${iconColor} flex items-center justify-center`}>
          {icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`font-semibold ${isUnread ? 'text-white' : 'text-gray-300'}`}>{notification.title}</h3>
              <p className={`text-sm mt-1 ${isUnread ? 'text-gray-300' : 'text-gray-400'}`}>{notification.message}</p>
              <p className="text-xs text-gray-500 mt-2">{timeAgo}</p>
            </div>

            {/* Status Badge */}
            {isUnread && (
              <span className="ml-2 flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
          {isUnread && (
            <button
              onClick={onMarkRead}
              className="text-gray-400 hover:text-blue-400 transition"
              title="Mark as read"
            >
              <Check size={18} />
            </button>
          )}
          {notification.status !== 'ARCHIVED' && (
            <button
              onClick={onArchive}
              className="text-gray-400 hover:text-yellow-400 transition"
              title="Archive"
            >
              <Archive size={18} />
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-400 transition"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getNotificationIcon(type: string) {
  const iconMap: Record<string, any> = {
    TRADE_OPENED: <TrendingUp size={20} />,
    TRADE_CLOSED: <TrendingDown size={20} />,
    DEPOSIT_COMPLETED: <DollarSign size={20} />,
    WITHDRAWAL_APPROVED: <CheckCircle size={20} />,
    WITHDRAWAL_REJECTED: <XCircle size={20} />,
    COPY_TRADE_EXECUTED: <Users size={20} />,
    AFFILIATE_COMMISSION: <DollarSign size={20} />,
    SYSTEM_ALERT: <AlertTriangle size={20} />,
    SECURITY_ALERT: <Shield size={20} />,
    KYC_STATUS: <FileText size={20} />,
  };

  return iconMap[type] || <Bell size={20} />;
}

function getNotificationColor(type: string) {
  const colorMap: Record<string, string> = {
    TRADE_OPENED: 'bg-blue-500/20 text-blue-400',
    TRADE_CLOSED: 'bg-green-500/20 text-green-400',
    DEPOSIT_COMPLETED: 'bg-green-500/20 text-green-400',
    WITHDRAWAL_APPROVED: 'bg-green-500/20 text-green-400',
    WITHDRAWAL_REJECTED: 'bg-red-500/20 text-red-400',
    COPY_TRADE_EXECUTED: 'bg-purple-500/20 text-purple-400',
    AFFILIATE_COMMISSION: 'bg-yellow-500/20 text-yellow-400',
    SYSTEM_ALERT: 'bg-orange-500/20 text-orange-400',
    SECURITY_ALERT: 'bg-red-500/20 text-red-400',
    KYC_STATUS: 'bg-blue-500/20 text-blue-400',
  };

  return colorMap[type] || 'bg-gray-500/20 text-gray-400';
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  return `${Math.floor(seconds / 2592000)} months ago`;
}
