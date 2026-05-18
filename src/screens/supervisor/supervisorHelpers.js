// src/screens/supervisor/supervisorHelpers.js

export const SUPERVISOR_VISIBLE_STATES = [
  'SUBMITTED',
  'APPROVED_BY_SUPERVISOR',
  'REVISIONS_REQUIRED',
  'UNDER_INTERNAL_EVAL',
  'INTERNAL_EVAL_COMPLETED',
  'FORWARDED_TO_FPGCR',
  'FORWARDED_TO_FPGC',
  'EXTERNAL_EVAL_ASSIGNED',
  'EXTERNAL_EVAL_COMPLETED',
  'APPROVED',
  'REJECTED',
];

export function formatLabel(value) {
  if (!value) return 'N/A';

  if (value === 'SUBMITTED') return 'In Review';

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDate(value) {
  if (!value) return 'N/A';

  try {
    return new Date(value).toLocaleDateString('en-NA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

export function formatFileSize(bytes) {
  if (!bytes) return 'Unknown size';

  const mb = Number(bytes) / (1024 * 1024);

  if (Number.isNaN(mb)) return 'Unknown size';

  if (mb >= 1) return `${mb.toFixed(1)} MB`;

  return `${(Number(bytes) / 1024).toFixed(1)} KB`;
}

export function getStatusColor(status) {
  return (
    {
      SUBMITTED: '#7C3AED',
      APPROVED_BY_SUPERVISOR: '#22C55E',
      REVISIONS_REQUIRED: '#F59E0B',
      UNDER_INTERNAL_EVAL: '#7C3AED',
      INTERNAL_EVAL_COMPLETED: '#22C55E',
      FORWARDED_TO_FPGCR: '#1E56A0',
      FORWARDED_TO_FPGC: '#1E56A0',
      EXTERNAL_EVAL_ASSIGNED: '#7C3AED',
      EXTERNAL_EVAL_COMPLETED: '#22C55E',
      APPROVED: '#22C55E',
      REJECTED: '#EF4444',
      DRAFT: '#6B7280',
    }[status] || '#6B7280'
  );
}

export function getStatusLabel(status) {
  return (
    {
      SUBMITTED: 'In Review',
      APPROVED_BY_SUPERVISOR: 'Approved by Supervisor',
      REVISIONS_REQUIRED: 'Returned',
      UNDER_INTERNAL_EVAL: 'Under Internal Evaluation',
      INTERNAL_EVAL_COMPLETED: 'Internal Evaluation Complete',
      FORWARDED_TO_FPGCR: 'Forwarded to FPGC-R',
      FORWARDED_TO_FPGC: 'Forwarded to FPGC',
      EXTERNAL_EVAL_ASSIGNED: 'External Evaluator Assigned',
      EXTERNAL_EVAL_COMPLETED: 'External Evaluation Complete',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      DRAFT: 'Draft',
    }[status] || formatLabel(status)
  );
}

export function getInitials(name, fallback = 'ST') {
  if (!name) return fallback;

  return String(name)
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function parseDescription(description) {
  if (!description) {
    return {
      comments: '',
      reportingPeriod: 'N/A',
      fileName: '',
      fileSize: '',
      mimeType: '',
      documentId: null,
    };
  }

  try {
    const parsed = JSON.parse(description);

    return {
      comments: parsed.comments || '',
      reportingPeriod: parsed.reportingPeriod || 'N/A',
      fileName: parsed.fileName || '',
      fileSize: parsed.fileSize || '',
      mimeType: parsed.mimeType || '',
      documentId: parsed.documentId || null,
    };
  } catch {
    return {
      comments: description,
      reportingPeriod: 'N/A',
      fileName: '',
      fileSize: '',
      mimeType: '',
      documentId: null,
    };
  }
}

export function normalizeSubmission(submission = {}) {
  const details = parseDescription(submission.description);
  const state =
    submission.current_state ||
    submission.workflow_state ||
    submission.status ||
    'UNKNOWN';

  const studentId =
    submission.student_id ||
    submission.student?.id ||
    submission.studentId ||
    'N/A';

  const studentName =
    submission.student_name ||
    submission.student?.name ||
    submission.created_by_name ||
    `Student ${String(studentId).slice(0, 8)}`;

  return {
    id: submission.id,
    raw: submission,
    title: submission.title || details.fileName || 'Submission',
    type: submission.submission_type || submission.type || 'PROGRESS_REPORT',
    typeLabel: formatLabel(submission.submission_type || submission.type || 'PROGRESS_REPORT'),
    state,
    document: details.fileName || submission.document || submission.title || 'Attached document',
    documentSize: details.fileSize || submission.documentSize || 'Metadata saved',
    documentId: details.documentId || submission.document_id || null,
    reportingPeriod: details.reportingPeriod || submission.reportingPeriod || 'N/A',
    comments: details.comments || submission.comments || '',
    version: submission.current_version_no || submission.version || 1,
    student: {
      id: studentId,
      name: studentName,
      studentNumber:
        submission.student_number ||
        submission.student?.student_number ||
        String(studentId).slice(0, 8),
      course:
        submission.student_course ||
        submission.student?.course ||
        submission.course ||
        'Postgraduate Programme',
    },
    updatedAt: submission.updated_at || submission.created_at || null,
    createdAt: submission.created_at || null,
  };
}

export function groupStudentsFromSubmissions(submissions = []) {
  const byStudent = new Map();

  submissions.forEach((submission) => {
    const normalized = normalizeSubmission(submission);
    const key = String(normalized.student.id || normalized.student.name);

    const current = byStudent.get(key);

    if (!current) {
      byStudent.set(key, {
        id: normalized.student.id,
        name: normalized.student.name,
        studentNumber: normalized.student.studentNumber,
        course: normalized.student.course,
        submissions: [normalized],
        latestSubmission: normalized,
        status: normalized.state,
        progressPercentage: getProgressFromState(normalized.state),
      });
      return;
    }

    current.submissions.push(normalized);

    if (
      new Date(normalized.updatedAt || 0) >
      new Date(current.latestSubmission?.updatedAt || 0)
    ) {
      current.latestSubmission = normalized;
      current.status = normalized.state;
      current.progressPercentage = getProgressFromState(normalized.state);
    }
  });

  return Array.from(byStudent.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function getProgressFromState(state) {
  return (
    {
      DRAFT: 5,
      SUBMITTED: 25,
      APPROVED_BY_SUPERVISOR: 35,
      UNDER_INTERNAL_EVAL: 50,
      INTERNAL_EVAL_COMPLETED: 65,
      FORWARDED_TO_FPGCR: 75,
      FORWARDED_TO_FPGC: 82,
      EXTERNAL_EVAL_ASSIGNED: 88,
      EXTERNAL_EVAL_COMPLETED: 94,
      APPROVED: 100,
      REJECTED: 100,
      REVISIONS_REQUIRED: 30,
    }[state] || 10
  );
}
