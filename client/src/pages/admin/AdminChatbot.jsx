import { useEffect, useState } from 'react';
import { FiMessageCircle, FiUsers, FiTrendingUp, FiClock } from 'react-icons/fi';
import { adminAPI } from '../../lib/api';

export default function AdminChatbot() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getChatbotStats()
      .then(({ data: stats }) => setData(stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-500">Failed to load chatbot stats</p>;

  const statCards = [
    { label: 'Total Sessions', value: data.stats?.totalSessions || 0, icon: FiMessageCircle, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Messages', value: data.stats?.totalMessages || 0, icon: FiTrendingUp, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Unique Users', value: data.stats?.uniqueUsers || 0, icon: FiUsers, color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Study Assistant — Monitoring</h1>
        <p className="text-gray-500 text-sm mt-1">Track chatbot usage and engagement</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="card p-5">
            <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center mb-3`}>
              <card.icon size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Daily Usage */}
      {data.dailyUsage?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Daily Usage (Last 30 Days)</h2>
          <div className="space-y-2">
            {data.dailyUsage.map((d) => {
              const maxCount = Math.max(...data.dailyUsage.map(x => parseInt(x.count) || 1));
              const pct = ((parseInt(d.count) || 0) / maxCount) * 100;
              return (
                <div key={d.date} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-24">{new Date(d.date).toLocaleDateString()}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
                  </div>
                  <span className="text-xs font-medium text-gray-600 w-8 text-right">{d.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Departments */}
      {data.topDepartments?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Departments Using AI</h2>
          <div className="space-y-2">
            {data.topDepartments.map((d, i) => (
              <div key={d.department} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <span className="text-sm text-gray-700 flex-1">{d.department}</span>
                <span className="text-sm font-medium text-gray-600">{d.count} messages</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Questions */}
      {data.recentQuestions?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Student Questions</h2>
          <div className="space-y-3">
            {data.recentQuestions.map((q, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <FiClock className="text-gray-400 mt-0.5 flex-shrink-0" size={14} />
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-2">{q.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {q.department && `${q.department} • `}
                    {new Date(q.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
