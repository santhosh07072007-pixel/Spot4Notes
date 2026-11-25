import { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { adminAPI, departmentsAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDept, setShowAddDept] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', description: '', icon: '📚' });

  useEffect(() => { fetchDepartments(); }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data } = await departmentsAPI.getAll();
      setDepartments(data.departments || data);
    } catch { toast.error('Failed to load departments'); }
    setLoading(false);
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createDepartment(deptForm);
      toast.success('Department created');
      setShowAddDept(false);
      setDeptForm({ name: '', description: '', icon: '📚' });
      fetchDepartments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create department'); }
  };

  const handleUpdateDept = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateDepartment(editDept.id, deptForm);
      toast.success('Department updated');
      setEditDept(null);
      setDeptForm({ name: '', description: '', icon: '📚' });
      fetchDepartments();
    } catch { toast.error('Failed to update department'); }
  };

  const handleDeleteDept = async (id) => {
    if (!confirm('Delete this department? It must have no materials.')) return;
    try {
      await adminAPI.deleteDepartment(id);
      toast.success('Department deleted');
      fetchDepartments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
  };

  const startEdit = (dept) => {
    setEditDept(dept);
    setDeptForm({ name: dept.name, description: dept.description || '', icon: dept.icon || '📚' });
    setShowAddDept(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
          <p className="text-gray-500 mt-1">{departments.length} departments</p>
        </div>
        <button onClick={() => { setShowAddDept(true); setEditDept(null); setDeptForm({ name: '', description: '', icon: '📚' }); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <FiPlus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {/* Add/Edit Department Form */}
      {(showAddDept || editDept) && (
        <form onSubmit={editDept ? handleUpdateDept : handleCreateDept} className="bg-white rounded-xl border p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">{editDept ? 'Edit Department' : 'New Department'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} placeholder="Department Name" required
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            <input value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} placeholder="Description"
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            <input value={deptForm.icon} onChange={e => setDeptForm({ ...deptForm, icon: e.target.value })} placeholder="Icon (emoji)"
              className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editDept ? 'Update' : 'Create'}</button>
            <button type="button" onClick={() => { setShowAddDept(false); setEditDept(null); }} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Departments List */}
      <div className="space-y-3">
        {departments.map(dept => (
          <div key={dept.id} className="bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{dept.icon || '📚'}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startEdit(dept)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><FiEdit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDeleteDept(dept.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
