// src/api/usersApi.js

import { api } from './http';

export const usersApi = {
  list: async (params = {}) => {
    return api.get('/users', { params });
  },

  listByRole: async (role) => {
    return api.get('/users', {
      params: {
        role,
      },
    });
  },
};