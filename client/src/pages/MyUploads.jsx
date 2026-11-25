import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTrash2, FiEye, FiDownload, FiClock, FiCheckCircle, FiXCircle, FiEdit2, FiX, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { materialsAPI } from '../lib/api';

const categoryLabels = {
  notes: 'Notes', question_papers: 'Question Papers', ppt: 'PPTs',
  important_questions: 'Important Questions', study_materials: 'Study Materials',
};

const statusConfig = {
  pending: { icon: FiClock, cls: 'text-amber-600 bg-amber-50', label: 'Pending Review' },
  approved: { icon: FiCheckCircle, cls: 'text-emerald-600 bg-emerald-50', label: 'Approved' },
  rejected: { icon: FiXCircle, cls: 'text-red-600 bg-red-50', label: 'Rejected' },
};

export default function MyUploads() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    materialsAPI.getMyUploads()
      .then(({ data }) => setMaterials(data.materials))
      .catch(() => toast.error('Failed to load uploads'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await materialsAPI.delete(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success('Material deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  const startEdit = (mat) => {
    setEditingId(mat.id);
    setEditForm({
      title: mat.title || '',
      description: mat.description || '',
      category: mat.category || '',
      course_code: mat.course_code || '',
      course_title: mat.course_title || '',
      tags: (mat.tags || []).join(', '),
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      const { data } = await materialsAPI.editMaterial(id, editForm);
      setMaterials((prev) => prev.map((m) => m.id === id ? { ...m, ...data.material } : m));
      setEditingId(null);
      toast.success('Material updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Uploads</h1>
          <p className="text-gray-500 mt-1">Manage your uploaded materials</p>
        </div>
        <Link to="/upload" className="btn-primary">Upload New</Link>
      </div>

      {materials.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 text-lg">You haven't uploaded anything yet</p>
          <Link to="/upload" className="btn-primary inline-block mt-4">Upload Your First Material</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((mat) => {
            const status = statusConfig[mat.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isEditing = editingId === mat.id;
            return (
              <div key={mat.id} className="card p-4 sm:p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-700">Edit Material</h4>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
                    </div>
                    <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="input-field" placeholder="Title" />
                    <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="input-field" rows={2} placeholder="Description" />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={editForm.course_code} onChange={(e) => setEditForm({ ...editForm, course_code: e.target.value })} className="input-field" placeholder="Course Code" />
                      <input type="text" value={editForm.course_title} onChange={(e) => setEditForm({ ...editForm, course_title: e.target.value })} className="input-field" placeholder="Course Title" />
                    </div>
                    <input type="text" value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} className="input-field" placeholder="Tags (comma-separated)" />
                    <button onClick={() => handleSaveEdit(mat.id)} className="btn-primary flex items-center gap-2 text-sm">
                      <FiSave size={14} /> Save Changes
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`badge ${status.cls}`}>
                          <StatusIcon size={12} className="mr-1" /> {status.label}
                        </span>
                        <span className="badge bg-gray-100 text-gray-600">
                          {categoryLabels[mat.category]}
                        </span>
                        {mat.course_code && <span className="badge bg-blue-50 text-blue-600">{mat.course_code}</span>}
                      </div>
                      <h3 className="font-semibold text-gray-900 mt-2 truncate">{mat.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>
                          {mat.is_common
                            ? 'All Departments'
                            : mat.departments?.length > 1
                            ? mat.departments.map((d) => d.name).join(', ')
                            : mat.department_name}
                        </span>
                        {mat.subject_name && <span>· {mat.subject_name}</span>}
                        <span>· {new Date(mat.created_at).toLocaleDateString()}</span>
                      </div>
                      {mat.status === 'rejected' && mat.rejection_reason && (
                        <p className="text-sm text-red-600 mt-2 bg-red-50 px-3 py-1.5 rounded">
                          Rejection reason: {mat.rejection_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-3 text-xs text-gray-400 mr-3">
                        <span className="flex items-center gap-1"><FiEye size={12} /> {mat.view_count}</span>
                        <span className="flex items-center gap-1"><FiDownload size={12} /> {mat.download_count}</span>
                      </div>
                      <Link to={`/materials/${mat.id}`} className="btn-secondary !py-1.5 !px-3 text-xs">View</Link>
                      {mat.status === 'pending' && (
                        <button onClick={() => startEdit(mat)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit metadata">
                          <FiEdit2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(mat.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
