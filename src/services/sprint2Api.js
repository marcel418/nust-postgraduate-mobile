// src/services/sprint2Api.js
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Internal Evaluator ───────────────────────────────────────────────────────
const mockAssignments = [
  {
    id: 1,
    student: { id: 123456, name: 'Noel McBride', course: 'Bachelor of Computer Science: Honors' },
    type: 'SOP',
    title: 'AI-Assisted Diagnostic Systems in Rural Namibian Clinics',
    document: 'Mini_Thesis_Final.pdf',
    documentSize: '32.9 MB',
    status: 'PENDING',
    deadline: '2026-05-15T00:00:00Z',
  },
  {
    id: 2,
    student: { id: 123457, name: 'Anna Shikongo', course: 'Bachelor of Information Systems: Honors' },
    type: 'SOP',
    title: 'Blockchain Applications in Land Registry Systems',
    document: 'Thesis_Draft.pdf',
    documentSize: '28.4 MB',
    status: 'IN_PROGRESS',
    deadline: '2026-05-20T00:00:00Z',
  },
  {
    id: 3,
    student: { id: 123458, name: 'Selma Iipinge', course: 'Bachelor of Software Engineering: Honors' },
    type: 'SOP',
    title: 'Mobile Fintech Adoption Among SMEs in Namibia',
    document: 'SoP_Final.pdf',
    documentSize: '12.4 MB',
    status: 'COMPLETED',
    deadline: '2026-04-30T00:00:00Z',
  },
];

export const getEvaluatorAssignments = async () => { await delay(600); return mockAssignments; };
export const submitEvaluation = async (id, data) => { await delay(800); return { success: true }; };

// ─── External Evaluator ───────────────────────────────────────────────────────
const mockExternalEvaluatorProfile = {
  name: 'Prof. Keshia Mbako',
  email: 'external.eval@example.com',
  role: 'External Evaluator',
  institution: 'University of Cape Town',
  expertise: 'Artificial Intelligence, Data Science, Digital Health',
  phone: '+264 81 555 2100',
  bankName: 'First National Bank',
  bankAccount: '62001234567',
  bankHolder: 'Keshia Mbako',
};

const mockExternalEvaluatorAssignments = [
  {
    id: 101,
    student: { id: 223401, name: 'Noel McBride', course: 'Bachelor of Computer Science: Honours' },
    supervisor: 'Prof. Doe',
    type: 'THESIS',
    title: 'AI-Assisted Diagnostic Systems in Rural Namibian Clinics',
    document: 'Mini_Thesis_Final.pdf',
    documentSize: '32.9 MB',
    status: 'PENDING',
    receivedAt: '2026-04-28T09:00:00Z',
    dueDate: '2026-05-14T00:00:00Z',
    assignmentNote: 'Review the thesis document, assign a score, and submit your recommendation.',
  },
  {
    id: 102,
    student: { id: 223402, name: 'Anna Shikongo', course: 'Bachelor of Information Systems: Honours' },
    supervisor: 'Dr. Frankenstein',
    type: 'THESIS',
    title: 'Blockchain Applications in Land Registry Systems',
    document: 'Thesis_Draft_Final.pdf',
    documentSize: '45.2 MB',
    status: 'IN_REVIEW',
    receivedAt: '2026-04-26T14:30:00Z',
    dueDate: '2026-05-18T00:00:00Z',
    assignmentNote: 'Draft evaluation already saved. Continue with grading and final recommendation.',
  },
  {
    id: 103,
    student: { id: 223403, name: 'Selma Iipinge', course: 'Bachelor of Software Engineering: Honours' },
    supervisor: 'Prof. Doe',
    type: 'THESIS',
    title: 'Mobile Fintech Adoption Among SMEs in Namibia',
    document: 'SoP_Final.pdf',
    documentSize: '12.4 MB',
    status: 'COMPLETED',
    receivedAt: '2026-04-15T11:00:00Z',
    dueDate: '2026-04-30T00:00:00Z',
    assignmentNote: 'Final evaluation and claim already submitted.',
    grade: 82,
    recommendation: 'Approved',
  },
];

const mockExternalClaims = [
  {
    id: 201,
    thesisTitle: 'AI-Assisted Diagnostic Systems in Rural Namibian Clinics',
    amount: 'N$ 4,500',
    status: 'Pending Verification',
    submittedAt: '2026-05-01T09:20:00Z',
  },
  {
    id: 202,
    thesisTitle: 'Mobile Fintech Adoption Among SMEs in Namibia',
    amount: 'N$ 4,500',
    status: 'Paid',
    submittedAt: '2026-04-20T13:00:00Z',
  },
];

const mockExternalNotifications = [
  { id: 1, message: 'HOD forwarded Noel McBride\'s thesis for external evaluation.', read: false, createdAt: '2026-04-28T09:05:00Z' },
  { id: 2, message: 'Your evaluation for Selma Iipinge has been received by the HOD and supervisor.', read: true, createdAt: '2026-04-30T16:10:00Z' },
  { id: 3, message: 'Honorarium claim for your completed evaluation is pending verification.', read: false, createdAt: '2026-05-01T09:30:00Z' },
];

export const getExternalEvaluatorDashboard = async () => {
  await delay(500);
  return {
    assigned: mockExternalEvaluatorAssignments.length,
    pending: mockExternalEvaluatorAssignments.filter((item) => item.status !== 'COMPLETED').length,
    claims: mockExternalClaims.length,
    completed: mockExternalEvaluatorAssignments.filter((item) => item.status === 'COMPLETED').length,
  };
};

export const getExternalEvaluatorAssignments = async () => { await delay(600); return mockExternalEvaluatorAssignments; };
export const getExternalEvaluatorAssignmentById = async (id) => { await delay(300); return mockExternalEvaluatorAssignments.find((item) => item.id === id); };
export const submitExternalEvaluation = async (id, data) => { await delay(900); return { success: true, id, data }; };
export const submitHonorariumClaim = async (data) => { await delay(800); return { success: true, data }; };
export const getExternalEvaluatorClaims = async () => { await delay(500); return mockExternalClaims; };
export const getExternalEvaluatorProfile = async () => { await delay(400); return mockExternalEvaluatorProfile; };
export const updateExternalEvaluatorProfile = async (data) => { await delay(700); return { success: true, profile: { ...mockExternalEvaluatorProfile, ...data } }; };
export const getExternalEvaluatorNotifications = async () => { await delay(400); return mockExternalNotifications; };

// ─── FPGC-R ───────────────────────────────────────────────────────────────────
const mockFpgcrSubmissions = [
  {
    id: 1,
    student: { id: 123456, name: 'Noel McBride', course: 'Bachelor of Computer Science: Honors' },
    type: 'SOP',
    title: 'AI-Assisted Diagnostic Systems in Rural Namibian Clinics',
    document: 'Mini_Thesis_Final.pdf',
    documentSize: '32.9 MB',
    hodNotes: 'Strong proposal, recommend approval.',
    proposedExternal: 'Prof. Doe (MIT)',
    status: 'WITH_FPGC_R',
    receivedAt: '2026-04-28T09:00:00Z',
  },
  {
    id: 2,
    student: { id: 123457, name: 'Anna Shikongo', course: 'Bachelor of Information Systems: Honors' },
    type: 'THESIS',
    title: 'Blockchain Applications in Land Registry Systems',
    document: 'Thesis_Draft_Final.pdf',
    documentSize: '45.2 MB',
    hodNotes: 'Minor revisions recommended.',
    proposedExternal: 'Dr. Frankenstein (NUST)',
    status: 'WITH_FPGC_R',
    receivedAt: '2026-04-26T14:30:00Z',
  },
  {
    id: 3,
    student: { id: 123458, name: 'Selma Iipinge', course: 'Bachelor of Software Engineering: Honors' },
    type: 'SOP',
    title: 'Mobile Fintech Adoption Among SMEs in Namibia',
    document: 'SoP_Final.pdf',
    documentSize: '12.4 MB',
    hodNotes: 'Excellent proposal.',
    proposedExternal: 'Prof. Mupetami (NUST)',
    status: 'APPROVED',
    receivedAt: '2026-04-15T11:00:00Z',
  },
];

export const getFpgcrSubmissions = async () => { await delay(600); return mockFpgcrSubmissions; };
export const submitHdcDecision = async (id, decision, comments) => { await delay(800); return { success: true }; };
export const notifyParties = async (id) => { await delay(600); return { success: true }; };

// ─── FPGC ─────────────────────────────────────────────────────────────────────
const mockApplications = [
  {
    id: 1,
    student: { id: 123459, name: 'Emily Carter', course: 'BEng Electrical Engineering' },
    title: 'Optimisation of Hybrid Solar-Wind Systems in Rural Namibia',
    status: 'SUBMITTED',
    supervisor: null,
    appliedAt: '2026-04-01T09:00:00Z',
  },
  {
    id: 2,
    student: { id: 123460, name: 'James Hamutenya', course: 'BSc Computer Science' },
    title: 'Deep Learning for Agricultural Disease Detection',
    status: 'ACCEPTED',
    supervisor: { name: 'Prof. Doe' },
    appliedAt: '2026-03-28T10:00:00Z',
  },
  {
    id: 3,
    student: { id: 123461, name: 'Martha Stewart', course: 'BSc Cyber Security' },
    title: 'Zero-Trust Architecture for Government Systems',
    status: 'SUBMITTED',
    supervisor: null,
    appliedAt: '2026-04-05T08:00:00Z',
  },
];

const mockExternalProposals = [
  {
    id: 1,
    student: { name: 'Emily Carter', course: 'BEng Electrical Engineering' },
    title: 'Optimisation of Hybrid Solar-Wind Systems in Rural Namibia',
    proposedBy: 'HOD - Prof. Iyambo',
    evaluators: [
      { id: 401, name: 'Prof. Doe', institution: 'MIT', expertise: 'AI and Machine Learning', match: 92 },
      { id: 402, name: 'Dr. Frankenstein', institution: 'NUST', expertise: 'Machine Learning, Energy Systems', match: 87 },
    ],
  },
];

export const getFpgcApplications = async () => { await delay(600); return mockApplications; };
export const getFpgcExternalProposals = async () => { await delay(600); return mockExternalProposals; };
export const assignFpgcSupervisor = async (appId, supervisorId) => { await delay(800); return { success: true }; };
export const approveFpgcExternalEvaluator = async (proposalId, evaluatorId) => { await delay(800); return { success: true }; };