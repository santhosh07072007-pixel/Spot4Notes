import { useState, useEffect } from 'react';
import { FiBell, FiSend, FiTrash2, FiPlus, FiUsers } from 'react-icons/fi';
import { adminAPI, departmentsAPI } from '../../lib/api';
import toast from 'react-hot-toast';

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'general', department_id: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments || data)).catch(() => {});
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data } = await adminAPI.getAnnouncements();
      setAnnouncements(data.announcements);
    } catch { toast.error('Failed to load announcements'); }
    setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const payload = { ...form };
      if (!payload.department_id) delete payload.department_id;
      const { data } = await adminAPI.sendAnnouncement(payload);
      toast.success(data.message);
      setShowForm(false);
      setForm({ title: '', message: '', type: 'general', department_id: '' });
      fetchAnnouncements();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send announcement'); }
    setSending(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await adminAPI.deleteAnnouncement(id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch { toast.error('Failed to delete'); }
  };

  const typeBadge = (type) => {
    const colors = { general: 'bg-blue-100 text-blue-700', urgent: 'bg-red-100 text-red-700', info: 'bg-green-100 text-green-700', maintenance: 'bg-yellow-100 text-yellow-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>{type}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 mt-1">Send notifications to all or specific department users</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          <FiPlus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      {/* Send Form */}
      {showForm && (
        <form onSubmit={handleSend} className="bg-white rounded-xl border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FiSend className="w-4 h-4" /> New Announcement</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Announcement Title" required
              className="border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            <div className="flex gap-3">
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                className="border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="general">General</option>
                <option value="urgent">Urgent</option>
                <option value="info">Info</option>
                <option value="maintenance">Maintenance</option>
              </select>
              <select value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}
                className="flex-1 border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Announcement message..." required rows={3}
            className="w-full border rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={sending} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <FiSend className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Announcement'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
          </div>
        </form>
      )}

      {/* Announcements List */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
      ) : announcements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <FiBell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No announcements yet</p>
          <p className="text-gray-400 text-sm">Create one to notify users</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">{a.title}</h3>
                    {typeBadge(a.type)}
                    {a.department_name ? (
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs flex items-center gap-1"><FiUsers className="w-3 h-3" />{a.department_name}</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs">All users</span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{a.message}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>By {a.created_by_name || 'Admin'}</span>
                    <span>·</span>
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(a.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg ml-4">
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
