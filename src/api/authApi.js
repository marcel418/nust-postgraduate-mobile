// src/api/authApi.js

import { api } from './http';

export const authApi = {
  login: async ({ email, password }) => {
    return api.post('/auth/login', {
      email,
      password,
    });
  },

  logout: async () => {
    return api.post('/auth/logout');
  },

  me: async () => {
    return api.get('/auth/me');
  },
};