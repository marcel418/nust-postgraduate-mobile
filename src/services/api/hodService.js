// src/services/api/hodService.js
// Toggle USE_MOCK to false when backend APIs are ready

const USE_MOCK = true;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const mockSubmissions = [
  {
    id: 1,
    student: { id: 123456, name: 'Noel McBride', email: 'noel@student.nust.na', course: 'Bachelor of Computer Science: Honors' },
    supervisor: { name: 'Prof. Doe', role: 'Supervisor' },
    type: 'SOP',
    title: 'AI-Assisted Diagnostic Systems in Rural Namibian Clinics',
    document: 'Mini_Thesis_Draft_3.9.pdf',
    document_size: '32.9 MB',
    status: 'WITH_HOD',
    submitted_at: '2026-04-20T09:00:00Z',
    deadline: '2026-05-10T00:00:00Z',
    supervisor_note: {
      message: 'Your proposal shows strong improvement in methodology.\nConsider refining the data preprocessing section.',
      time_ago: '3 days ago',
    },
    evaluation: null,
  },
  {
    id: 2,
    student: { id: 123457, name: 'Anna Shikongo', email: 'anna@student.nust.na', course: 'Bachelor of Information Systems: Honors' },
    supervisor: { name: 'Dr. Frankenstein', role: 'Supervisor' },
    type: 'THESIS',
    title: 'Blockchain Applications in Land Registry Systems',
    document: 'Thesis_Draft_Final.pdf',
    document_size: '45.2 MB',
    status: 'UNDER_INTERNAL_EVAL',
    submitted_at: '2026-04-18T14:30:00Z',
    deadline: '2026-05-08T00:00:00Z',
    supervisor_note: {
      message: 'The literature review is comprehensive. Methodology needs more detail.',
      time_ago: '5 days ago',
    },
    evaluation: {
      checklist: [
        { label: 'Problem clarity', result: 'Good' },
        { label: 'Methodology', result: 'Satisfactory' },
        { label: 'Feasibility', result: 'Strong' },
      ],
      decision: 'Minor Revisions',
    },
  },
  {
    id: 3,
    student: { id: 123458, name: 'Selma Iipinge', email: 'selma@student.nust.na', course: 'Bachelor of Software Engineering: Honors' },
    supervisor: { name: 'Prof. Doe', role: 'Supervisor' },
    type: 'SOP',
    title: 'Mobile Fintech Adoption Among SMEs in Namibia',
    document: 'SoP_Final.pdf',
    document_size: '12.4 MB',
    status: 'APPROVED',
    submitted_at: '2026-04-10T11:00:00Z',
    deadline: '2026-04-30T00:00:00Z',
    supervisor_note: {
      message: 'Excellent proposal. Strongly recommend approval.',
      time_ago: '10 days ago',
    },
    evaluation: {
      checklist: [
        { label: 'Problem clarity', result: 'Excellent' },
        { label: 'Methodology', result: 'Strong' },
        { label: 'Feasibility', result: 'Strong' },
      ],
      decision: 'Approved',
    },
  },
];

const mockEvaluators = [
  { id: 301, name: 'Jane Smith', department: 'Computer Science' },
  { id: 302, name: 'Prof. Doe', department: 'Software Engineering' },
  { id: 303, name: 'Dr. Frankenstein', department: 'Information Systems' },
];

const mockExternalEvaluators = [
  { id: 401, name: 'Prof. Doe', institution: 'MIT', expertise: 'AI and Machine Learning', match: 92 },
  { id: 402, name: 'Dr. Frankenstein', institution: 'Namibia University of Science and Technology', expertise: 'Machine Learning, Energy Systems', match: 87 },
  { id: 403, name: 'Dr. Mortdecai Zhang Zu Wong', institution: 'Brown University', expertise: 'Neuroscience', match: 74 },
];

const mockNotifications = [
  { id: 1, message: 'Internal evaluator Dr. Nakashole has signed off on Selma Iipinge\'s SOP.', read: false, created_at: '2026-04-25T08:00:00Z' },
  { id: 2, message: 'New submission received from Supervisor Prof. Doe for Noel McBride.', read: false, created_at: '2026-04-20T09:05:00Z' },
  { id: 3, message: 'Anna Shikongo\'s thesis has been forwarded to FPGC-R.', read: true, created_at: '2026-04-18T14:35:00Z' },
];

const mockProfile = {
  name: 'Prof. Ndapewa Iyambo',
  email: 'hod@nust.na',
  role: 'Head of Department',
  department: 'Software Engineering',
  phone: '+264 61 207 2000',
};

export const hodService = {
  getSubmissions: async () => {
    if (USE_MOCK) { await delay(600); return mockSubmissions; }
    const { data } = await client.get('/hod/submissions');
    return data.data;
  },

  getSubmissionById: async (id) => {
    if (USE_MOCK) { await delay(300); return mockSubmissions.find((s) => s.id === id); }
    const { data } = await client.get(`/hod/submissions/${id}`);
    return data.data;
  },

  getEvaluators: async () => {
    if (USE_MOCK) { await delay(400); return mockEvaluators; }
    const { data } = await client.get('/hod/evaluators');
    return data.data;
  },

  getExternalEvaluators: async () => {
    if (USE_MOCK) { await delay(400); return mockExternalEvaluators; }
    const { data } = await client.get('/hod/external-evaluators');
    return data.data;
  },

  assignEvaluator: async (submissionId, evaluatorId, deadline) => {
    if (USE_MOCK) { await delay(800); return { success: true }; }
    const { data } = await client.post(`/hod/submissions/${submissionId}/assign-evaluator`, { evaluator_id: evaluatorId, deadline });
    return data;
  },

  submitDecision: async (submissionId, decision, notes) => {
    if (USE_MOCK) { await delay(800); return { success: true }; }
    const { data } = await client.post(`/hod/submissions/${submissionId}/decision`, { decision, notes });
    return data;
  },

  proposeExternalEvaluator: async (submissionId, evaluatorId) => {
    if (USE_MOCK) { await delay(800); return { success: true }; }
    const { data } = await client.post(`/hod/submissions/${submissionId}/propose-external`, { evaluator_id: evaluatorId });
    return data;
  },

  submitToFpgcR: async (submissionId) => {
    if (USE_MOCK) { await delay(800); return { success: true }; }
    const { data } = await client.post(`/hod/submissions/${submissionId}/forward-fpgcr`);
    return data;
  },

  getNotifications: async () => {
    if (USE_MOCK) { await delay(300); return mockNotifications; }
    const { data } = await client.get('/hod/notifications');
    return data.data;
  },

  getProfile: async () => {
    if (USE_MOCK) { await delay(300); return mockProfile; }
    const { data } = await client.get('/hod/profile');
    return data.data;
  },
};