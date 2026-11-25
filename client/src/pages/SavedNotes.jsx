import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBookmark, FiDownload, FiEye, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { materialsAPI } from '../lib/api';

const categoryLabels = {
  notes: 'Notes', question_papers: 'Question Papers', ppt: 'PPTs',
  important_questions: 'Important Questions', study_materials: 'Study Materials',
};

export default function SavedNotes() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    materialsAPI.getBookmarks()
      .then(({ data }) => setMaterials(data.materials))
      .catch(() => toast.error('Failed to load saved notes'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemoveBookmark = async (id) => {
    try {
      await materialsAPI.bookmark(id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
      toast.success('Bookmark removed');
    } catch {
      toast.error('Failed to remove bookmark');
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Saved Notes</h1>
        <p className="text-gray-500 mt-1">Your bookmarked materials for quick access</p>
      </div>

      {materials.length === 0 ? (
        <div className="card p-12 text-center">
          <FiBookmark className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400 text-lg">No saved notes yet</p>
          <p className="text-gray-400 text-sm mt-1">Bookmark materials while browsing to save them here</p>
          <Link to="/materials" className="btn-primary inline-block mt-4">Browse Materials</Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((mat) => (
            <div key={mat.id} className="card p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="badge bg-gray-100 text-gray-600 text-xs">{categoryLabels[mat.category]}</span>
                {mat.is_common ? (
                  <span className="text-xs text-emerald-600 font-medium">All Departments</span>
                ) : mat.departments?.length > 1 ? (
                  <span className="text-xs text-gray-400">{mat.departments.map(d => d.name).join(', ')}</span>
                ) : mat.department_name ? (
                  <span className="text-xs text-gray-400">{mat.department_name}</span>
                ) : null}
              </div>
              <Link to={`/materials/${mat.id}`} className="font-semibold text-gray-900 hover:text-primary-600 line-clamp-2 flex-1">
                {mat.title}
              </Link>
              {mat.subject_name && <p className="text-xs text-gray-400 mt-1">{mat.subject_name}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><FiEye size={11} /> {mat.view_count}</span>
                  <span className="flex items-center gap-1"><FiDownload size={11} /> {mat.download_count}</span>
                </div>
                <button
                  onClick={() => handleRemoveBookmark(mat.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"
                  title="Remove bookmark"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
