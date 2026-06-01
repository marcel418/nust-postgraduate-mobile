// Shared helper functions for student screens.
// This file is included to keep all student screens consistent.

export const WORKFLOW_ORDER = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED_BY_SUPERVISOR',
  'UNDER_INTERNAL_EVAL',
  'INTERNAL_EVAL_COMPLETED',
  'FORWARDED_TO_FPGCR',
  'FORWARDED_TO_FPGC',
  'APPROVED',
  'EXTERNAL_EVAL_ASSIGNED',
  'EXTERNAL_EVAL_COMPLETED',
];

export const STATUS_COLORS = {
  DRAFT: '#6B7280',
  SUBMITTED: '#7C3AED',
  APPROVED_BY_SUPERVISOR: '#F59E0B',
  UNDER_INTERNAL_EVAL: '#7C3AED',
  INTERNAL_EVAL_COMPLETED: '#22C55E',
  FORWARDED_TO_FPGCR: '#1E56A0',
  FORWARDED_TO_FPGC: '#1E56A0',
  EXTERNAL_EVAL_ASSIGNED: '#7C3AED',
  EXTERNAL_EVAL_COMPLETED: '#22C55E',
  REVISIONS_REQUIRED: '#F97316',
  APPROVED: '#22C55E',
  REJECTED: '#EF4444',
};

export function formatLabel(value) {
  if (!value) return 'N/A';

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getStatusLabel(status) {
  return (
    {
      DRAFT: 'Draft',
      SUBMITTED: 'Submitted',
      APPROVED_BY_SUPERVISOR: 'Approved by Supervisor',
      UNDER_INTERNAL_EVAL: 'Under Internal Evaluation',
      INTERNAL_EVAL_COMPLETED: 'Internal Evaluation Complete',
      FORWARDED_TO_FPGCR: 'With FPGC-R',
      FORWARDED_TO_FPGC: 'With FPGC',
      EXTERNAL_EVAL_ASSIGNED: 'External Evaluation Assigned',
      EXTERNAL_EVAL_COMPLETED: 'External Evaluation Complete',
      REVISIONS_REQUIRED: 'Revisions Required',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
    }[status] || formatLabel(status)
  );
}

export function getStatusColor(status) {
  return STATUS_COLORS[status] || '#6B7280';
}

export function formatDate(value, options) {
  if (!value) return 'N/A';

  try {
    return new Date(value).toLocaleDateString('en-NA', options || {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

export function formatTime(value) {
  if (!value) return '';

  try {
    return new Date(value).toLocaleTimeString('en-NA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
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
      documentId: parsed.documentId || parsed.document_id || null,
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

export function getSubmissionState(item = {}) {
  return item.current_state || item.workflow_state || item.status || 'UNKNOWN';
}

export function normalizeSubmission(item = {}) {
  const details = parseDescription(item.description);
  const state = getSubmissionState(item);
  const semesterLabel = item.semester_label || item.semesterLabel || details.reportingPeriod || 'N/A';
  const documentLabel = item.document_label || item.documentLabel || details.fileName || '';

  return {
    ...item,
    id: item.id,
    title: item.title || details.fileName || 'Submission',
    state,
    status: state,
    statusLabel: getStatusLabel(state),
    statusColor: getStatusColor(state),
    type: item.submission_type || item.type || 'PROGRESS_REPORT',
    typeLabel: formatLabel(item.submission_type || item.type || 'Progress Report'),
    fileName: documentLabel || details.fileName || item.title || 'Uploaded document',
    fileSize: details.fileSize || 'Metadata saved',
    documentId: details.documentId,
    reportingPeriod: semesterLabel,
    semesterLabel,
    documentLabel,
    trackingLabel: documentLabel || semesterLabel || 'N/A',
    comments: details.comments || '',
    createdAt: item.created_at || item.createdAt || item.updated_at,
    updatedAt: item.updated_at || item.updatedAt || item.created_at,
    versionNo: item.current_version_no || item.version_no || 1,
    semesterId: item.semester_id || item.semesterId || null,
    dueDate: item.due_date || item.dueDate || null,
    extendedDueDate: item.extended_due_date || item.extendedDueDate || null,
  };
}

export function getProgressFromState(state) {
  if (state === 'REJECTED') return 100;
  if (state === 'REVISIONS_REQUIRED') return 45;

  const index = WORKFLOW_ORDER.indexOf(state);

  if (index < 0) return 10;

  return Math.max(8, Math.min(100, Math.round((index / (WORKFLOW_ORDER.length - 1)) * 100)));
}

export function getProgressPercentage(input) {
  const submission = input && typeof input === 'object' ? input : { current_state: input };
  const state = getSubmissionState(submission);
  const createdAt = submission.created_at || submission.createdAt;
  const dueDate = submission.extended_due_date || submission.extendedDueDate || submission.due_date || submission.dueDate;

  if (!dueDate) {
    return getProgressFromState(state);
  }

  const start = createdAt ? new Date(createdAt) : null;
  const end = dueDate ? new Date(dueDate) : null;

  if (!start || Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
    return getProgressFromState(state);
  }

  const now = new Date();

  if (now >= end) {
    return 100;
  }

  const total = end.getTime() - start.getTime();

  if (total <= 0) {
    return getProgressFromState(state);
  }

  const elapsed = now.getTime() - start.getTime();
  const percentage = Math.round((elapsed / total) * 100);

  return Math.max(0, Math.min(100, percentage));
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

export function sortNewestFirst(items = []) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || b.updated_at || b.created_at || 0) -
      new Date(a.updatedAt || a.createdAt || a.updated_at || a.created_at || 0)
  );
}
