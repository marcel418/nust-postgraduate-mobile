// src/services/api/hodService.js
// All HOD API calls go through here.
// Toggle USE_MOCK to switch between mock data and real API.

import client from './client';
import { mockHoDData } from './mockData';

const USE_MOCK = true; // Set to false when backend is ready

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

export const hodService = {

  // GET /api/v1/hod/submissions
  getSubmissions: async () => {
    if (USE_MOCK) {
      await delay(600); // Simulate network
      return mockHoDData.submissions;
    }
    const { data } = await client.get('/hod/submissions');
    return data.data;
  },

  // GET /api/v1/hod/submissions/:id
  getSubmissionDetail: async (id) => {
    if (USE_MOCK) {
      await delay(400);
      return mockHoDData.submissions.find((s) => s.id === id);
    }
    const { data } = await client.get(`/hod/submissions/${id}`);
    return data.data;
  },

  // GET /api/v1/hod/evaluators
  getEvaluators: async () => {
    if (USE_MOCK) {
      await delay(400);
      return mockHoDData.evaluators;
    }
    const { data } = await client.get('/hod/evaluators');
    return data.data;
  },

  // POST /api/v1/hod/submissions/:id/assign-evaluator
  assignEvaluator: async (submissionId, evaluatorId, deadline) => {
    if (USE_MOCK) {
      await delay(800);
      return { success: true, message: 'Evaluator assigned successfully.' };
    }
    const { data } = await client.post(`/hod/submissions/${submissionId}/assign-evaluator`, {
      evaluator_id: evaluatorId,
      deadline,
    });
    return data;
  },

  // POST /api/v1/hod/submissions/:id/forward
  forwardToFpgcR: async (submissionId, notes, proposedExternalEvaluator) => {
    if (USE_MOCK) {
      await delay(800);
      return { success: true, message: 'Submission forwarded to FPGC-R.' };
    }
    const { data } = await client.post(`/hod/submissions/${submissionId}/forward`, {
      hod_notes: notes,
      proposed_external_evaluator: proposedExternalEvaluator,
    });
    return data;
  },

  // GET /api/v1/hod/notifications
  getNotifications: async () => {
    if (USE_MOCK) {
      await delay(300);
      return mockHoDData.notifications;
    }
    const { data } = await client.get('/hod/notifications');
    return data.data;
  },

  // GET /api/v1/hod/profile
  getProfile: async () => {
    if (USE_MOCK) {
      await delay(300);
      return mockHoDData.profile;
    }
    const { data } = await client.get('/hod/profile');
    return data.data;
  },

  // GET /api/v1/hod/calendar
  getDeadlines: async () => {
    if (USE_MOCK) {
      await delay(400);
      return mockHoDData.deadlines;
    }
    const { data } = await client.get('/hod/calendar');
    return data.data;
  },
};
