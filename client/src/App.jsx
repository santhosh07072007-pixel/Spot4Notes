import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Layouts
import MainLayout from './components/layout/MainLayout';
import AdminLayout from './components/layout/AdminLayout';

// Pages
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Departments from './pages/Departments';
import DepartmentDetail from './pages/DepartmentDetail';
import Materials from './pages/Materials';
import MaterialDetail from './pages/MaterialDetail';
import Upload from './pages/Upload';
import MyUploads from './pages/MyUploads';
import Profile from './pages/Profile';
import Chatbot from './pages/Chatbot';
import SavedNotes from './pages/SavedNotes';
import Notifications from './pages/Notifications';
import Leaderboard from './pages/Leaderboard';
import AIFeatures from './pages/AIFeatures';
import SmartSearch from './pages/SmartSearch';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminMaterials from './pages/admin/AdminMaterials';
import AdminUsers from './pages/admin/AdminUsers';
import AdminScanner from './pages/admin/AdminScanner';
import AdminDepartments from './pages/admin/AdminDepartments';
import AdminReports from './pages/admin/AdminReports';
import AdminContentControl from './pages/admin/AdminContentControl';
import AdminChatbot from './pages/admin/AdminChatbot';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminSecurity from './pages/admin/AdminSecurity';
import NotFound from './pages/NotFound';

function ProtectedRoute({ children }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

function AdminMaterialRedirect() {
  const { id } = useParams();
  return <Navigate to={`/materials/${id}`} replace />;
}

function GuestRoute({ children }) {
  const { token, user } = useAuthStore();
  if (token && user) return <Navigate to="/" replace />;
  return children;
}

function HomeOrLanding() {
  const { token, user } = useAuthStore();
  if (!token || !user) return <Navigate to="/landing" replace />;
  return <Home />;
}

export default function App() {
  return (
    <Routes>
      {/* Landing page for guests */}
      <Route path="/landing" element={<GuestRoute><Landing /></GuestRoute>} />

      {/* Auth routes */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Main app routes */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomeOrLanding />} />
        <Route path="departments" element={<Departments />} />
        <Route path="departments/:slug" element={<DepartmentDetail />} />
        <Route path="materials" element={<Materials />} />
        <Route path="materials/:id" element={<MaterialDetail />} />
        <Route path="upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
        <Route path="my-uploads" element={<ProtectedRoute><MyUploads /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="chatbot" element={<ProtectedRoute><Chatbot /></ProtectedRoute>} />
        <Route path="saved" element={<ProtectedRoute><SavedNotes /></ProtectedRoute>} />
        <Route path="notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="materials/:id/ai" element={<ProtectedRoute><AIFeatures /></ProtectedRoute>} />
        <Route path="smart-search" element={<SmartSearch />} />
        <Route path="my-analytics" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="materials" element={<AdminMaterials />} />
        <Route path="materials/:id" element={<AdminMaterialRedirect />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="scanner" element={<AdminScanner />} />
        <Route path="departments" element={<AdminDepartments />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="content" element={<AdminContentControl />} />
        <Route path="chatbot" element={<AdminChatbot />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="security" element={<AdminSecurity />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
