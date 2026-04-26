import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import client from '../services/api/client';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  // Called on app launch — restore session if token exists
  restoreSession: async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      set({ token });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await client.post('/auth/login', { email, password });
      await SecureStore.setItemAsync('auth_token', data.token);
      set({ user: data.user, token: data.token, isLoading: false });
    } catch (err) {
      set({
        error: err.response?.data?.message || 'Login failed',
        isLoading: false,
      });
    }
  },

  logout: async () => {
    await client.post('/auth/logout').catch(() => {}); // best-effort
    await SecureStore.deleteItemAsync('auth_token');
    set({ user: null, token: null });
  },
}));

export default useAuthStore;
