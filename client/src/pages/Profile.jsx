import { useState, useEffect } from 'react';
import { FiUser, FiMail, FiBookOpen, FiCalendar, FiSave, FiHash, FiLock, FiUpload, FiDownload, FiBookmark, FiAward, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { departmentsAPI, authAPI } from '../lib/api';

export default function Profile() {
  const { user, updateProfile, fetchUser } = useAuthStore();
  const [form, setForm] = useState({ name: '', department: '', year: '', roll_number: '' });
  const [departments, setDepartments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', department: user.department || '', year: user.year || '', roll_number: user.roll_number || '' });
    }
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments)).catch(() => {});
    authAPI.getStreak().then(({ data }) => setStreak(data)).catch(() => {});
    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (passwordForm.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setChangingPassword(true);
    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const stats = [
    { icon: FiUpload, label: 'Total Uploads', value: user?.total_uploads || 0, color: 'bg-blue-100 text-blue-600' },
    { icon: FiDownload, label: 'Total Downloads', value: user?.total_downloads || 0, color: 'bg-green-100 text-green-600' },
    { icon: FiBookmark, label: 'Saved Notes', value: user?.bookmarks_count || 0, color: 'bg-purple-100 text-purple-600' },
    { icon: FiActivity, label: 'Study Streak', value: `${streak?.current_streak || 0} days`, color: 'bg-orange-100 text-orange-600' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Profile</h1>

      {/* Profile Header Card */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-gray-900">{user?.name}</h2>
              {user?.badge && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  <FiAward size={12} /> {user.badge}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {user?.roll_number && <p className="text-xs text-gray-400 mt-0.5">Roll No: {user.roll_number}</p>}
            <span className={`badge mt-1 ${user?.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-primary-100 text-primary-700'}`}>
              {user?.role}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="text-center p-3 rounded-xl bg-gray-50">
              <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-1`}>
                <s.icon size={16} />
              </div>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Profile Card */}
      <div className="card p-6">
        <h3 className="font-bold text-gray-900 mb-4">Edit Profile</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field !pl-10" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
              <div className="relative">
                <FiHash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" value={form.roll_number} onChange={(e) => setForm({ ...form, roll_number: e.target.value })} className="input-field !pl-10" placeholder="e.g. 24AD119" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="email" value={user?.email || ''} disabled className="input-field !pl-10 bg-gray-50 text-gray-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <div className="relative">
                <FiBookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="input-field !pl-10 appearance-none">
                  <option value="">Select Department</option>
                  {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <div className="relative">
                <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <select value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="input-field !pl-10 appearance-none">
                  <option value="">Select Year</option>
                  <option value="1st">1st Year</option>
                  <option value="2nd">2nd Year</option>
                  <option value="3rd">3rd Year</option>
                  <option value="4th">4th Year</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
            <FiSave size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900">Change Password</h3>
          <button onClick={() => setShowPasswordSection(!showPasswordSection)} className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            {showPasswordSection ? 'Cancel' : 'Change'}
          </button>
        </div>
        {showPasswordSection && (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="input-field !pl-10" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="input-field !pl-10" required minLength={6} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="input-field !pl-10" required />
              </div>
            </div>
            <button type="submit" disabled={changingPassword} className="btn-primary w-full">
              {changingPassword ? 'Changing...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
