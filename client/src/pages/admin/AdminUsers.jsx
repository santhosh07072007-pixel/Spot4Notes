import { useEffect, useState } from 'react';
import { FiSearch, FiSlash, FiCheckCircle, FiUser, FiUpload, FiMail, FiTrash2, FiKey, FiAward, FiClock, FiFilter } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../lib/api';
import axios from 'axios';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetModal, setResetModal] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [badgeModal, setBadgeModal] = useState(null);
  const [badgeValue, setBadgeValue] = useState('');

  useEffect(() => {
    axios.get('/api/departments').then(({ data }) => setDepartments(data.departments || [])).catch(() => {});
  }, []);

  const fetchUsers = () => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (deptFilter) params.department = deptFilter;
    if (statusFilter) params.status = statusFilter;

    adminAPI.getUsers(params)
      .then(({ data }) => {
        setUsers(data.users);
        setPagination(data.pagination);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [page, deptFilter, statusFilter]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchUsers(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleBan = async (id) => {
    try {
      await adminAPI.banUser(id);
      toast.success('User banned');
      fetchUsers();
    } catch { toast.error('Failed to ban user'); }
  };

  const handleUnban = async (id) => {
    try {
      await adminAPI.unbanUser(id);
      toast.success('User unbanned');
      fetchUsers();
    } catch { toast.error('Failed to unban user'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await adminAPI.deleteUser(deleteConfirm);
      toast.success('User deleted');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete user'); }
  };

  const handleResetPassword = async () => {
    if (!resetModal) return;
    try {
      const { data } = await adminAPI.resetUserPassword(resetModal);
      setTempPassword(data.tempPassword);
      toast.success('Password reset successfully');
    } catch { toast.error('Failed to reset password'); }
  };

  const handleAssignBadge = async () => {
    if (!badgeModal) return;
    try {
      await adminAPI.assignBadge(badgeModal, badgeValue || null);
      toast.success(badgeValue ? `Badge "${badgeValue}" assigned` : 'Badge removed');
      setBadgeModal(null);
      setBadgeValue('');
      fetchUsers();
    } catch { toast.error('Failed to assign badge'); }
  };

  const badgeOptions = ['Top Contributor', 'Verified Uploader', 'Star Student', 'Dept Leader', 'Mentor'];

  const formatLastLogin = (dt) => {
    if (!dt) return 'Never';
    const d = new Date(dt);
    const now = new Date();
    const diff = Math.floor((now - d) / (1000 * 60));
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <p className="text-gray-500 text-sm mt-1">View, manage, and moderate user accounts</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field !pl-10" placeholder="Search by name or email..." />
        </div>
        <FiFilter size={16} className="text-gray-400" />
        <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-2 text-sm">
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-2 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <div key={user.id} className="card flex flex-col sm:flex-row sm:items-center gap-4 p-5">
              {/* Avatar */}
              <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-bold text-lg">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900">{user.name}</h3>
                  {user.role === 'admin' && <span className="badge bg-purple-100 text-purple-700 text-xs">Admin</span>}
                  {user.is_banned && <span className="badge bg-red-100 text-red-700 text-xs">Banned</span>}
                  {!user.is_verified && <span className="badge bg-amber-100 text-amber-700 text-xs">Unverified</span>}
                  {user.badge && <span className="badge bg-blue-100 text-blue-700 text-xs flex items-center gap-1"><FiAward size={10} />{user.badge}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><FiMail size={12} /> {user.email}</span>
                  {user.department && <span className="flex items-center gap-1"><FiUser size={12} /> {user.department}</span>}
                  {user.year && <span>Year {user.year}</span>}
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="text-center">
                  <div className="flex items-center gap-1"><FiUpload size={12} /> <span className="font-semibold text-gray-700">{user.upload_count || 0}</span></div>
                  <div className="text-xs">Uploads</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-xs text-gray-400"><FiClock size={10} /> Last login</div>
                  <div className="text-xs font-medium">{formatLastLogin(user.last_login_at)}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-400">Joined</div>
                  <div className="text-xs font-medium">{new Date(user.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Actions */}
              {user.role !== 'admin' && (
                <div className="flex items-center gap-2 sm:ml-4">
                  {user.is_banned ? (
                    <button onClick={() => handleUnban(user.id)} className="btn-success !py-2 !px-3 text-sm flex items-center gap-1"><FiCheckCircle size={14} /> Unban</button>
                  ) : (
                    <button onClick={() => handleBan(user.id)} className="btn-danger !py-2 !px-3 text-sm flex items-center gap-1"><FiSlash size={14} /> Ban</button>
                  )}
                  <button onClick={() => { setBadgeModal(user.id); setBadgeValue(user.badge || ''); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Assign Badge"><FiAward size={16} /></button>
                  <button onClick={() => { setResetModal(user.id); setTempPassword(''); }} className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Reset Password"><FiKey size={16} /></button>
                  <button onClick={() => setDeleteConfirm(user.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete User"><FiTrash2 size={16} /></button>
                </div>
              )}
            </div>
          ))}

          {users.length === 0 && <div className="text-center py-12 text-gray-400">No users found</div>}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-50">Previous</button>
          <span className="text-sm text-gray-500">Page {page} of {pagination.pages} ({pagination.total} total)</span>
          <button onClick={() => setPage(Math.min(pagination.pages, page + 1))} disabled={page === pagination.pages} className="btn-secondary !py-2 !px-4 text-sm disabled:opacity-50">Next</button>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900">Delete User</h3>
            <p className="text-sm text-gray-500 mt-2">This will permanently delete this user and all their uploads. This cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} className="btn-danger">Delete Forever</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setResetModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900">Reset Password</h3>
            {tempPassword ? (
              <div className="mt-4">
                <p className="text-sm text-gray-500">Temporary password generated:</p>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg font-mono text-lg text-center select-all font-bold text-primary-700">{tempPassword}</div>
                <p className="text-xs text-gray-400 mt-2">Share this with the user securely. They should change it after login.</p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-gray-500">This will generate a temporary password for the user. Their current password will be overwritten.</p>
                <button onClick={handleResetPassword} className="btn-primary w-full mt-4">Generate Temp Password</button>
              </div>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setResetModal(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Modal */}
      {badgeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setBadgeModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900">Assign Badge</h3>
            <p className="text-sm text-gray-500 mt-1">Select a badge or clear to remove</p>
            <div className="mt-4 grid grid-cols-1 gap-2">
              {badgeOptions.map((b) => (
                <button key={b} onClick={() => setBadgeValue(b)}
                  className={`px-4 py-2 rounded-lg text-sm text-left transition-colors ${badgeValue === b ? 'bg-blue-100 text-blue-700 font-medium' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                  <FiAward size={14} className="inline mr-2" />{b}
                </button>
              ))}
              <button onClick={() => setBadgeValue('')} className={`px-4 py-2 rounded-lg text-sm text-left transition-colors ${!badgeValue ? 'bg-red-50 text-red-600 font-medium' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                No Badge (Remove)
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setBadgeModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleAssignBadge} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
