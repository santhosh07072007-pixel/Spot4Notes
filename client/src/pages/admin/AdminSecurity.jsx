import { useState, useEffect } from 'react';
import { FiShield, FiActivity, FiUpload, FiDatabase, FiFilter } from 'react-icons/fi';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminSecurity() {
  const [tab, setTab] = useState('activity');
  const [logs, setLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [dbStats, setDbStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [actionFilter, setActionFilter] = useState('');

  useEffect(() => { fetchData(); }, [tab, pagination.page, actionFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'activity') {
        const params = { page: pagination.page };
        if (actionFilter) params.action = actionFilter;
        const { data } = await adminAPI.getActivityLogs(params);
        setLogs(data.logs);
        setPagination(data.pagination);
      } else if (tab === 'uploads') {
        const { data } = await adminAPI.getUploadHistory({ page: pagination.page });
        setHistory(data.history);
        setPagination(data.pagination);
      } else if (tab === 'database') {
        const { data } = await adminAPI.getDbStats();
        setDbStats(data);
      }
    } catch { toast.error('Failed to load security data'); }
    setLoading(false);
  };

  const actionBadge = (action) => {
    const colors = {
      approve_material: 'bg-green-100 text-green-700', reject_material: 'bg-red-100 text-red-700',
      delete_material: 'bg-red-100 text-red-700', ban_user: 'bg-orange-100 text-orange-700',
      unban_user: 'bg-blue-100 text-blue-700', delete_user: 'bg-red-100 text-red-700',
      reset_password: 'bg-yellow-100 text-yellow-700', scanner_override: 'bg-purple-100 text-purple-700',
      create_department: 'bg-blue-100 text-blue-700',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[action] || 'bg-gray-100 text-gray-700'}`}>{action?.replace(/_/g, ' ')}</span>;
  };

  const actions = ['approve_material', 'reject_material', 'delete_material', 'ban_user', 'unban_user', 'delete_user', 'reset_password', 'scanner_override', 'create_department'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security Controls</h1>
        <p className="text-gray-500 mt-1">Activity logs, upload history, and database monitoring</p>
      </div>

      <div className="flex gap-2 border-b">
        {[{ key: 'activity', label: 'Activity Logs', icon: FiActivity }, { key: 'uploads', label: 'Upload History', icon: FiUpload }, { key: 'database', label: 'Database Stats', icon: FiDatabase }].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setPagination(p => ({ ...p, page: 1 })); }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : tab === 'activity' ? (
        <>
          <div className="flex items-center gap-3">
            <FiFilter className="w-4 h-4 text-gray-500" />
            <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All Actions</option>
              {actions.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
            <span className="text-sm text-gray-500">{pagination.total} logs</span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <FiShield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No activity logs yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Admin</th>
                    <th className="text-left p-4 font-medium text-gray-700">Action</th>
                    <th className="text-left p-4 font-medium text-gray-700">Target</th>
                    <th className="text-left p-4 font-medium text-gray-700">Details</th>
                    <th className="text-left p-4 font-medium text-gray-700">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map(l => {
                    const details = typeof l.details === 'string' ? JSON.parse(l.details) : l.details;
                    return (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <p className="font-medium text-gray-900">{l.user_name || 'System'}</p>
                          <p className="text-xs text-gray-500">{l.user_email}</p>
                        </td>
                        <td className="p-4">{actionBadge(l.action)}</td>
                        <td className="p-4 text-gray-600 text-xs">
                          <span className="capitalize">{l.target_type}</span>
                          <span className="text-gray-400 ml-1">#{l.target_id?.slice(0, 8)}</span>
                        </td>
                        <td className="p-4 text-gray-600 text-xs max-w-[200px] truncate">
                          {details?.title || details?.name || details?.email || details?.action || JSON.stringify(details)}
                        </td>
                        <td className="p-4 text-gray-500 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : tab === 'uploads' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700">File</th>
                <th className="text-left p-4 font-medium text-gray-700">Uploader</th>
                <th className="text-left p-4 font-medium text-gray-700">Status</th>
                <th className="text-left p-4 font-medium text-gray-700">Scan</th>
                <th className="text-left p-4 font-medium text-gray-700">Department</th>
                <th className="text-right p-4 font-medium text-gray-700">Size</th>
                <th className="text-left p-4 font-medium text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{h.title}</p>
                    <p className="text-xs text-gray-500">{h.file_name}</p>
                  </td>
                  <td className="p-4">
                    <p className="text-gray-700 text-sm">{h.uploader_name || 'Unknown'}</p>
                    <p className="text-xs text-gray-400">{h.uploader_email}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${h.status === 'approved' ? 'bg-green-100 text-green-700' : h.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{h.status}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${h.scan_status === 'clean' ? 'bg-green-100 text-green-700' : h.scan_status === 'flagged' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{h.scan_status || 'N/A'}</span>
                  </td>
                  <td className="p-4 text-gray-600 text-xs">{h.department_name || 'N/A'}</td>
                  <td className="p-4 text-right text-gray-500 text-xs">{h.file_size ? (h.file_size / 1024 / 1024).toFixed(1) + ' MB' : 'N/A'}</td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(h.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        dbStats && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><FiDatabase className="w-5 h-5" /> Database Size</h3>
              <p className="text-3xl font-bold text-blue-600">{dbStats.databaseSize}</p>
            </div>

            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b bg-gray-50"><h3 className="font-semibold text-gray-900">Table Statistics</h3></div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-700">Table</th>
                    <th className="text-right p-4 font-medium text-gray-700">Live Rows</th>
                    <th className="text-right p-4 font-medium text-gray-700">Inserts</th>
                    <th className="text-right p-4 font-medium text-gray-700">Updates</th>
                    <th className="text-right p-4 font-medium text-gray-700">Deletes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {dbStats.tables.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-4 font-medium text-gray-900">{t.table_name}</td>
                      <td className="p-4 text-right text-gray-700">{parseInt(t.live_rows).toLocaleString()}</td>
                      <td className="p-4 text-right text-green-600">{parseInt(t.inserts).toLocaleString()}</td>
                      <td className="p-4 text-right text-blue-600">{parseInt(t.updates).toLocaleString()}</td>
                      <td className="p-4 text-right text-red-600">{parseInt(t.deletes).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {(tab === 'activity' || tab === 'uploads') && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: Math.min(pagination.pages, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPagination(prev => ({ ...prev, page: p }))}
              className={`px-3 py-1 rounded text-sm ${p === pagination.page ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
