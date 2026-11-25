import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUsers, FiFile, FiClock, FiCheckCircle, FiXCircle, FiAlertTriangle, FiTrendingUp, FiDownload } from 'react-icons/fi';
import { adminAPI } from '../../lib/api';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getAnalytics()
      .then(({ data: analyticsData }) => setData(analyticsData))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!data) return <p className="text-gray-400">Failed to load analytics</p>;

  const categoryLabels = {
    notes: 'Notes', question_papers: 'Question Papers', ppt: 'PPTs',
    important_questions: 'Important Qs', study_materials: 'Study Materials',
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
              <FiUsers className="text-rose-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.totalUsers}</p>
              <p className="text-xs text-gray-500">Total Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center">
              <FiFile className="text-emerald-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.totalUploads}</p>
              <p className="text-xs text-gray-500">Total Uploads</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
              <FiClock className="text-amber-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.pendingUploads}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <FiCheckCircle className="text-green-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.approvedUploads}</p>
              <p className="text-xs text-gray-500">Approved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <FiXCircle className="text-red-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.rejectedUploads}</p>
              <p className="text-xs text-gray-500">Rejected</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
              <FiAlertTriangle className="text-orange-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.flaggedUploads}</p>
              <p className="text-xs text-gray-500">Flagged</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center">
              <FiUsers className="text-pink-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.bannedUsers}</p>
              <p className="text-xs text-gray-500">Banned</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <FiTrendingUp className="text-purple-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{data.stats.totalDepartments}</p>
              <p className="text-xs text-gray-500">Departments</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analytics Row */}
      <div className="bg-gradient-to-r from-violet-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
        <h2 className="font-bold mb-4 flex items-center gap-2">⚡ AI Analytics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-2xl font-black">{data.stats.activeUsers || 0}</p>
            <p className="text-xs text-white/70">Active Users (30d)</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-2xl font-black">{data.stats.aiProcessed || 0}</p>
            <p className="text-xs text-white/70">AI Processed</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-2xl font-black">{data.stats.avgQualityScore || '—'}</p>
            <p className="text-xs text-white/70">Avg Quality Score</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-2xl font-black">{data.stats.aiDuplicates || 0}</p>
            <p className="text-xs text-white/70">⚠ Duplicates</p>
          </div>
          <div className="bg-white/15 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-2xl font-black">{data.stats.aiSimilar || 0}</p>
            <p className="text-xs text-white/70">⚠ Similar Content</p>
          </div>
        </div>
      </div>

      {/* Most Active Dept + Top Contributors */}
      <div className="grid lg:grid-cols-2 gap-5">
        {data.stats.mostActiveDepartment && (
          <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200">
            <h2 className="font-semibold text-gray-900 mb-4">Most Active Department</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center text-2xl">🏆</div>
              <div>
                <p className="text-lg font-bold text-gray-900">{data.stats.mostActiveDepartment.name}</p>
                <p className="text-sm text-gray-500">{data.stats.mostActiveDepartment.upload_count} uploads</p>
              </div>
            </div>
          </div>
        )}

        {data.topContributors?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200">
            <h2 className="font-semibold text-gray-900 mb-4">Top Contributors</h2>
            <div className="space-y-3">
              {data.topContributors.map((u, i) => {
                const medalColors = ['bg-amber-100 text-amber-700', 'bg-gray-100 text-gray-600', 'bg-orange-100 text-orange-700'];
                return (
                  <div key={u.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-rose-50/50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${medalColors[i] || 'bg-gray-50 text-gray-400'}`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.department || 'N/A'}</p>
                    </div>
                    <span className="text-sm font-bold text-rose-500">{u.upload_count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Department & Category Uploads */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200">
          <h2 className="font-semibold text-gray-900 mb-4">Uploads by Department</h2>
          <div className="space-y-3">
            {data.departmentUploads.map((dept) => {
              const maxCount = Math.max(...data.departmentUploads.map(d => parseInt(d.upload_count) || 1));
              const pct = ((parseInt(dept.upload_count) || 0) / maxCount) * 100;
              return (
                <div key={dept.slug}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{dept.name}</span>
                    <span className="text-sm font-bold text-gray-500">{dept.upload_count}</span>
                  </div>
                  <div className="w-full rounded-full h-2 bg-rose-50">
                    <div className="h-2 rounded-full bg-rose-400 transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200">
          <h2 className="font-semibold text-gray-900 mb-4">Uploads by Category</h2>
          <div className="space-y-3">
            {data.categoryUploads.map((cat) => {
              const maxCount = Math.max(...data.categoryUploads.map(c => parseInt(c.count) || 1));
              const pct = ((parseInt(cat.count) || 0) / maxCount) * 100;
              const barColors = {
                notes: 'bg-rose-400', question_papers: 'bg-amber-400', ppt: 'bg-purple-400',
                important_questions: 'bg-red-400', study_materials: 'bg-emerald-400',
              };
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{categoryLabels[cat.category] || cat.category}</span>
                    <span className="text-sm font-bold text-gray-500">{cat.count}</span>
                  </div>
                  <div className="w-full rounded-full h-2 bg-rose-50">
                    <div className={`h-2 rounded-full transition-all ${barColors[cat.category] || 'bg-gray-400'}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Year uploads + Top Downloads */}
      <div className="grid lg:grid-cols-2 gap-5">
        {data.yearUploads?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200">
            <h2 className="font-semibold text-gray-900 mb-4">Uploads by Year</h2>
            <div className="space-y-3">
              {data.yearUploads.map((y) => {
                const maxCount = Math.max(...data.yearUploads.map(x => parseInt(x.count) || 1));
                const pct = ((parseInt(y.count) || 0) / maxCount) * 100;
                return (
                  <div key={y.year}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{y.year}</span>
                      <span className="text-sm font-bold text-gray-500">{y.count}</span>
                    </div>
                    <div className="w-full rounded-full h-2 bg-rose-50">
                      <div className="h-2 rounded-full bg-pink-400" style={{ width: `${Math.max(pct, 3)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {data.topDownloads?.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4"><FiDownload size={16} /> Most Downloaded</h2>
            <div className="space-y-3">
              {data.topDownloads.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-rose-50/50 transition-colors">
                  <span className="text-sm font-bold w-5 text-gray-300">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-gray-900">{m.title}</p>
                    <p className="text-xs text-gray-400">{m.department_name || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-500">{m.download_count}</p>
                    <p className="text-[10px] text-gray-400">{m.view_count} views</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Uploads Table */}
      <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Uploads</h2>
          <Link to="/admin/materials" className="text-rose-500 text-sm font-medium hover:text-rose-600">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-rose-100">
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-left text-gray-400">Title</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-left text-gray-400">Uploader</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-left text-gray-400">Department</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-left text-gray-400">Status</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-left text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUploads.map((mat) => (
                <tr key={mat.id} className="border-b border-gray-50 hover:bg-rose-50/30 transition-colors">
                  <td className="py-3 max-w-[200px] truncate font-medium text-gray-900">{mat.title}</td>
                  <td className="py-3 text-gray-500">{mat.uploader_name || 'Unknown'}</td>
                  <td className="py-3 text-gray-500">{mat.department_name}</td>
                  <td className="py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mat.status === 'approved' ? 'bg-green-100 text-green-700' :
                        mat.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                      }`}>{mat.status}</span>
                  </td>
                  <td className="py-3 text-gray-400">{new Date(mat.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
