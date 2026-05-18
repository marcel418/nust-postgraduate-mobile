// src/api/documentsApi.js

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { api } from './http';
import { useAuthStore } from '../store/authStore';

function getAuthToken() {
  const state = useAuthStore.getState();

  return (
    state.token ||
    state.accessToken ||
    state.authToken ||
    state.session?.access_token ||
    null
  );
}

function getAbsoluteApiUrl(pathOrUrl) {
  if (!pathOrUrl) return null;

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const baseURL = api.defaults?.baseURL || '';

  // If baseURL is http://x.x.x.x:8080/api/v1 and backend returns /api/v1/...
  const apiRoot = baseURL.replace(/\/api\/v1\/?$/, '');

  if (pathOrUrl.startsWith('/api/v1')) {
    return `${apiRoot}${pathOrUrl}`;
  }

  return `${baseURL.replace(/\/$/, '')}/${String(pathOrUrl).replace(/^\//, '')}`;
}

function safeFileName(name = 'document') {
  return String(name)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
}

export const documentsApi = {
  getDownloadInfo: async (documentId) => {
    return api.get(`/documents/${documentId}/download-url`);
  },

  openDocument: async (documentId, fallbackFileName = 'document') => {
    if (!documentId) {
      throw new Error('Document ID is missing.');
    }

    const response = await documentsApi.getDownloadInfo(documentId);

    const document = response?.data?.document;
    const downloadUrl = response?.data?.download_url;

    if (!downloadUrl) {
      throw new Error('No download URL was returned by the server.');
    }

    const token = getAuthToken();

    if (!token) {
      throw new Error('You are not signed in. Please log in again.');
    }

    const absoluteUrl = getAbsoluteApiUrl(downloadUrl);

    if (!absoluteUrl) {
      throw new Error('Could not build the document download URL.');
    }

    const fileName = safeFileName(
      document?.original_filename || fallbackFileName || 'document'
    );

    const localUri = `${FileSystem.cacheDirectory}${fileName}`;

    const downloaded = await FileSystem.downloadAsync(absoluteUrl, localUri, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (downloaded.status < 200 || downloaded.status >= 300) {
      throw new Error(`Download failed with status ${downloaded.status}.`);
    }

    const canShare = await Sharing.isAvailableAsync();

    if (!canShare) {
      return downloaded.uri;
    }

    await Sharing.shareAsync(downloaded.uri, {
      mimeType: document?.mime_type || 'application/octet-stream',
      dialogTitle: document?.original_filename || 'Open document',
    });

    return downloaded.uri;
  },
};