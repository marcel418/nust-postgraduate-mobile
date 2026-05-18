// src/screens/admin/adminHelpers.js

export const ROLE_CODES = [
  'STUDENT',
  'SUPERVISOR',
  'HOD',
  'INTERNAL_EVALUATOR',
  'EXTERNAL_EVALUATOR',
  'FPGC_R',
  'FPGCR',
  'FPGC',
  'ADMIN',
  'SYSTEM_ADMIN',
];

export const ALL_SUBMISSION_STATES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED_BY_SUPERVISOR',
  'REVISIONS_REQUIRED',
  'UNDER_INTERNAL_EVAL',
  'INTERNAL_EVAL_COMPLETED',
  'FORWARDED_TO_FPGCR',
  'FORWARDED_TO_FPGC',
  'APPROVED',
  'REJECTED',
  'EXTERNAL_EVAL_ASSIGNED',
  'EXTERNAL_EVAL_COMPLETED',
];

export function extractItems(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data?.items)) return response.data.items;
  if (Array.isArray(response?.data?.users)) return response.data.users;
  if (Array.isArray(response?.data?.submissions)) return response.data.submissions;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

export function formatLabel(value) {
  if (!value) return 'N/A';

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatDate(value, includeTime = false) {
  if (!value) return 'N/A';

  try {
    return new Date(value).toLocaleString('en-NA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...(includeTime
        ? {
            hour: '2-digit',
            minute: '2-digit',
          }
        : {}),
    });
  } catch {
    return 'N/A';
  }
}

export function getInitials(name) {
  if (!name) return '?';

  return String(name)
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getRoleList(user = {}) {
  if (Array.isArray(user.roles)) return user.roles;
  if (Array.isArray(user.role_codes)) return user.role_codes;
  if (user.role) return [user.role];
  if (user.role_code) return [user.role_code];
  return [];
}

export function getPrimaryRole(user = {}) {
  const roles = getRoleList(user);
  return roles[0] || 'USER';
}

export function getRoleColor(role) {
  const cleanRole = String(role || '').toUpperCase();

  return (
    {
      STUDENT: '#1E56A0',
      SUPERVISOR: '#7C3AED',
      HOD: '#0D3B66',
      INTERNAL_EVALUATOR: '#1B4332',
      EXTERNAL_EVALUATOR: '#2C3E50',
      FPGC_R: '#4A1942',
      FPGCR: '#4A1942',
      FPGC: '#7C2D12',
      ADMIN: '#0D1B2A',
      SYSTEM_ADMIN: '#0D1B2A',
    }[cleanRole] || '#6B7280'
  );
}

export function parseDescription(description) {
  if (!description) {
    return {
      comments: '',
      reportingPeriod: 'N/A',
      fileName: '',
      fileSize: '',
      documentId: null,
      mimeType: '',
    };
  }

  try {
    const parsed = JSON.parse(description);

    return {
      comments: parsed.comments || '',
      reportingPeriod: parsed.reportingPeriod || 'N/A',
      fileName: parsed.fileName || '',
      fileSize: parsed.fileSize || '',
      documentId: parsed.documentId || null,
      mimeType: parsed.mimeType || '',
    };
  } catch {
    return {
      comments: description,
      reportingPeriod: 'N/A',
      fileName: '',
      fileSize: '',
      documentId: null,
      mimeType: '',
    };
  }
}

export function getStatusColor(status) {
  return (
    {
      DRAFT: '#6B7280',
      SUBMITTED: '#7C3AED',
      APPROVED_BY_SUPERVISOR: '#22C55E',
      REVISIONS_REQUIRED: '#F59E0B',
      UNDER_INTERNAL_EVAL: '#7C3AED',
      INTERNAL_EVAL_COMPLETED: '#22C55E',
      FORWARDED_TO_FPGCR: '#1E56A0',
      FORWARDED_TO_FPGC: '#1E56A0',
      APPROVED: '#22C55E',
      REJECTED: '#EF4444',
      EXTERNAL_EVAL_ASSIGNED: '#7C3AED',
      EXTERNAL_EVAL_COMPLETED: '#22C55E',
    }[status] || '#6B7280'
  );
}

export function getStatusLabel(status) {
  return (
    {
      DRAFT: 'Draft',
      SUBMITTED: 'Submitted',
      APPROVED_BY_SUPERVISOR: 'Supervisor Approved',
      REVISIONS_REQUIRED: 'Revisions Required',
      UNDER_INTERNAL_EVAL: 'Under Internal Evaluation',
      INTERNAL_EVAL_COMPLETED: 'Internal Evaluation Complete',
      FORWARDED_TO_FPGCR: 'Forwarded to FPGC-R',
      FORWARDED_TO_FPGC: 'Forwarded to FPGC',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      EXTERNAL_EVAL_ASSIGNED: 'External Evaluator Assigned',
      EXTERNAL_EVAL_COMPLETED: 'External Evaluation Complete',
    }[status] || formatLabel(status)
  );
}

export function normalizeSubmission(item = {}) {
  const details = parseDescription(item.description);
  const status = item.current_state || item.workflow_state || item.status || 'UNKNOWN';
  const studentId = item.student_id || item.student?.id || item.created_by || 'N/A';

  return {
    ...item,
    id: item.id,
    status,
    type: item.submission_type || item.type || 'SUBMISSION',
    typeLabel: formatLabel(item.submission_type || item.type || 'Submission'),
    title: item.title || details.fileName || 'Submission',
    document: details.fileName || item.title || 'Attached document',
    documentSize: details.fileSize || 'Metadata saved',
    documentId: details.documentId,
    reportingPeriod: details.reportingPeriod || 'N/A',
    comments: details.comments || '',
    createdAt: item.created_at || item.createdAt || null,
    updatedAt: item.updated_at || item.updatedAt || item.created_at || null,
    student: {
      id: studentId,
      name:
        item.student_name ||
        item.student?.name ||
        item.created_by_name ||
        `Student ${String(studentId).slice(0, 8)}`,
      course:
        item.student_course ||
        item.student?.course ||
        'Postgraduate Programme',
    },
  };
}

export function normalizeUser(item = {}) {
  const role = getPrimaryRole(item);

  return {
    ...item,
    id: item.id,
    name: item.name || item.full_name || item.email || 'Unnamed User',
    email: item.email || 'No email',
    status: item.status || 'ACTIVE',
    roles: getRoleList(item),
    role,
    roleLabel: formatLabel(role),
  };
}

export function buildStatusCounts(submissions = []) {
  return submissions.reduce((acc, submission) => {
    const key = submission.status || 'UNKNOWN';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function buildRoleCounts(users = []) {
  return users.reduce((acc, user) => {
    const role = getPrimaryRole(user);
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
}
