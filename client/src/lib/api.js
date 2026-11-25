import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 and 403 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  getStreak: () => api.get('/auth/streak'),
  getLeaderboard: () => api.get('/auth/leaderboard'),
  getExams: () => api.get('/auth/exams'),
  addExam: (data) => api.post('/auth/exams', data),
  deleteExam: (id) => api.delete(`/auth/exams/${id}`),
};

// Departments
export const departmentsAPI = {
  getAll: () => api.get('/departments'),
  getBySlug: (slug) => api.get(`/departments/${slug}`),
  getSubjects: (deptId) => api.get(`/departments/${deptId}/subjects`),
  addSubject: (deptId, data) => api.post(`/departments/${deptId}/subjects`, data),
};

// Materials
export const materialsAPI = {
  getAll: (params) => api.get('/materials', { params }),
  getById: (id) => api.get(`/materials/${id}`),
  upload: (formData) => api.post('/materials/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  download: (id) => api.post(`/materials/${id}/download`),
  getMyUploads: () => api.get('/materials/user/my-uploads'),
  delete: (id) => api.delete(`/materials/${id}`),
  bookmark: (id) => api.post(`/materials/${id}/bookmark`),
  rate: (id, rating) => api.post(`/materials/${id}/rate`, { rating }),
  getBookmarks: () => api.get('/materials/user/bookmarks'),
  getRelated: (id) => api.get(`/materials/${id}/related`),
  editMaterial: (id, data) => api.put(`/materials/${id}/edit`, data),
  // Comments
  getComments: (id) => api.get(`/materials/${id}/comments`),
  addComment: (id, content) => api.post(`/materials/${id}/comments`, { content }),
  deleteComment: (id, commentId) => api.delete(`/materials/${id}/comments/${commentId}`),
  // Likes
  toggleLike: (id) => api.post(`/materials/${id}/like`),
};

// Admin
export const adminAPI = {
  // Dashboard
  getAnalytics: () => api.get('/admin/analytics'),

  // Materials
  getMaterials: (params) => api.get('/admin/materials', { params }),
  approveMaterial: (id) => api.put(`/admin/materials/${id}/approve`),
  rejectMaterial: (id, reason) => api.put(`/admin/materials/${id}/reject`, { reason }),
  editMaterial: (id, data) => api.put(`/admin/materials/${id}/edit`, data),
  deleteMaterial: (id) => api.delete(`/admin/materials/${id}`),

  // Scanner
  getFlaggedMaterials: (params) => api.get('/admin/scanner/flagged', { params }),
  getScannerLogs: (params) => api.get('/admin/scanner/logs', { params }),
  overrideScanner: (id, action) => api.put(`/admin/scanner/${id}/override`, { action }),

  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  banUser: (id) => api.put(`/admin/users/${id}/ban`),
  unbanUser: (id) => api.put(`/admin/users/${id}/unban`),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  resetUserPassword: (id) => api.put(`/admin/users/${id}/reset-password`),
  assignBadge: (id, badge) => api.put(`/admin/users/${id}/badge`, { badge }),

  // Departments & Subjects
  createDepartment: (data) => api.post('/admin/departments', data),
  updateDepartment: (id, data) => api.put(`/admin/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/admin/departments/${id}`),
  getSubjects: (params) => api.get('/admin/subjects', { params }),
  createSubject: (data) => api.post('/admin/subjects', data),
  deleteSubject: (id) => api.delete(`/admin/subjects/${id}`),

  // Reports
  getUploadReport: (params) => api.get('/admin/reports/uploads', { params }),
  downloadCSV: (params) => api.get('/admin/reports/uploads', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
  getGrowthStats: () => api.get('/admin/reports/growth'),

  // Content Control
  getDuplicates: () => api.get('/admin/content/duplicates'),
  toggleDownloads: (id) => api.put(`/admin/content/${id}/toggle-downloads`),
  toggleLock: (id) => api.put(`/admin/content/${id}/toggle-lock`),
  bulkDelete: (ids) => api.post('/admin/content/bulk-delete', { ids }),

  // Chatbot
  getChatbotStats: () => api.get('/admin/chatbot/stats'),

  // Announcements
  getAnnouncements: () => api.get('/admin/announcements'),
  sendAnnouncement: (data) => api.post('/admin/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),

  // Security
  getActivityLogs: (params) => api.get('/admin/security/logs', { params }),
  getUploadHistory: (params) => api.get('/admin/security/upload-history', { params }),
  getDbStats: () => api.get('/admin/security/db-stats'),

  // Notifications
  getNotifications: () => api.get('/admin/notifications'),
};

// Chatbot
export const chatbotAPI = {
  chat: (data) => api.post('/chatbot/chat', data),
  getHistory: () => api.get('/chatbot/history'),
  getSession: (sessionId) => api.get(`/chatbot/session/${sessionId}`),
  generateQuiz: (data) => api.post('/chatbot/quiz', data),
  summarize: (data) => api.post('/chatbot/summarize', data),
  generateViva: (data) => api.post('/chatbot/viva', data),
};

// Notifications
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// AI Features
export const aiAPI = {
  // Quality Scoring
  scoreNote: (id) => api.post(`/ai/score/${id}`),
  getScore: (id) => api.get(`/ai/score/${id}`),

  // Auto Summary
  generateSummary: (id) => api.post(`/ai/summary/${id}`),
  getSummary: (id) => api.get(`/ai/summary/${id}`),

  // Question Generator
  generateQuestions: (id, options) => api.post(`/ai/questions/${id}`, options),
  getQuestions: (id) => api.get(`/ai/questions/${id}`),

  // Semantic Search
  semanticSearch: (params) => api.get('/ai/search', { params }),

  // Process All (score + summary + questions)
  processAll: (id) => api.post(`/ai/process/${id}`),

  // Duplicate Check
  checkDuplicate: (id) => api.post(`/ai/check-duplicate/${id}`),

  // Student Analytics
  getStudentStats: () => api.get('/ai/student-stats'),
};

export default api;
