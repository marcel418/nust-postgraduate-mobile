export const ALL_STATUS_VALUE = 'ALL';

export const SUBMISSION_STATUS_FILTER_OPTIONS = [
  { label: 'All statuses', value: ALL_STATUS_VALUE },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Submitted', value: 'SUBMITTED' },
  { label: 'Approved by Supervisor', value: 'APPROVED_BY_SUPERVISOR' },
  { label: 'Revisions Required', value: 'REVISIONS_REQUIRED' },
  { label: 'Under Internal Evaluation', value: 'UNDER_INTERNAL_EVAL' },
  { label: 'Internal Evaluation Complete', value: 'INTERNAL_EVAL_COMPLETED' },
  { label: 'Forwarded to FPGC-R', value: 'FORWARDED_TO_FPGCR' },
  { label: 'Forwarded to FPGC', value: 'FORWARDED_TO_FPGC' },
  { label: 'External Evaluation Assigned', value: 'EXTERNAL_EVAL_ASSIGNED' },
  { label: 'External Evaluation Complete', value: 'EXTERNAL_EVAL_COMPLETED' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export function filterItemsByStatus(items = [], selectedStatus = ALL_STATUS_VALUE, getStatus = (item) => item?.state || item?.status || 'UNKNOWN') {
  if (selectedStatus === ALL_STATUS_VALUE) {
    return items;
  }

  return items.filter((item) => getStatus(item) === selectedStatus);
}