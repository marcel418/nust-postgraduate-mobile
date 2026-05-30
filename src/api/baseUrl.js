const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!rawApiUrl) {
  throw new Error('Missing EXPO_PUBLIC_API_URL in .env');
}

export const API_BASE_URL = `${rawApiUrl.replace(/\/$/, '')}/api/v1`;