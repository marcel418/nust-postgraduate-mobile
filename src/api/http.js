// src/api/http.js

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './baseUrl';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Correlation-ID'] =
    `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    const firstError =
      Array.isArray(data?.errors) && data.errors.length > 0
        ? data.errors[0]?.message
        : null;

    return Promise.reject({
      status,
      message:
        firstError ||
        data?.message ||
        error.message ||
        'Something went wrong.',
      errors: data?.errors || null,
      raw: data,
    });
  }
);