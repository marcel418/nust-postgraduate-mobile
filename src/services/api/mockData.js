// src/services/api/mockData.js
// Fake API responses used while the backend is being built.
// When real APIs are ready, delete this file and update each service file.

export const mockHoDData = {

  // GET /api/v1/hod/submissions
  submissions: [
    {
      id: 1,
      student: { id: 101, name: 'Anna Shikongo', email: 'anna@student.nust.na' },
      supervisor: { id: 201, name: 'Dr. Petrus Hamutenya' },
      type: 'SOP', // SOP | THESIS
      title: 'AI-Assisted Diagnostic Systems in Rural Namibian Clinics',
      status: 'WITH_HOD',
      submitted_at: '2026-04-20T09:00:00Z',
      deadline: '2026-05-10T00:00:00Z',
      document_url: null,
    },
    {
      id: 2,
      student: { id: 102, name: 'Joseph Nghikembua', email: 'joseph@student.nust.na' },
      supervisor: { id: 202, name: 'Prof. Maria Amupolo' },
      type: 'THESIS',
      title: 'Blockchain Applications in Land Registry Systems',
      status: 'WITH_HOD',
      submitted_at: '2026-04-18T14:30:00Z',
      deadline: '2026-05-08T00:00:00Z',
      document_url: null,
    },
    {
      id: 3,
      student: { id: 103, name: 'Selma Iipinge', email: 'selma@student.nust.na' },
      supervisor: { id: 201, name: 'Dr. Petrus Hamutenya' },
      type: 'SOP',
      title: 'Mobile Fintech Adoption Among SMEs in Namibia',
      status: 'UNDER_INTERNAL_EVAL',
      submitted_at: '2026-04-10T11:00:00Z',
      deadline: '2026-04-30T00:00:00Z',
      document_url: null,
    },
  ],

  // GET /api/v1/hod/evaluators (internal evaluators available to assign)
  evaluators: [
    { id: 301, name: 'Dr. Fredrika Nakashole', department: 'Computer Science' },
    { id: 302, name: 'Dr. Samuel Amutenya', department: 'Software Engineering' },
    { id: 303, name: 'Prof. Hileni Mupetami', department: 'Information Systems' },
  ],

  // GET /api/v1/hod/notifications
  notifications: [
    {
      id: 1,
      message: 'Internal evaluator Dr. Nakashole has signed off on Selma Iipinge\'s SOP.',
      read: false,
      created_at: '2026-04-25T08:00:00Z',
    },
    {
      id: 2,
      message: 'New submission received from Supervisor Dr. Hamutenya for Anna Shikongo.',
      read: true,
      created_at: '2026-04-20T09:05:00Z',
    },
  ],

  // GET /api/v1/hod/profile
  profile: {
    id: 1,
    name: 'Prof. Ndapewa Iyambo',
    email: 'hod@nust.na',
    role: 'HOD',
    department: 'Software Engineering',
    phone: '+264 61 207 2000',
  },

  // GET /api/v1/hod/calendar
  deadlines: [
    {
      id: 1,
      submission_id: 1,
      student_name: 'Anna Shikongo',
      title: 'SOP Review Deadline',
      due_date: '2026-05-10T00:00:00Z',
      status: 'WITH_HOD',
    },
    {
      id: 2,
      submission_id: 2,
      student_name: 'Joseph Nghikembua',
      title: 'Thesis Review Deadline',
      due_date: '2026-05-08T00:00:00Z',
      status: 'WITH_HOD',
    },
  ],
};
export const CURRENT_ADMIN = {
  id: 'ADM001',
  name: 'System Administrator',
  email: 'admin@nust.na',
  role: 'System Admin',
};

export const ALL_USERS = [
  {
    id: 'STU001',
    name: 'Noel McBride',
    role: 'Student',
    email: 'noel@nust.na',
    status: 'Active',
    course: 'Bachelor of Computer Science: Honours',
  },
  {
    id: 'STU002',
    name: 'Martha Stewart',
    role: 'Student',
    email: 'martha@nust.na',
    status: 'Active',
    course: 'Bachelor of Cyber Security: Honours',
  },
  {
    id: 'STU003',
    name: 'Marcel Mabuta',
    role: 'Student',
    email: 'marcel@nust.na',
    status: 'Active',
    course: 'Bachelor of Information Systems: Honours',
  },
  {
    id: 'STU004',
    name: 'Abraham Namaseb',
    role: 'Student',
    email: 'abraham@nust.na',
    status: 'Inactive',
    course: 'Bachelor of Software Engineering: Honours',
  },
  {
    id: 'SUP001',
    name: 'Prof. Doe',
    role: 'Supervisor',
    email: 'doe@nust.na',
    status: 'Active',
    department: 'Computer Science',
  },
  {
    id: 'SUP002',
    name: 'Dr. Frankenstein',
    role: 'Supervisor',
    email: 'frank@nust.na',
    status: 'Active',
    department: 'HDC',
  },
];

export const SYSTEM_STATS = {
  totalStudents: 4,
  totalSupervisors: 2,
  totalSubmissions: 3,
  pendingReviews: 1,
  approved: 1,
  returned: 1,
};
