import { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiGrid, FiSearch, FiUpload, FiMessageSquare, FiUser, FiLogOut, FiShield, FiBell, FiBookmark, FiAward, FiFile, FiZap, FiBarChart2 } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';
import { notificationsAPI } from '../../lib/api';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      notificationsAPI.getAll().then(({ data }) => {
        setUnreadCount((data.notifications || []).filter(n => !n.is_read).length);
      }).catch(() => { });
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: FiHome, end: true },
    { to: '/departments', label: 'Departments', icon: FiGrid },
    { to: '/materials', label: 'Browse', icon: FiSearch },
    { to: '/smart-search', label: 'Smart Search', icon: FiZap },
    { to: '/leaderboard', label: 'Leaderboard', icon: FiAward },
  ];

  const authLinks = [
    { to: '/upload', label: 'Upload', icon: FiUpload },
    { to: '/chatbot', label: 'AI Study', icon: FiMessageSquare },
    { to: '/saved', label: 'Saved', icon: FiBookmark },
    { to: '/my-uploads', label: 'My Uploads', icon: FiFile },
    { to: '/my-analytics', label: 'My Analytics', icon: FiBarChart2 },
  ];

  const sidebarLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
      : 'text-gray-600 hover:bg-rose-50 hover:text-rose-600'
    }`;

  return (
    <div className="min-h-screen bg-gray-50/50 flex">
      {/* ===== Mobile overlay ===== */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== LEFT SIDEBAR ===== */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-rose-100 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-rose-100 shrink-0">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
            <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">S4</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Spot4Notes</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden ml-auto p-1 rounded-lg hover:bg-gray-100">
            <FiX size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Menu</p>
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} onClick={() => setSidebarOpen(false)} className={sidebarLinkClass}>
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}

          {user && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">My Space</p>
              </div>
              {authLinks.map((link) => (
                <NavLink key={link.to} to={link.to} onClick={() => setSidebarOpen(false)} className={sidebarLinkClass}>
                  <link.icon size={18} />
                  {link.label}
                </NavLink>
              ))}
              <NavLink to="/notifications" onClick={() => setSidebarOpen(false)} className={sidebarLinkClass}>
                <FiBell size={18} />
                <span className="flex-1">Notifications</span>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </NavLink>
            </>
          )}

          {user?.role === 'admin' && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Admin</p>
              </div>
              <NavLink to="/admin" onClick={() => setSidebarOpen(false)} className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-amber-50 text-amber-600' : 'text-amber-500 hover:bg-amber-50'
                }`
              }>
                <FiShield size={18} />
                Admin Panel
              </NavLink>
            </>
          )}
        </nav>

        {/* Bottom User Section */}
        <div className="shrink-0 border-t border-rose-100 p-3">
          {user ? (
            <div className="flex items-center gap-3 p-2">
              <Link to="/profile" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-white font-semibold text-sm">{user.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </Link>
              <button onClick={handleLogout} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0" title="Log out">
                <FiLogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-2 p-1">
              <Link to="/login" onClick={() => setSidebarOpen(false)} className="block w-full text-center text-sm font-medium text-gray-700 border border-rose-200 rounded-xl py-2.5 hover:bg-rose-50 transition-colors">Login</Link>
              <Link to="/register" onClick={() => setSidebarOpen(false)} className="block w-full text-center text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl py-2.5 hover:opacity-90 transition-opacity shadow-sm">Sign Up</Link>
            </div>
          )}
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar (mobile toggle + search area) */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-rose-100 h-16 flex items-center px-4 sm:px-6 lg:px-8">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-gray-100 mr-3">
            <FiMenu size={22} className="text-gray-600" />
          </button>
          {/* Global Search */}
          <form onSubmit={(e) => { e.preventDefault(); if (headerSearch.trim()) { navigate(`/materials?search=${encodeURIComponent(headerSearch.trim())}`); setHeaderSearch(''); } }}
            className="hidden sm:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Search materials..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-rose-200 rounded-xl bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 focus:bg-white transition-colors"
              />
            </div>
          </form>
          <div className="flex-1 sm:hidden" />
          {user && (
            <div className="flex items-center gap-2">
              <Link to="/notifications" className="relative p-2 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                <FiBell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
                  <span className="text-white font-semibold text-xs">{user.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user.name?.split(' ')[0]}</span>
              </Link>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
