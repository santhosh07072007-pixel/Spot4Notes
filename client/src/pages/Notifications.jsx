import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiCheckCircle, FiCheck, FiAlertTriangle, FiInfo, FiXCircle, FiAward } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { notificationsAPI } from '../lib/api';

const typeConfig = {
  success: { color: 'bg-emerald-50 text-emerald-600 border border-emerald-200', icon: FiCheckCircle, label: 'Approved' },
  error: { color: 'bg-red-50 text-red-600 border border-red-200', icon: FiXCircle, label: 'Rejected' },
  warning: { color: 'bg-amber-50 text-amber-600 border border-amber-200', icon: FiAlertTriangle, label: 'Review' },
  announcement: { color: 'bg-blue-50 text-blue-600 border border-blue-200', icon: FiBell, label: 'Announcement' },
  info: { color: 'bg-gray-50 text-gray-600 border border-gray-200', icon: FiInfo, label: 'Info' },
  badge: { color: 'bg-purple-50 text-purple-600 border border-purple-200', icon: FiAward, label: 'Badge' },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificationsAPI.getAll()
      .then(({ data }) => setNotifications(data.notifications))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 bg-white border border-rose-200 text-gray-700 rounded-xl hover:bg-rose-50 transition-colors">
            <FiCheckCircle size={14} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm p-12 text-center">
          <FiBell className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-900 font-semibold text-lg">No notifications yet</p>
          <p className="text-gray-400 text-sm mt-1">You'll be notified when your uploads are reviewed or announcements are posted</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = typeConfig[notif.type] || typeConfig.info;
            const IconComp = config.icon;
            return (
              <div
                key={notif.id}
                className={`bg-white rounded-2xl border shadow-sm p-4 flex items-start gap-4 transition-all ${!notif.is_read
                    ? 'border-l-4 border-l-rose-400 border-rose-100 bg-rose-50/20'
                    : 'border-rose-100'
                  }`}
              >
                <div className={`w-9 h-9 rounded-xl ${config.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <IconComp size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold text-sm ${!notif.is_read ? 'text-gray-900' : 'text-gray-600'}`}>{notif.title}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.color}`}>{config.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 whitespace-pre-wrap">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                  {notif.link && (
                    <Link to={notif.link} className="text-xs text-rose-500 hover:text-rose-600 font-medium mt-1 inline-block">
                      View details →
                    </Link>
                  )}
                </div>
                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors flex-shrink-0"
                    title="Mark as read"
                  >
                    <FiCheck size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
