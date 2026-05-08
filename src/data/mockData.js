// This is the single source of truth for all fake data

export const CURRENT_STUDENT = {
  id: 'STU001',
  name: 'Noel McBride',
  studentNumber: '123456',
  course: 'Bachelor of Computer Science: Honours',
  supervisorId: 'SUP001',
  progressPercentage: 50,
  proposalStage: 'In Review',
};

export const CURRENT_SUPERVISOR = {
  id: 'SUP001',
  name: 'Prof. Doe',
  title: 'Professor',
  department: 'Computer Science',
};

export const STUDENTS = [
  {
    id: 'STU001',
    name: 'Noel McBride',
    studentNumber: '123456',
    course: 'Bachelor of Computer Science: Honours',
    progressPercentage: 90,
    status: 'In Progress',
    supervisorId: 'SUP001',
  },
  {
    id: 'STU002',
    name: 'Martha Stewart',
    studentNumber: '123457',
    course: 'Bachelor of Cyber Security: Honours',
    progressPercentage: 80,
    status: 'Approved',
    supervisorId: 'SUP001',
  },
  {
    id: 'STU003',
    name: 'Marcel Mabuta',
    studentNumber: '123458',
    course: 'Bachelor of Information Systems: Honours',
    progressPercentage: 45,
    status: 'Pending',
    supervisorId: 'SUP001',
  },
  {
    id: 'STU004',
    name: 'Abraham Namaseb',
    studentNumber: '123459',
    course: 'Bachelor of Software Engineering: Honours',
    progressPercentage: 60,
    status: 'In Review',
    supervisorId: 'SUP001',
  },
];

export const SUBMISSIONS = [
  {
    id: 'SUB001',
    studentId: 'STU001',
    title: 'Mini_Thesis_Draft_3.9.pdf',
    fileSize: '32.9 MB',
    reportingPeriod: 'This Month',
    comments: 'Updated methodology section as discussed.',
    status: 'In Review',
    submittedAt: '2026-05-01T09:00:00Z',
    supervisorComments: null,
    signed: false,
  },
  {
    id: 'SUB002',
    studentId: 'STU002',
    title: 'Progress_Report_April.pdf',
    fileSize: '12.4 MB',
    reportingPeriod: 'Last 30 Days',
    comments: 'April progress report submission.',
    status: 'Approved',
    submittedAt: '2026-04-28T14:00:00Z',
    supervisorComments: 'Good progress. Keep it up.',
    signed: true,
  },
  {
    id: 'SUB003',
    studentId: 'STU003',
    title: 'Chapter_2_Draft.pdf',
    fileSize: '8.1 MB',
    reportingPeriod: 'This Week',
    comments: 'First draft of chapter 2.',
    status: 'Returned',
    submittedAt: '2026-04-20T10:00:00Z',
    supervisorComments: 'Please expand the literature review section.',
    signed: false,
  },
];

export const FEEDBACK = [
  {
    id: 'FB001',
    studentId: 'STU001',
    fromName: 'Prof. Doe',
    fromRole: 'Supervisor',
    fromInitials: 'PD',
    message:
      'Your proposal shows strong improvement in methodology. Consider refining the data preprocessing section.',
    status: 'Signed',
    actionRequired: false,
    createdAt: '2026-05-02T08:00:00Z',
  },
  {
    id: 'FB002',
    studentId: 'STU001',
    fromName: 'Dr. Frankenstein',
    fromRole: 'HDC',
    fromInitials: 'DF',
    message:
      'Approved with minor revisions. Update section 3 and resubmit within 5 working days.',
    status: 'Action Required',
    actionRequired: true,
    createdAt: '2026-05-02T09:00:00Z',
  },
  {
    id: 'FB003',
    studentId: 'STU002',
    fromName: 'Prof. Doe',
    fromRole: 'Supervisor',
    fromInitials: 'PD',
    message: 'Excellent work on the April report. No changes needed.',
    status: 'Signed',
    actionRequired: false,
    createdAt: '2026-04-29T10:00:00Z',
  },
  {
    id: 'FB004',
    studentId: 'STU001',
    fromName: 'Prof. Doe',
    fromRole: 'Supervisor',
    fromInitials: 'PD',
    message: 'Chapter 3 needs more depth in the experimental setup. Please elaborate on your dataset selection criteria and justify your choices with references.',
    status: 'Action Required',
    actionRequired: true,
    createdAt: '2026-04-30T11:00:00Z',
  },
  {
    id: 'FB005',
    studentId: 'STU001',
    fromName: 'Dr. Frankenstein',
    fromRole: 'HDC',
    fromInitials: 'DF',
    message: 'Overall structure is good. Abstract needs to be more concise — currently 450 words, limit is 300. Please revise before next submission.',
    status: 'Action Required',
    actionRequired: true,
    createdAt: '2026-04-28T14:00:00Z',
  },
  {
    id: 'FB006',
    studentId: 'STU001',
    fromName: 'Prof. Doe',
    fromRole: 'Supervisor',
    fromInitials: 'PD',
    message: 'Great improvement on the literature review. The sources are well cited and the argument flows logically. Approved for next stage.',
    status: 'Signed',
    actionRequired: false,
    createdAt: '2026-04-25T09:00:00Z',
  },
];

export const MILESTONES = [
  {
    id: 'MIL001',
    studentId: 'STU001',
    title: 'Proposal Submitted',
    date: '2026-05-12',
    status: 'Completed',
  },
  {
    id: 'MIL002',
    studentId: 'STU001',
    title: 'Internal Review',
    date: '2026-05-15',
    status: 'In Progress',
  },
  {
    id: 'MIL003',
    studentId: 'STU001',
    title: 'HDC Decision',
    date: '2026-05-22',
    status: 'Pending',
  },
  {
    id: 'MIL004',
    studentId: 'STU001',
    title: 'Final Submission',
    date: '2026-06-30',
    status: 'Pending',
  },
];

export const TASKS = [
  {
    id: 'TSK001',
    studentId: 'STU001',
    title: 'Update topic title',
    dueDate: '2026-05-12',
    status: 'In Progress',
  },
  {
    id: 'TSK002',
    studentId: 'STU001',
    title: 'Re-evaluate LSTM',
    dueDate: '2026-02-15',
    status: 'Overdue',
  },
];

export const NOTIFICATIONS = [
  {
    id: 'NOT001',
    userId: 'STU001',
    message: 'Prof. Doe has reviewed your latest submission.',
    read: false,
    createdAt: '2026-05-02T08:30:00Z',
  },
  {
    id: 'NOT002',
    userId: 'STU001',
    message: 'HDC has requested minor revisions on your proposal.',
    read: false,
    createdAt: '2026-05-02T09:15:00Z',
  },
  
  {
    id: 'NOT003',
    userId: 'SUP001',
    message: 'Noel McBride has submitted a new progress report.',
    read: false,
    createdAt: '2026-05-01T09:05:00Z',
  },
  {
    id: 'NOT004',
    userId: 'SUP001',
    message: 'Noel McBride has submitted a new progress report.',
    read: false,
    createdAt: '2026-05-01T09:05:00Z',
  },
];