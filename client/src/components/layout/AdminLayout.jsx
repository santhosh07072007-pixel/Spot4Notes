import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiFileText, FiUsers, FiArrowLeft, FiMenu, FiX, FiShield, FiGrid, FiPieChart, FiLayers, FiMessageCircle, FiBell, FiLock, FiLogOut } from 'react-icons/fi';
import useAuthStore from '../../store/authStore';

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const links = [
    { to: '/admin', label: 'Dashboard', icon: FiBarChart2, end: true },
    { to: '/admin/materials', label: 'Materials', icon: FiFileText },
    { to: '/admin/users', label: 'Users', icon: FiUsers },
    { to: '/admin/scanner', label: 'Scanner', icon: FiShield },
    { to: '/admin/departments', label: 'Departments', icon: FiGrid },
    { to: '/admin/reports', label: 'Reports', icon: FiPieChart },
    { to: '/admin/content', label: 'Content Control', icon: FiLayers },
    { to: '/admin/chatbot', label: 'AI Assistant', icon: FiMessageCircle },
    { to: '/admin/announcements', label: 'Announcements', icon: FiBell },
    { to: '/admin/security', label: 'Security', icon: FiLock },
  ];

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
      isActive
        ? 'bg-white/10 text-white font-semibold'
        : 'text-indigo-200 hover:text-white hover:bg-white/5'
    }`;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-indigo-900 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-indigo-800">
          <span className="font-bold text-lg text-white">Admin Panel</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-indigo-300 hover:text-white">
            <FiX size={20} />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setSidebarOpen(false)}
              className={navItemClass}
            >
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-indigo-800 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-200 hover:text-white hover:bg-white/5 transition-all"
          >
            <FiArrowLeft size={18} />
            Back to App
          </Link>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-indigo-300 hover:text-red-300 hover:bg-white/5 transition-all w-full"
          >
            <FiLogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">
              <FiMenu size={20} className="text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900 hidden sm:block">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:block">{user?.name}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
