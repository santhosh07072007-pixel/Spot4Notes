import { useState, useEffect } from 'react';
import { FiLock, FiUnlock, FiDownload, FiDownloadCloud, FiCopy, FiTrash2, FiCheck } from 'react-icons/fi';
import { adminAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminContentControl() {
  const [tab, setTab] = useState('manage');
  const [materials, setMaterials] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => { fetchData(); }, [tab, pagination.page]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'manage') {
        const { data } = await adminAPI.getMaterials({ page: pagination.page, limit: 20, status: 'approved' });
        setMaterials(data.materials);
        setPagination(data.pagination);
      } else {
        const { data } = await adminAPI.getDuplicates();
        setDuplicates(data.duplicates);
      }
    } catch { toast.error('Failed to load data'); }
    setLoading(false);
  };

  const handleToggleLock = async (id) => {
    try {
      const { data } = await adminAPI.toggleLock(id);
      toast.success(data.message);
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, is_locked: data.material.is_locked } : m));
    } catch { toast.error('Failed'); }
  };

  const handleToggleDownloads = async (id) => {
    try {
      const { data } = await adminAPI.toggleDownloads(id);
      toast.success(data.message);
      setMaterials(prev => prev.map(m => m.id === id ? { ...m, downloads_disabled: data.material.downloads_disabled } : m));
    } catch { toast.error('Failed'); }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return toast.error('Select materials first');
    if (!confirm(`Delete ${selectedIds.length} materials?`)) return;
    try {
      await adminAPI.bulkDelete(selectedIds);
      toast.success(`${selectedIds.length} materials deleted`);
      setSelectedIds([]);
      fetchData();
    } catch { toast.error('Bulk delete failed'); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const allIds = (tab === 'manage' ? materials : duplicates).map(m => m.id);
    setSelectedIds(prev => prev.length === allIds.length ? [] : allIds);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Control</h1>
          <p className="text-gray-500 mt-1">Lock, restrict, and manage uploaded content</p>
        </div>
        {selectedIds.length > 0 && (
          <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
            <FiTrash2 className="w-4 h-4" /> Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b">
        {[{ key: 'manage', label: 'Manage Content', icon: FiLock }, { key: 'duplicates', label: 'Duplicates', icon: FiCopy }].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelectedIds([]); setPagination(p => ({ ...p, page: 1 })); }}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : tab === 'manage' ? (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-3 w-10"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === materials.length && materials.length > 0} className="rounded" /></th>
                <th className="text-left p-3 font-medium text-gray-700">Title</th>
                <th className="text-left p-3 font-medium text-gray-700">Department</th>
                <th className="text-center p-3 font-medium text-gray-700">Downloads</th>
                <th className="text-center p-3 font-medium text-gray-700">Locked</th>
                <th className="text-center p-3 font-medium text-gray-700">DL Disabled</th>
                <th className="text-center p-3 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {materials.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="p-3"><input type="checkbox" checked={selectedIds.includes(m.id)} onChange={() => toggleSelect(m.id)} className="rounded" /></td>
                  <td className="p-3">
                    <p className="font-medium text-gray-900">{m.title}</p>
                    <p className="text-xs text-gray-500">{m.file_name}</p>
                  </td>
                  <td className="p-3 text-gray-600 text-xs">{m.department_name || 'N/A'}</td>
                  <td className="p-3 text-center text-gray-700">{m.download_count}</td>
                  <td className="p-3 text-center">
                    {m.is_locked ? <span className="text-red-500 text-xs font-medium">Locked</span> : <span className="text-green-500 text-xs">Open</span>}
                  </td>
                  <td className="p-3 text-center">
                    {m.downloads_disabled ? <span className="text-red-500 text-xs font-medium">Disabled</span> : <span className="text-green-500 text-xs">Enabled</span>}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleToggleLock(m.id)} title={m.is_locked ? 'Unlock' : 'Lock'}
                        className={`p-1.5 rounded ${m.is_locked ? 'text-green-600 hover:bg-green-50' : 'text-red-600 hover:bg-red-50'}`}>
                        {m.is_locked ? <FiUnlock className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleToggleDownloads(m.id)} title={m.downloads_disabled ? 'Enable Downloads' : 'Disable Downloads'}
                        className={`p-1.5 rounded ${m.downloads_disabled ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}>
                        {m.downloads_disabled ? <FiDownloadCloud className="w-4 h-4" /> : <FiDownload className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          {duplicates.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <FiCheck className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No duplicates found!</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 border-b bg-yellow-50">
                <p className="text-sm text-yellow-700 font-medium">{duplicates.length} duplicate files detected (same filename + size)</p>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 w-10"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === duplicates.length && duplicates.length > 0} className="rounded" /></th>
                    <th className="text-left p-3 font-medium text-gray-700">Title</th>
                    <th className="text-left p-3 font-medium text-gray-700">File</th>
                    <th className="text-left p-3 font-medium text-gray-700">Uploader</th>
                    <th className="text-left p-3 font-medium text-gray-700">Duplicates</th>
                    <th className="text-left p-3 font-medium text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {duplicates.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="p-3"><input type="checkbox" checked={selectedIds.includes(d.id)} onChange={() => toggleSelect(d.id)} className="rounded" /></td>
                      <td className="p-3 font-medium text-gray-900">{d.title}</td>
                      <td className="p-3 text-gray-600 text-xs">{d.file_name}</td>
                      <td className="p-3 text-gray-600">{d.uploader_name || 'Unknown'}</td>
                      <td className="p-3"><span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">{d.duplicate_count} copies</span></td>
                      <td className="p-3 text-gray-500 text-xs">{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'manage' && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPagination(prev => ({ ...prev, page: p }))}
              className={`px-3 py-1 rounded text-sm ${p === pagination.page ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}
