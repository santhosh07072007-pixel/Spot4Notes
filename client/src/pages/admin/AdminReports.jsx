import { useState, useEffect } from 'react';
import { FiDownload, FiTrendingUp, FiBarChart2, FiEye, FiCalendar, FiFilter } from 'react-icons/fi';
import { adminAPI, departmentsAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminReports() {
  const [tab, setTab] = useState('uploads');
  const [report, setReport] = useState([]);
  const [growth, setGrowth] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ department_id: '', date_from: '', date_to: '' });

  useEffect(() => { departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments || data)).catch(() => {}); }, []);
  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'uploads') {
        const { data } = await adminAPI.getUploadReport(filters);
        setReport(data.report);
      } else {
        const { data } = await adminAPI.getGrowthStats();
        setGrowth(data);
      }
    } catch { toast.error('Failed to load report data'); }
    setLoading(false);
  };

  const handleExportCSV = async () => {
    try {
      const response = await adminAPI.downloadCSV(filters);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'uploads-report.csv'; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Generate reports and track growth</p>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {[{ key: 'uploads', label: 'Upload Reports', icon: FiBarChart2 }, { key: 'growth', label: 'Growth Stats', icon: FiTrendingUp }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'uploads' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
                <select value={filters.department_id} onChange={e => setFilters({ ...filters, department_id: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">All Departments</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input type="date" value={filters.date_from} onChange={e => setFilters({ ...filters, date_from: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input type="date" value={filters.date_to} onChange={e => setFilters({ ...filters, date_to: e.target.value })}
                  className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                <FiFilter className="w-4 h-4" /> Apply
              </button>
              <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                <FiDownload className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <p className="text-sm text-gray-600">{report.length} records found</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-700">Title</th>
                      <th className="text-left p-3 font-medium text-gray-700">Category</th>
                      <th className="text-left p-3 font-medium text-gray-700">Status</th>
                      <th className="text-left p-3 font-medium text-gray-700">Department</th>
                      <th className="text-left p-3 font-medium text-gray-700">Uploader</th>
                      <th className="text-right p-3 font-medium text-gray-700">Downloads</th>
                      <th className="text-right p-3 font-medium text-gray-700">Views</th>
                      <th className="text-right p-3 font-medium text-gray-700">Size</th>
                      <th className="text-left p-3 font-medium text-gray-700">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900 max-w-[200px] truncate">{r.title}</td>
                        <td className="p-3"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">{r.category}</span></td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${r.status === 'approved' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
                        </td>
                        <td className="p-3 text-gray-600 text-xs">{r.department || 'N/A'}</td>
                        <td className="p-3 text-gray-600 text-xs">{r.uploader || 'Unknown'}</td>
                        <td className="p-3 text-right text-gray-700">{r.download_count}</td>
                        <td className="p-3 text-right text-gray-700">{r.view_count}</td>
                        <td className="p-3 text-right text-gray-500 text-xs">{formatSize(r.file_size)}</td>
                        <td className="p-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'growth' && (
        loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : growth && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><FiDownload className="w-5 h-5 text-blue-600" /></div>
                  <div><p className="text-sm text-gray-500">Total Downloads</p><p className="text-2xl font-bold text-gray-900">{growth.totalDownloads.toLocaleString()}</p></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><FiEye className="w-5 h-5 text-purple-600" /></div>
                  <div><p className="text-sm text-gray-500">Total Views</p><p className="text-2xl font-bold text-gray-900">{growth.totalViews.toLocaleString()}</p></div>
                </div>
              </div>
            </div>

            {/* Weekly Upload Trend */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FiCalendar className="w-5 h-5" /> Weekly Upload Trend (3 months)</h3>
              <div className="space-y-2">
                {growth.weeklyUploads.map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24">{new Date(w.week).toLocaleDateString()}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(5, (parseInt(w.count) / Math.max(...growth.weeklyUploads.map(x => parseInt(x.count)), 1)) * 100)}%` }}>
                        <span className="text-xs text-white font-medium">{w.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {growth.weeklyUploads.length === 0 && <p className="text-gray-400 text-sm italic">No data for this period</p>}
              </div>
            </div>

            {/* Weekly User Trend */}
            <div className="bg-white rounded-xl border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><FiTrendingUp className="w-5 h-5" /> Weekly User Registrations (3 months)</h3>
              <div className="space-y-2">
                {growth.weeklyUsers.map((w, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24">{new Date(w.week).toLocaleDateString()}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                        style={{ width: `${Math.max(5, (parseInt(w.count) / Math.max(...growth.weeklyUsers.map(x => parseInt(x.count)), 1)) * 100)}%` }}>
                        <span className="text-xs text-white font-medium">{w.count}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {growth.weeklyUsers.length === 0 && <p className="text-gray-400 text-sm italic">No data for this period</p>}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
