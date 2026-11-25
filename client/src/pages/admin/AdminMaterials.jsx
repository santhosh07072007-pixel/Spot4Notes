import { useEffect, useState } from 'react';
import { FiCheck, FiX, FiAlertTriangle, FiEye, FiEdit2, FiTrash2, FiSearch, FiFilter, FiDownload, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { adminAPI } from '../../lib/api';
import axios from 'axios';

export default function AdminMaterials() {
  const [materials, setMaterials] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [scanFilter, setScanFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: '', year: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    axios.get('/api/departments').then(({ data }) => setDepartments(data.departments || [])).catch(() => {});
  }, []);

  const fetchMaterials = () => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (filter) params.status = filter;
    if (scanFilter) params.scan_status = scanFilter;
    if (deptFilter) params.department_id = deptFilter;
    if (catFilter) params.category = catFilter;
    if (yearFilter) params.year = yearFilter;
    if (searchQuery) params.search = searchQuery;

    adminAPI.getMaterials(params)
      .then(({ data }) => {
        setMaterials(data.materials);
        setPagination(data.pagination);
      })
      .catch(() => toast.error('Failed to load materials'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMaterials(); }, [filter, scanFilter, deptFilter, catFilter, yearFilter, page]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchMaterials(); }, 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveMaterial(id);
      toast.success('Material approved');
      fetchMaterials();
    } catch { toast.error('Failed to approve'); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await adminAPI.rejectMaterial(rejectModal, rejectReason);
      toast.success('Material rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchMaterials();
    } catch { toast.error('Failed to reject'); }
  };

  const handleEdit = async () => {
    if (!editModal) return;
    try {
      await adminAPI.editMaterial(editModal, editForm);
      toast.success('Material updated');
      setEditModal(null);
      fetchMaterials();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await adminAPI.deleteMaterial(deleteConfirm);
      toast.success('Material deleted');
      setDeleteConfirm(null);
      fetchMaterials();
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (mat) => {
    setEditForm({ title: mat.title, description: mat.description || '', category: mat.category, year: mat.year || '' });
    setEditModal(mat.id);
  };

  const categoryLabels = {
    notes: 'Notes', question_papers: 'Question Papers', ppt: 'PPTs',
    important_questions: 'Important Qs', study_materials: 'Study Materials',
  };

  const resetFilters = () => {
    setFilter(''); setScanFilter(''); setDeptFilter(''); setCatFilter(''); setYearFilter(''); setSearchQuery(''); setPage(1);
  };

  const hasFilters = filter || scanFilter || deptFilter || catFilter || yearFilter || searchQuery;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Materials</h1>
          <p className="text-gray-500 text-sm mt-1">Review, approve, reject, edit, or delete uploaded materials</p>
        </div>
        {hasFilters && (
          <button onClick={resetFilters} className="btn-secondary !py-2 !px-4 text-sm">Clear Filters</button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="input-field !pl-10" placeholder="Search by title or filename..." />
      </div>

      {/* Status & Scan Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'pending', 'approved', 'rejected'].map((f) => (
          <button key={f} onClick={() => { setFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {f || 'All'} {f === 'pending' ? '⏳' : f === 'approved' ? '✅' : f === 'rejected' ? '❌' : ''}
          </button>
        ))}
        <div className="border-l border-gray-200 mx-2" />
        {['', 'flagged', 'clean'].map((f) => (
          <button key={`scan-${f}`} onClick={() => { setScanFilter(f); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${scanFilter === f ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {f ? `Scan: ${f}` : 'All scans'} {f === 'flagged' ? '🚩' : ''}
          </button>
        ))}
      </div>

      {/* Advanced Filters Row */}
      <div className="flex flex-wrap gap-3 items-center">
        <FiFilter size={16} className="text-gray-400" />
        <select value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-2 text-sm">
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-2 text-sm">
          <option value="">All Categories</option>
          {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={yearFilter} onChange={(e) => { setYearFilter(e.target.value); setPage(1); }} className="input-field !w-auto !py-2 text-sm">
          <option value="">All Years</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Uploader</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Year</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Scan</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((mat) => (
                  <tr key={mat.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {mat.is_locked && <FiLock size={12} className="text-amber-500 shrink-0" title="Locked" />}
                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="font-medium text-gray-900 hover:text-primary-600 max-w-[180px] truncate block">
                          {mat.title}
                        </a>
                      </div>
                      <span className="text-xs text-gray-400">{mat.file_name}</span>
                      {mat.downloads_disabled && <span className="text-xs text-red-400 block">Downloads off</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-gray-100 text-gray-600">{categoryLabels[mat.category]}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{mat.uploader_name}</div>
                      <div className="text-xs text-gray-400">{mat.uploader_email}</div>
                      {mat.uploader_department && <div className="text-xs text-primary-500">{mat.uploader_department}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {mat.is_common ? (
                        <span className="text-emerald-600 font-medium">All Depts</span>
                      ) : mat.departments?.length > 1 ? (
                        <span title={mat.departments.map(d => d.name).join(', ')}>
                          {mat.departments.length} depts
                        </span>
                      ) : (
                        mat.department_name
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{mat.year ? `Year ${mat.year}` : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${mat.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : mat.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {mat.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${mat.scan_status === 'clean' ? 'bg-green-100 text-green-700' : mat.scan_status === 'flagged' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {mat.scan_status === 'flagged' && <FiAlertTriangle size={10} className="mr-1" />}
                        {mat.scan_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(mat.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {mat.status !== 'approved' && (
                          <button onClick={() => handleApprove(mat.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Approve"><FiCheck size={16} /></button>
                        )}
                        {mat.status !== 'rejected' && (
                          <button onClick={() => setRejectModal(mat.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Reject"><FiX size={16} /></button>
                        )}
                        <button onClick={() => openEdit(mat)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><FiEdit2 size={16} /></button>
                        <button onClick={() => setDeleteConfirm(mat.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><FiTrash2 size={16} /></button>
                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="View file"><FiEye size={16} /></a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {materials.length === 0 && <div className="p-12 text-center text-gray-400">No materials found</div>}
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

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900">Reject Material</h3>
            <p className="text-sm text-gray-500 mt-1">Provide a reason for rejection</p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="input-field mt-4" rows={3} placeholder="Reason for rejection..." />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleReject} className="btn-danger">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900">Edit Material</h3>
            <p className="text-sm text-gray-500 mt-1">Update material metadata</p>
            <div className="space-y-3 mt-4">
              <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="input-field" placeholder="Title" />
              <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input-field" rows={3} placeholder="Description" />
              <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="input-field">
                {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} className="input-field">
                <option value="">No Year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleEdit} className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-gray-900">Delete Material</h3>
            <p className="text-sm text-gray-500 mt-2">This will permanently delete this material and its file. This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleDelete} className="btn-danger">Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
