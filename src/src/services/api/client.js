import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Base URL switches based on environment variable
const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const client = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15000,
});

// Attach Bearer token to every request automatically
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (token expired) globally
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('auth_token');
      // Navigation to login handled by auth store listener
    }
    return Promise.reject(error);
  }
);

export default client;
