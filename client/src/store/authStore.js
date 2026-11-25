import { create } from 'zustand';
import { authAPI } from '../lib/api';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  loading: false,

  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token });
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await authAPI.login({ email, password });
      get().setAuth(data.user, data.token);
      return data;
    } finally {
      set({ loading: false });
    }
  },

  register: async (formData) => {
    set({ loading: true });
    try {
      const { data } = await authAPI.register(formData);
      // Only auto-login if user is verified (dev mode auto-verifies)
      if (data.user.is_verified) {
        get().setAuth(data.user, data.token);
      }
      return data;
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  fetchUser: async () => {
    try {
      const { data } = await authAPI.getMe();
      const token = localStorage.getItem('token');
      get().setAuth(data.user, token);
      return data.user;
    } catch {
      get().logout();
    }
  },

  updateProfile: async (profileData) => {
    const { data } = await authAPI.updateProfile(profileData);
    const token = localStorage.getItem('token');
    get().setAuth(data.user, token);
    return data.user;
  },

  isAdmin: () => get().user?.role === 'admin',
  isAuthenticated: () => !!get().token && !!get().user,
}));

export default useAuthStore;
