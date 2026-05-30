// src/api/submissionsApi.js

import { api } from './http';

export const submissionsApi = {
  list: async () => {
    return api.get('/submissions');
  },

  createDraft: async ({ submission_type, title, description }) => {
    return api.post('/submissions', {
      submission_type,
      title,
      description,
    });
  },

  getById: async (id) => {
    return api.get(`/submissions/${id}`);
  },

  getHistory: async (id) => {
    return api.get(`/submissions/${id}/history`);
  },

  extendDeadline: async (id, extended_due_date) => {
    return api.patch(`/submissions/${id}/extend-deadline`, {
      extended_due_date,
    });
  },

  submit: async (id) => {
    return api.post(`/submissions/${id}/submit`, {});
  },

  deleteDocument: async (id) => {
    return api.delete(`/submissions/${id}/document`);
  },

  allowedActions: async (id) => {
    return api.get(`/submissions/${id}/allowed-actions`);
  },

  approve: async (id, comments = '') => {
    return api.post(`/submissions/${id}/approve`, {
      comments,
    });
  },

  returnForChanges: async (id, comments) => {
    return api.post(`/submissions/${id}/return`, {
      comments,
    });
  },

  assignInternalEvaluator: async (id, { evaluator_id, comments }) => {
    return api.post(`/submissions/${id}/hod/assign-internal-evaluator`, {
      evaluator_id,
      comments,
    });
  },

  completeInternalEvaluation: async (id, { decision, comments }) => {
  return api.post(`/submissions/${id}/internal-evaluation/complete`, {
    decision,
    comments,
  });
},

forwardToFPGC: async (id, comments = '') => {
  return api.post(`/submissions/${id}/fpgcr/forward-fpgc`, {
    comments,
  });
},

finalFPGCDecision: async (id, { decision, comments }) => {
  return api.post(`/submissions/${id}/fpgc/final-decision`, {
    decision,
    comments,
  });
},
assignExternalEvaluator: async (id, { evaluator_id, comments }) => {
  return api.post(`/submissions/${id}/fpgc/assign-external-evaluator`, {
    evaluator_id,
    comments,
  });
},

submitExternalEvaluation: async (id, { grade, recommendation, comments }) => {
  return api.post(`/submissions/${id}/external-evaluation/submit`, {
    grade,
    recommendation,
    comments,
  });
},

submitExternalClaim: async (id, { amount, bank_name, account_number, account_holder, comments }) => {
  return api.post(`/submissions/${id}/external-evaluation/claim`, {
    amount,
    bank_name,
    account_number,
    account_holder,
    comments,
  });
},
};
