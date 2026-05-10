// src/services/hodApi.js
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
    documentSize: '32.9 MB',
    status: 'WITH_HOD',
    submittedAt: '2026-04-20T09:00:00Z',
    deadline: '2026-05-10T00:00:00Z',
    supervisorNote: {
      message: 'Your proposal shows strong improvement in methodology.\nConsider refining the data preprocessing section.',
      timeAgo: '3 days ago',
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
    documentSize: '45.2 MB',
    status: 'UNDER_INTERNAL_EVAL',
    submittedAt: '2026-04-18T14:30:00Z',
    deadline: '2026-05-08T00:00:00Z',
    supervisorNote: {
      message: 'Literature review is comprehensive. Methodology needs more detail.',
      timeAgo: '5 days ago',
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
    documentSize: '12.4 MB',
    status: 'APPROVED',
    submittedAt: '2026-04-10T11:00:00Z',
    deadline: '2026-04-30T00:00:00Z',
    supervisorNote: { message: 'Excellent proposal. Strongly recommend approval.', timeAgo: '10 days ago' },
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
  { id: 304, name: 'Jane Smith', department: 'Data Science' },
];

const mockExternalEvaluators = [
  { id: 401, name: 'Prof. Doe', institution: 'MIT', expertise: 'AI and Machine Learning', match: 92 },
  { id: 402, name: 'Dr. Frankenstein', institution: 'Namibia University of Science and Technology', expertise: 'Machine Learning, Energy Systems', match: 87 },
  { id: 403, name: 'Dr. Mortdecai Zhang Zu Wong', institution: 'Brown University', expertise: 'Neuroscience', match: 74 },
];

const mockNotifications = [
  { id: 1, message: 'Internal evaluator Dr. Nakashole signed off on Selma Iipinge\'s SOP.', read: false, createdAt: '2026-04-25T08:00:00Z' },
  { id: 2, message: 'New submission received from Prof. Doe for Noel McBride.', read: false, createdAt: '2026-04-20T09:05:00Z' },
  { id: 3, message: 'Anna Shikongo\'s thesis has been forwarded to FPGC-R.', read: true, createdAt: '2026-04-18T14:35:00Z' },
];

export const getHODSubmissions = async () => { if (USE_MOCK) { await delay(600); return mockSubmissions; } };
export const getHODEvaluators = async () => { if (USE_MOCK) { await delay(400); return mockEvaluators; } };
export const getHODExternalEvaluators = async () => { if (USE_MOCK) { await delay(400); return mockExternalEvaluators; } };
export const getHODNotifications = async () => { if (USE_MOCK) { await delay(300); return mockNotifications; } };
export const assignHODEvaluator = async (submissionId, evaluatorId, deadline) => { if (USE_MOCK) { await delay(800); return { success: true }; } };
export const submitHODDecision = async (submissionId, decision, notes) => { if (USE_MOCK) { await delay(800); return { success: true }; } };
export const proposeHODExternalEvaluator = async (submissionId, evaluatorId) => { if (USE_MOCK) { await delay(800); return { success: true }; } };
export const submitHODToFpgcR = async (submissionId) => { if (USE_MOCK) { await delay(800); return { success: true }; } };