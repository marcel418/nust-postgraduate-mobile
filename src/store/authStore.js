// src/store/authStore.js

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

import { authApi } from '../api/authApi';

function unwrapApiData(response) {
  return response?.data ?? response;
}

function extractToken(response) {
  const data = unwrapApiData(response);

  return (
    data?.token ||
    data?.access_token ||
    data?.plainTextToken ||
    data?.auth_token ||
    response?.token ||
    response?.access_token ||
    null
  );
}

function extractProfile(response) {
  const data = unwrapApiData(response);

  const user = data?.user || data?.profile || data || null;

  return {
    user,
    roles: data?.roles || user?.roles || [],
    permissions: data?.permissions || user?.permissions || [],
  };
}

export const useAuthStore = create((set) => ({
  user: null,
  roles: [],
  permissions: [],
  token: null,
  loading: false,
  bootstrapping: true,
  error: null,

  bootstrap: async () => {
    set({ bootstrapping: true });

    try {
      const token = await SecureStore.getItemAsync('auth_token');

      if (!token) {
        set({
          token: null,
          user: null,
          roles: [],
          permissions: [],
          bootstrapping: false,
          error: null,
        });
        return;
      }

      const response = await authApi.me();
      const profile = extractProfile(response);

      set({
        token,
        user: profile.user,
        roles: profile.roles,
        permissions: profile.permissions,
        bootstrapping: false,
        error: null,
      });
    } catch (error) {
      await SecureStore.deleteItemAsync('auth_token');

      set({
        user: null,
        roles: [],
        permissions: [],
        token: null,
        bootstrapping: false,
        error: error?.message || 'Session expired. Please sign in again.',
      });
    }
  },

  login: async ({ email, password }) => {
    set({ loading: true, error: null });

    try {
      const loginResponse = await authApi.login({ email, password });
      const token = extractToken(loginResponse);

      if (!token) {
        throw new Error('Login succeeded, but no token was returned by the backend.');
      }

      await SecureStore.setItemAsync('auth_token', token);

      const meResponse = await authApi.me();
      const profile = extractProfile(meResponse);

      set({
        token,
        user: profile.user,
        roles: profile.roles,
        permissions: profile.permissions,
        loading: false,
        bootstrapping: false,
        error: null,
      });

      return true;
    } catch (error) {
      set({
        loading: false,
        bootstrapping: false,
        error: error?.message || 'Login failed.',
      });

      return false;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue local logout even if backend logout fails.
    }

    await SecureStore.deleteItemAsync('auth_token');

    set({
      user: null,
      roles: [],
      permissions: [],
      token: null,
      loading: false,
      bootstrapping: false,
      error: null,
    });
  },
}));