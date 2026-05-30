import {
    CURRENT_STUDENT,
    CURRENT_SUPERVISOR,
    FEEDBACK,
    MILESTONES,
    NOTIFICATIONS,
    STUDENTS,
    SUBMISSIONS,
    TASKS,
    ALL_USERS,
    SYSTEM_STATS,
} from '../data/mockData';
import { API_BASE_URL } from '../api/baseUrl';

// CONFIG
// When API team provide the URL,
// put it here and flip USE_MOCK to false
const USE_MOCK = true;
const BASE_URL = API_BASE_URL;

// This simulates a real network delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// HTTP HELPER
// When USE_MOCK is false, this is what actually calls the API

const http = async (endpoint, options = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      // TODO: add auth token here
      // 'Authorization': `Bearer ${token}`
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
};

// STUDENT SERVICES

export const getStudentProfile = async (studentId) => {
  if (USE_MOCK) {
    await delay(500);
    return CURRENT_STUDENT;
  }
  // TODO: GET /students/:studentId
  return http(`/students/${studentId}`);
};

export const getStudentSubmissions = async (studentId) => {
  if (USE_MOCK) {
    await delay(600);
    return SUBMISSIONS.filter((s) => s.studentId === studentId);
  }
  // TODO: GET /students/:studentId/submissions
  return http(`/students/${studentId}/submissions`);
};

export const submitProgressReport = async (studentId, reportData) => {
  if (USE_MOCK) {
    await delay(800);
    // Simulate creating a new submission and returning it
    const newSubmission = {
      id: `SUB00${SUBMISSIONS.length + 1}`,
      studentId,
      ...reportData,
      status: 'In Review',
      submittedAt: new Date().toISOString(),
      supervisorComments: null,
      signed: false,
    };
    // In real app this would be saved to DB
    // Here we just return it so the screen can update
    return newSubmission;
  }
  // TODO: POST /submissions  (multipart/form-data for file upload)
  return http('/submissions', {
    method: 'POST',
    body: JSON.stringify({ studentId, ...reportData }),
  });
};

export const getStudentFeedback = async (studentId) => {
  if (USE_MOCK) {
    await delay(500);
    return FEEDBACK.filter((f) => f.studentId === studentId);
  }
  // TODO: GET /students/:studentId/feedback
  return http(`/students/${studentId}/feedback`);
};

export const getStudentMilestones = async (studentId) => {
  if (USE_MOCK) {
    await delay(400);
    return MILESTONES.filter((m) => m.studentId === studentId);
  }
  // TODO: GET /students/:studentId/milestones
  return http(`/students/${studentId}/milestones`);
};

export const getStudentTasks = async (studentId) => {
  if (USE_MOCK) {
    await delay(400);
    return TASKS.filter((t) => t.studentId === studentId);
  }
  // TODO: GET /students/:studentId/tasks
  return http(`/students/${studentId}/tasks`);
};

// SUPERVISOR SERVICES

export const getSupervisorProfile = async (supervisorId) => {
  if (USE_MOCK) {
    await delay(400);
    return CURRENT_SUPERVISOR;
  }
  // TODO: GET /supervisors/:supervisorId
  return http(`/supervisors/${supervisorId}`);
};

export const getSupervisorStudents = async (supervisorId) => {
  if (USE_MOCK) {
    await delay(600);
    return STUDENTS.filter((s) => s.supervisorId === supervisorId);
  }
  // TODO: GET /supervisors/:supervisorId/students
  return http(`/supervisors/${supervisorId}/students`);
};

export const getSubmissionById = async (submissionId) => {
  if (USE_MOCK) {
    await delay(500);
    return SUBMISSIONS.find((s) => s.id === submissionId);
  }
  // TODO: GET /submissions/:submissionId
  return http(`/submissions/${submissionId}`);
};

export const getPendingSubmissions = async (supervisorId) => {
  if (USE_MOCK) {
    await delay(600);
    // Get all students under this supervisor
    const supervisorStudentIds = STUDENTS
      .filter((s) => s.supervisorId === supervisorId)
      .map((s) => s.id);
    // Return their pending/in-review submissions
    return SUBMISSIONS.filter(
      (s) =>
        supervisorStudentIds.includes(s.studentId) &&
        s.status === 'In Review'
    );
  }
  // TODO: GET /supervisors/:supervisorId/pending-submissions
  return http(`/supervisors/${supervisorId}/pending-submissions`);
};

export const reviewSubmission = async (submissionId, reviewData) => {
  // reviewData = { status: 'Approved' | 'Returned', comments: string, signed: bool }
  if (USE_MOCK) {
    await delay(700);
    return {
      submissionId,
      ...reviewData,
      reviewedAt: new Date().toISOString(),
    };
  }
  // TODO: PATCH /submissions/:submissionId
  return http(`/submissions/${submissionId}`, {
    method: 'PATCH',
    body: JSON.stringify(reviewData),
  });
};

// SHARED SERVICES

export const getNotifications = async (userId) => {
  if (USE_MOCK) {
    await delay(300);
    return NOTIFICATIONS.filter((n) => n.userId === userId);
  }
  // TODO: GET /users/:userId/notifications
  return http(`/users/${userId}/notifications`);
};


// ADMIN SERVICES
export const getSystemStats = async () => {
  if (USE_MOCK) {
    await delay(500);
    return SYSTEM_STATS;
  }
  // TODO: GET /admin/stats
  return http('/admin/stats');
};

export const getAllUsers = async () => {
  if (USE_MOCK) {
    await delay(600);
    return ALL_USERS;
  }
  // TODO: GET /admin/users
  return http('/admin/users');
};

export const toggleUserStatus = async (userId, status) => {
  if (USE_MOCK) {
    await delay(500);
    return { userId, status };
  }
  // TODO: PATCH /admin/users/:userId
  return http(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
};

export const getAllSubmissions = async () => {
  if (USE_MOCK) {
    await delay(600);
    return SUBMISSIONS;
  }
  // TODO: GET /admin/submissions
  return http('/admin/submissions');
};