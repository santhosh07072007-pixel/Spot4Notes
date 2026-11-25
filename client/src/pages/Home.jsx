import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiUpload, FiBookOpen, FiMessageSquare, FiArrowRight, FiShield, FiUsers, FiCalendar, FiTrendingUp, FiTrash2, FiAward, FiFile } from 'react-icons/fi';
import useAuthStore from '../store/authStore';
import { departmentsAPI, materialsAPI, authAPI } from '../lib/api';

export default function Home() {
  const { user } = useAuthStore();
  const [departments, setDepartments] = useState([]);
  const [recentMaterials, setRecentMaterials] = useState([]);
  const [popularMaterials, setPopularMaterials] = useState([]);
  const [streak, setStreak] = useState(null);
  const [exams, setExams] = useState([]);
  const [newExam, setNewExam] = useState({ name: '', date: '' });

  useEffect(() => {
    departmentsAPI.getAll().then(({ data }) => setDepartments(data.departments)).catch(() => {});
    materialsAPI.getAll({ limit: 6, sort: 'newest' }).then(({ data }) => setRecentMaterials(data.materials)).catch(() => {});
    materialsAPI.getAll({ limit: 6, sort: 'popular' }).then(({ data }) => setPopularMaterials(data.materials)).catch(() => {});
    if (user) {
      authAPI.getStreak().then(({ data }) => setStreak(data)).catch(() => {});
      authAPI.getExams().then(({ data }) => setExams(data.exams || [])).catch(() => {});
    }
  }, [user]);

  const handleAddExam = async (e) => {
    e.preventDefault();
    if (!newExam.name || !newExam.date) return;
    try {
      const { data } = await authAPI.addExam(newExam);
      setExams((prev) => [...prev, data.exam].sort((a, b) => new Date(a.date) - new Date(b.date)));
      setNewExam({ name: '', date: '' });
    } catch {}
  };

  const handleDeleteExam = async (id) => {
    try {
      await authAPI.deleteExam(id);
      setExams((prev) => prev.filter((e) => e.id !== id));
    } catch {}
  };

  const categoryLabels = {
    notes: 'Notes', question_papers: 'Question Papers', ppt: 'PPTs',
    important_questions: 'Important Questions', study_materials: 'Study Materials',
  };

  const categoryColors = {
    notes: 'bg-rose-100 text-rose-700',
    question_papers: 'bg-amber-100 text-amber-700',
    ppt: 'bg-purple-100 text-purple-700',
    important_questions: 'bg-red-100 text-red-700',
    study_materials: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      {user ? (
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-6 text-white shadow-sm">
          <h1 className="text-2xl font-bold">Welcome back, {user.name?.split(' ')[0]}! 👋</h1>
          <p className="text-rose-100 mt-1">Ready to study? Check out the latest materials or upload your own notes.</p>
          <div className="flex gap-3 mt-4">
            <Link to="/materials" className="px-4 py-2 bg-white text-rose-600 text-sm font-semibold rounded-lg hover:bg-rose-50 transition-colors">
              Browse Materials
            </Link>
            <Link to="/upload" className="px-4 py-2 bg-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/30 transition-colors">
              Upload Notes
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-8 text-white text-center shadow-sm">
          <h1 className="text-3xl font-bold">Welcome to Spot4Notes</h1>
          <p className="text-rose-100 mt-2 max-w-lg mx-auto">
            Your college's one-stop platform for sharing and discovering study materials.
          </p>
          <div className="flex gap-3 mt-5 justify-center">
            <Link to="/register" className="px-6 py-2.5 bg-white text-rose-600 text-sm font-semibold rounded-lg hover:bg-rose-50 transition-colors">
              Get Started
            </Link>
            <Link to="/materials" className="px-6 py-2.5 bg-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/30 transition-colors">
              Browse Materials
            </Link>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center">
              <FiFile className="text-rose-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{recentMaterials.length || '-'}</p>
              <p className="text-xs text-gray-500">Materials</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 hover:-translate-y-1 transition-all duration-200 cursor-default">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center">
              <FiBookOpen className="text-pink-500" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{departments.length || '-'}</p>
              <p className="text-xs text-gray-500">Departments</p>
            </div>
          </div>
        </div>
        {user && (
          <>
            <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 hover:-translate-y-1 transition-all duration-200 cursor-default">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <FiTrendingUp className="text-amber-500" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{streak?.current_streak || 0}</p>
                  <p className="text-xs text-gray-500">Day Streak</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 hover:-translate-y-1 transition-all duration-200 cursor-default">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <FiCalendar className="text-red-500" size={20} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
                  <p className="text-xs text-gray-500">Upcoming Exams</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Quick Actions & Streak & Exam Countdown */}
      {user && (
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 transition-all duration-200">
            <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/upload" className="p-4 rounded-xl bg-rose-50 text-center hover:bg-rose-100 transition-colors">
                <FiUpload className="mx-auto mb-2 text-rose-500" size={22} />
                <span className="text-sm font-medium text-rose-600">Upload</span>
              </Link>
              <Link to="/chatbot" className="p-4 rounded-xl bg-purple-50 text-center hover:bg-purple-100 transition-colors">
                <FiMessageSquare className="mx-auto mb-2 text-purple-500" size={22} />
                <span className="text-sm font-medium text-purple-600">AI Chat</span>
              </Link>
              <Link to="/saved" className="p-4 rounded-xl bg-amber-50 text-center hover:bg-amber-100 transition-colors">
                <FiBookOpen className="mx-auto mb-2 text-amber-500" size={22} />
                <span className="text-sm font-medium text-amber-600">Saved</span>
              </Link>
              <Link to="/leaderboard" className="p-4 rounded-xl bg-pink-50 text-center hover:bg-pink-100 transition-colors">
                <FiAward className="mx-auto mb-2 text-pink-500" size={22} />
                <span className="text-sm font-medium text-pink-600">Rankings</span>
              </Link>
            </div>
          </div>

          {/* Study Streak */}
          <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 transition-all duration-200">
            <h2 className="font-semibold text-gray-900 mb-4">Study Streak</h2>
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 flex items-center justify-center flex-shrink-0">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#fce7f3" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#f43f5e" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${Math.min(((streak?.current_streak || 0) / Math.max(streak?.longest_streak || 7, 7)) * 264, 264)} 264`}
                  />
                </svg>
                <span className="absolute text-xl font-bold text-gray-900">{streak?.current_streak || 0}</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current streak</p>
                <p className="text-xs text-gray-400 mt-1">Best: {streak?.longest_streak || 0} days</p>
                <div className="flex gap-1 mt-3">
                  {(streak?.recent_activity || []).slice(-7).map((d, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full ${d.actions > 0 ? 'bg-rose-400' : 'bg-gray-200'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Exam Countdown */}
          <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 transition-all duration-200">
            <h2 className="font-semibold text-gray-900 mb-4">Exam Countdown</h2>
            {exams.length > 0 ? (
              <div className="space-y-2 max-h-24 overflow-y-auto mb-3">
                {exams.map((ex) => {
                  const days = Math.max(0, Math.ceil((new Date(ex.date) - new Date()) / 86400000));
                  return (
                    <div key={ex.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate flex-1">{ex.name}</span>
                      <span className={`text-sm font-bold ml-3 ${days <= 3 ? 'text-red-500' : days <= 7 ? 'text-amber-500' : 'text-gray-500'}`}>
                        {days}d
                      </span>
                      <button onClick={() => handleDeleteExam(ex.id)} className="ml-2 text-gray-300 hover:text-red-500 transition-colors">
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-3">No upcoming exams</p>
            )}
            <form onSubmit={handleAddExam} className="flex gap-2 mt-auto">
              <input type="text" placeholder="Exam name" value={newExam.name}
                onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-rose-200 outline-none focus:border-rose-400 transition-colors" />
              <input type="date" value={newExam.date}
                onChange={(e) => setNewExam({ ...newExam, date: e.target.value })}
                className="text-xs px-2 py-2 rounded-lg border border-rose-200 outline-none focus:border-rose-400 transition-colors w-28" />
              <button type="submit" className="px-3 py-2 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-colors">+</button>
            </form>
          </div>
        </div>
      )}

      {/* Departments */}
      <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Departments</h2>
          <Link to="/departments" className="text-rose-500 text-sm font-medium hover:text-rose-600">View all →</Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.slice(0, 6).map((dept) => (
            <Link key={dept.id} to={`/departments/${dept.slug}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-50/50 hover:border-rose-300 hover:shadow-sm transition-all duration-200 border border-gray-300 group">
              <span className="text-2xl w-10 text-center">{dept.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-rose-500 transition-colors truncate">{dept.name}</p>
              </div>
              <FiArrowRight size={14} className="text-gray-300 group-hover:text-rose-400 transition-colors flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Materials */}
      <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Uploads</h2>
          <Link to="/materials" className="text-rose-500 text-sm font-medium hover:text-rose-600">View all →</Link>
        </div>
        {recentMaterials.length > 0 ? (
          <div className="space-y-2">
            {recentMaterials.slice(0, 5).map((mat) => (
              <Link key={mat.id} to={`/materials/${mat.id}`} className="flex items-center gap-4 p-3 rounded-xl hover:bg-rose-50/50 transition-colors group">
                <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiFile size={18} className="text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-rose-500 transition-colors">{mat.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{mat.department_name} {mat.subject_name ? `· ${mat.subject_name}` : ''}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[mat.category] || 'bg-gray-100 text-gray-600'}`}>
                  {categoryLabels[mat.category] || mat.category}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No materials yet</p>
        )}
      </div>

      {/* Popular Materials */}
      {popularMaterials.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">🔥 Popular Materials</h2>
            <Link to="/materials?sort=popular" className="text-rose-500 text-sm font-medium hover:text-rose-600">View all →</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularMaterials.map((mat) => (
              <Link key={mat.id} to={`/materials/${mat.id}`} className="p-4 rounded-xl border border-rose-300 hover:border-rose-400 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group">
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${categoryColors[mat.category] || 'bg-gray-100 text-gray-600'}`}>
                    {categoryLabels[mat.category] || mat.category}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-rose-500 transition-colors">{mat.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{mat.department_name}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{mat.download_count} downloads</span>
                  <span>{mat.view_count} views</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Features Section (non-logged-in) */}
      {!user && (
        <div className="bg-white rounded-2xl p-6 border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 transition-all duration-200">
          <h2 className="font-semibold text-gray-900 mb-1">Why Spot4Notes?</h2>
          <p className="text-sm text-gray-400 mb-5">Everything you need for academic success</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: FiBookOpen, title: 'Department Resources', desc: 'Materials organized by department & subject', color: 'text-rose-500', bg: 'bg-rose-50' },
              { icon: FiShield, title: 'Content Scanner', desc: 'Auto-scan for inappropriate content', color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { icon: FiSearch, title: 'Smart Search', desc: 'Find by keyword, tag, or department', color: 'text-purple-500', bg: 'bg-purple-50' },
              { icon: FiMessageSquare, title: 'AI Chatbot', desc: 'Quizzes, summaries & instant answers', color: 'text-amber-500', bg: 'bg-amber-50' },
              { icon: FiUpload, title: 'Easy Uploads', desc: 'PDF, PPT, DOCX & images supported', color: 'text-pink-500', bg: 'bg-pink-50' },
              { icon: FiUsers, title: 'College Only', desc: 'Verified college email required', color: 'text-cyan-500', bg: 'bg-cyan-50' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl hover:bg-rose-50/30 transition-colors">
                <div className={`w-10 h-10 ${f.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <f.icon size={18} className={f.color} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {!user && (
        <div className="bg-white rounded-2xl p-8 text-center border border-rose-300 shadow-sm hover:shadow-md hover:border-rose-400 transition-all duration-200">
          <h2 className="text-xl font-bold text-gray-900">Ready to contribute?</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-lg mx-auto">
            Join your college community on Spot4Notes. Share notes, access study materials, and ace your exams.
          </p>
          <Link to="/register" className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-sm">
            Create Account <FiArrowRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
