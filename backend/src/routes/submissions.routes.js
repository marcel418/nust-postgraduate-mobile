// backend/src/routes/submissions.routes.js

const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { success, error, correlationId } = require('../utils/response');

const router = express.Router();

router.use(auth);

function getAllowedActions(submission, user) {
  const roles = user.roles || [];

  if (
    roles.includes('STUDENT') &&
    submission.student_id === user.id &&
    ['DRAFT', 'REVISIONS_REQUIRED'].includes(submission.current_state)
  ) {
    return ['UPDATE', 'SUBMIT'];
  }

  if (roles.includes('SUPERVISOR') && submission.current_state === 'SUBMITTED') {
    return ['APPROVE', 'RETURN'];
  }

  if (
    roles.includes('HOD') &&
    submission.current_state === 'APPROVED_BY_SUPERVISOR'
  ) {
    return ['ASSIGN_INTERNAL_EVALUATOR', 'FORWARD_TO_FPGCR', 'RETURN'];
  }

  return [];
}

function canExtendDeadline(user) {
  const roles = Array.isArray(user?.roles) ? user.roles : [];

  return roles.includes('SUPERVISOR') || roles.includes('FPGC');
}

function parseIsoDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function humanizeToken(value) {
  if (!value) return 'N/A';

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getWorkflowHistoryLabel(event = {}) {
  const actionCode = String(event.action_code || '').toUpperCase();
  const toState = String(event.to_state || '').toUpperCase();

  return (
    {
      SUBMIT: 'Submission Submitted',
      SUPERVISOR_APPROVE: 'Supervisor Reviewed',
      SUPERVISOR_RETURN: 'Returned for Revision',
      HOD_ASSIGN_INTERNAL_EVALUATOR: 'Internal Evaluator Assigned',
      HOD_FORWARD_FPGCR: 'Forwarded to FPGC-R',
      FPGCR_FORWARD_FPGC: 'Forwarded to FPGC',
      FPGC_FINAL_APPROVE: 'Approved',
      FPGC_FINAL_REJECT: 'Rejected',
      INTERNAL_EVAL_COMPLETE: 'Internal Evaluation Complete',
      INTERNAL_EVAL_RETURN: 'Returned for Revision',
      EXTERNAL_EVAL_COMPLETE: 'External Evaluation Complete',
      EXTERNAL_EVAL_RETURN: 'Returned for Revision',
    }[actionCode] ||
    {
      DRAFT: 'Submission Created',
      SUBMITTED: 'Submission Submitted',
      APPROVED_BY_SUPERVISOR: 'Supervisor Reviewed',
      REVISIONS_REQUIRED: 'Returned for Revision',
      UNDER_INTERNAL_EVAL: 'Internal Evaluator Assigned',
      INTERNAL_EVAL_COMPLETED: 'Internal Evaluation Complete',
      FORWARDED_TO_FPGCR: 'Forwarded to FPGC-R',
      FORWARDED_TO_FPGC: 'Forwarded to FPGC',
      EXTERNAL_EVAL_ASSIGNED: 'External Evaluator Assigned',
      EXTERNAL_EVAL_COMPLETED: 'External Evaluation Complete',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
    }[toState] ||
    humanizeToken(actionCode)
  );
}

function getAuditHistoryLabel(event = '') {
  const normalized = String(event).toUpperCase();

  return (
    {
      SUBMISSION_CREATED: 'Submission Created',
      SUBMISSION_SUBMITTED: 'Submission Submitted',
      SUBMISSION_APPROVED_BY_SUPERVISOR: 'Supervisor Reviewed',
      SUBMISSION_RETURNED_BY_SUPERVISOR: 'Returned for Revision',
      SUBMISSION_DEADLINE_EXTENDED: 'Deadline Extended',
      HOD_ASSIGNED_INTERNAL_EVALUATOR: 'Internal Evaluator Assigned',
      HOD_FORWARDED_TO_FPGCR: 'Forwarded to FPGC-R',
      FPGCR_FORWARDED_TO_FPGC: 'Forwarded to FPGC',
      FPGC_FINAL_APPROVAL: 'Approved',
      FPGC_FINAL_REJECTION: 'Rejected',
      FPGC_FINAL_APPROVE: 'Approved',
      FPGC_FINAL_REJECT: 'Rejected',
      SUBMISSION_APPROVED_BY_FPGC: 'Approved',
      SUBMISSION_REJECTED_BY_FPGC: 'Rejected',
    }[normalized] || humanizeToken(normalized)
  );
}

// GET /api/v1/submissions
router.get('/', async (req, res) => {
  try {
    const roles = req.user.roles || [];
    const params = [];

    let query = `
      select distinct
        s.*,
        sem.label as semester_label,
        wi.current_state as workflow_state
      from submissions s
      left join workflow_instances wi on wi.submission_id = s.id
      left join academic_semesters sem on sem.id = s.semester_id
    `;

    let where = '';

    if (roles.includes('STUDENT')) {
      params.push(req.user.id);
      where = 'where s.student_id = $1';
    } else if (roles.includes('INTERNAL_EVALUATOR')) {
      params.push(req.user.id);
      query += `
        inner join workflow_tasks wt 
          on wt.submission_id = s.id
         and wt.assigned_to = $1
         and wt.assigned_role = 'INTERNAL_EVALUATOR'
      `;
      where = `
        where s.current_state = 'UNDER_INTERNAL_EVAL'
          and wt.status = 'OPEN'
      `;
    } else if (roles.includes('EXTERNAL_EVALUATOR')) {
  params.push(req.user.id);
  query += `
    inner join workflow_tasks wt
      on wt.submission_id = s.id
     and wt.assigned_to = $1
     and wt.assigned_role = 'EXTERNAL_EVALUATOR'
  `;
  where = `
    where s.current_state in ('EXTERNAL_EVAL_ASSIGNED', 'EXTERNAL_EVAL_COMPLETED')
  `;
}

    const result = await pool.query(
      `
      ${query}
      ${where}
      order by s.created_at desc
      limit 50
      `,
      params
    );

    return success(req, res, {
      items: result.rows,
    });
  } catch (err) {
    return error(req, res, 'Could not fetch submissions.', 500, err.message);
  }
});

// POST /api/v1/submissions
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { submission_type, title, description, document_label } = req.body;

    if (!submission_type || !title) {
      return error(req, res, 'submission_type and title are required.', 422);
    }

    await client.query('begin');

    const semesterResult = await client.query(
      `
      select id, label, end_date
      from academic_semesters
      where is_active = true
      order by start_date desc, id desc
      limit 1
      `
    );

    const activeSemester = semesterResult.rows[0] || null;

    if (activeSemester) {
      const existingResult = await client.query(
        `
        select id
        from submissions
        where student_id = $1
          and semester_id = $2
        limit 1
        `,
        [req.user.id, activeSemester.id]
      );

      if (existingResult.rowCount > 0) {
        await client.query('rollback');
        return error(req, res, 'You already submitted a report for this semester', 409);
      }
    }

    const submissionResult = await client.query(
      `
      insert into submissions 
        (student_id, submission_type, title, description, document_label, semester_id, due_date, current_state, created_by, updated_by)
      values 
        ($1, $2, $3, $4, $5, $6, $7, 'DRAFT', $1, $1)
      returning *
      `,
      [
        req.user.id,
        submission_type,
        title,
        description || null,
        document_label || title || null,
        activeSemester ? activeSemester.id : null,
        activeSemester ? activeSemester.end_date : null,
      ]
    );

    const submission = submissionResult.rows[0];

    await client.query(
      `
      insert into submission_versions
        (submission_id, version_no)
      values
        ($1, 1)
      `,
      [submission.id]
    );

    await client.query(
      `
      insert into workflow_instances
        (submission_id, current_state)
      values
        ($1, 'DRAFT')
      `,
      [submission.id]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, new_values, correlation_id)
      values
        ($1, 'SUBMISSION_CREATED', 'submission', $2, $3, $4)
      `,
      [req.user.id, submission.id, submission, correlationId(req)]
    );

    await client.query('commit');

    return success(
      req,
      res,
      {
        submission,
      },
      201
    );
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not create submission.', 500, err.message);
  } finally {
    client.release();
  }
});

// GET /api/v1/submissions/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `
      select 
        s.*,
        sem.label as semester_label,
        wi.current_state as workflow_state
      from submissions s
      left join workflow_instances wi on wi.submission_id = s.id
      left join academic_semesters sem on sem.id = s.semester_id
      where s.id = $1
      `,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = result.rows[0];

    return success(req, res, {
      submission,
      allowed_actions: getAllowedActions(submission, req.user),
    });
  } catch (err) {
    return error(req, res, 'Could not fetch submission.', 500, err.message);
  }
});

// GET /api/v1/submissions/:id/history
router.get('/:id/history', async (req, res) => {
  try {
    const submissionResult = await pool.query(
      `
      select
        s.*,
        sem.label as semester_label,
        wi.current_state as workflow_state
      from submissions s
      left join workflow_instances wi on wi.submission_id = s.id
      left join academic_semesters sem on sem.id = s.semester_id
      where s.id = $1
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (
      Array.isArray(req.user.roles) &&
      req.user.roles.includes('STUDENT') &&
      submission.student_id !== req.user.id
    ) {
      return error(req, res, 'Forbidden.', 403);
    }

    const historyResult = await pool.query(
      `
      select
        t.kind,
        t.created_at,
        t.actor_name,
        t.actor_email,
        t.action_code,
        t.from_state,
        t.to_state,
        t.reason,
        t.event_name,
        t.old_values,
        t.new_values,
        t.correlation_id,
        t.source_order
      from (
        select
          'workflow_transition'::text as kind,
          wt.created_at,
          u.name as actor_name,
          u.email as actor_email,
          wt.action_code,
          wt.from_state,
          wt.to_state,
          wt.reason,
          null::text as event_name,
          null::jsonb as old_values,
          null::jsonb as new_values,
          wt.correlation_id,
          0 as source_order
        from workflow_transitions wt
        left join users u on u.id = wt.actor_id
        where wt.submission_id = $1

        union all

        select
          'audit_log'::text as kind,
          al.created_at,
          u.name as actor_name,
          u.email as actor_email,
          null::text as action_code,
          null::text as from_state,
          null::text as to_state,
          null::text as reason,
          al.event as event_name,
          al.old_values,
          al.new_values,
          al.correlation_id,
          1 as source_order
        from audit_logs al
        left join users u on u.id = al.actor_id
        where al.entity_type = 'submission'
          and al.entity_id = $1
      ) t
      order by t.created_at asc, t.source_order asc
      `,
      [req.params.id]
    );

    const timeline = historyResult.rows.map((row) => {
      const label =
        row.kind === 'workflow_transition'
          ? getWorkflowHistoryLabel(row)
          : getAuditHistoryLabel(row.event_name);

      return {
        type: row.kind,
        label,
        actor: row.actor_name || row.actor_email || 'System',
        created_at: row.created_at,
        metadata: {
          action_code: row.action_code,
          from_state: row.from_state,
          to_state: row.to_state,
          reason: row.reason,
          event: row.event_name,
          old_values: row.old_values,
          new_values: row.new_values,
          correlation_id: row.correlation_id,
        },
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        timeline,
      },
      meta: {
        correlation_id: correlationId(req),
      },
      errors: [],
    });
  } catch (err) {
    return error(req, res, 'Could not fetch submission history.', 500, err.message);
  }
});

// PATCH /api/v1/submissions/:id/extend-deadline
router.patch('/:id/extend-deadline', async (req, res) => {
  const client = await pool.connect();

  try {
    if (!canExtendDeadline(req.user)) {
      return error(req, res, 'Forbidden.', 403);
    }

    const requestedDeadline = parseIsoDateOnly(req.body?.extended_due_date);

    if (!requestedDeadline) {
      return error(
        req,
        res,
        'extended_due_date must be a valid YYYY-MM-DD date.',
        400
      );
    }

    await client.query('begin');

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];
    const effectiveDeadlineValue = submission.extended_due_date || submission.due_date;
    const effectiveDeadline = effectiveDeadlineValue
      ? new Date(effectiveDeadlineValue)
      : null;

    if (!effectiveDeadlineValue || !effectiveDeadline || Number.isNaN(effectiveDeadline.getTime())) {
      await client.query('rollback');
      return error(
        req,
        res,
        'Submission does not have a deadline that can be extended.',
        400
      );
    }

    if (requestedDeadline.getTime() <= effectiveDeadline.getTime()) {
      await client.query('rollback');
      return error(
        req,
        res,
        'extended_due_date must be later than the current deadline.',
        400
      );
    }

    const updatedResult = await client.query(
      `
      update submissions
      set extended_due_date = $1
      where id = $2
      returning *
      `,
      [req.body.extended_due_date, submission.id]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'Deadline Extended', $2, 'DEADLINE')
      `,
      [
        submission.student_id,
        `Your submission deadline has been extended to ${req.body.extended_due_date}.`,
      ]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'SUBMISSION_DEADLINE_EXTENDED', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        updatedResult.rows[0],
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      submission: updatedResult.rows[0],
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not extend submission deadline.', 500, err.message);
  } finally {
    client.release();
  }
});

// DELETE /api/v1/submissions/:id/document
router.delete('/:id/document', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    const roles = Array.isArray(req.user.roles) ? req.user.roles : [];

    // Only allow the owning student to delete their uploaded file.
    // Explicitly deny non-students to prevent supervisors/admins from unlinking student files.
    if (!roles.includes('STUDENT')) {
      await client.query('rollback');
      return error(req, res, 'Only the owning student may delete uploaded files.', 403);
    }

    if (submission.student_id !== req.user.id) {
      await client.query('rollback');
      return error(req, res, 'Forbidden.', 403);
    }

    // Compute effective deadline
    const effectiveDeadlineValue = submission.extended_due_date || submission.due_date;
    const effectiveDeadline = effectiveDeadlineValue ? new Date(effectiveDeadlineValue) : null;

    // If there is an effective deadline and it's passed, block deletion.
    if (effectiveDeadline) {
      const now = new Date();
      if (now.getTime() > effectiveDeadline.getTime()) {
        await client.query('rollback');
        return error(req, res, 'Cannot delete uploaded file after the submission deadline.', 403);
      }
    }

    // Parse description JSON to find linked document id
    let desc = null;
    try {
      desc = submission.description ? JSON.parse(submission.description) : {};
    } catch {
      desc = {};
    }

    const documentId = desc.documentId || desc.document_id || null;

    if (!documentId) {
      // Nothing to unlink; still safe to return success
      await client.query('rollback');
      return error(req, res, 'No uploaded document found for this submission.', 404);
    }

    // Load document row if exists
    const docResult = await client.query(
      `select * from documents where id = $1`,
      [documentId]
    );

    const document = docResult.rowCount > 0 ? docResult.rows[0] : null;

    const oldDescription = desc;

    // Remove file-related keys from description
    delete desc.documentId;
    delete desc.document_id;
    delete desc.fileName;
    delete desc.file_size;
    delete desc.fileSize;
    delete desc.mimeType;
    delete desc.mime_type;

    const newDescriptionText = Object.keys(desc).length ? JSON.stringify(desc) : null;

    const updatedResult = await client.query(
      `
      update submissions
      set description = $1,
          document_label = coalesce($2, document_label),
          updated_by = $3,
          updated_at = now()
      where id = $4
      returning *
      `,
      [newDescriptionText, submission.title || null, req.user.id, submission.id]
    );

    // If the document row exists and was uploaded by this user, check references and remove it safely
    if (document && String(document.uploaded_by) === String(req.user.id)) {
      const refCountRes = await client.query(
        `select count(*) as cnt from submission_documents where document_id = $1`,
        [document.id]
      );

      const submissionDocRefs = Number(refCountRes.rows[0].cnt || 0);

      // Check other submissions' description fields for references to this document id (text-search fallback)
      const otherDescRes = await client.query(
        `select count(*) as cnt from submissions where id <> $1 and description is not null and description like '%' || $2 || '%'`,
        [submission.id, String(document.id)]
      );

      const otherDescRefs = Number(otherDescRes.rows[0].cnt || 0);

      if (submissionDocRefs > 0 || otherDescRefs > 0) {
        // Preserve document row and file; we only unlink the submission description (already done above)
        await client.query(
          `
          insert into audit_logs
            (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
          values
            ($1, 'SUBMISSION_DOCUMENT_UNLINKED_PRESERVE_DOCUMENT', 'submission', $2, $3, $4, $5)
          `,
          [req.user.id, submission.id, oldDescription, updatedResult.rows[0], correlationId(req)]
        );
      } else {
        // No references found: attempt safe file removal using rename-to-tombstone approach to avoid partial state
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        const absolutePath = path.resolve(__dirname, '../..', document.storage_key || '');

        let tombstonePath = null;

        try {
          if (!absolutePath.startsWith(uploadsDir)) {
            throw new Error('Document path not inside uploads directory');
          }

          if (fs.existsSync(absolutePath)) {
            const tombstoneDir = path.join(uploadsDir, '.trash');
            if (!fs.existsSync(tombstoneDir)) fs.mkdirSync(tombstoneDir, { recursive: true });
            tombstonePath = path.join(tombstoneDir, `${Date.now()}-${path.basename(absolutePath)}`);
            fs.renameSync(absolutePath, tombstonePath);
          }

          // delete DB row now that file moved to tombstone
          await client.query(`delete from documents where id = $1`, [document.id]);

          // finally remove tombstone file if present (best-effort)
          try {
            if (tombstonePath && fs.existsSync(tombstonePath)) {
              fs.unlinkSync(tombstonePath);
            }
          } catch (err) {
            // non-fatal: log and continue
            console.error('Could not remove tombstone file', err && err.message);
          }
        } catch (err) {
          // If any file system step failed, rollback and preserve DB
          console.error('File removal failed, rolling back:', err && err.message);
          await client.query('rollback');
          // try to restore tombstone if we moved it
          try {
            if (tombstonePath && fs.existsSync(tombstonePath)) {
              fs.renameSync(tombstonePath, absolutePath);
            }
          } catch (restoreErr) {
            console.error('Could not restore tombstone file after failure', restoreErr && restoreErr.message);
          }

          return error(req, res, 'Could not remove file from storage. Operation aborted.', 500, err.message);
        }
      }
    }

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'SUBMISSION_DOCUMENT_REMOVED', 'submission', $2, $3, $4, $5)
      `,
      [req.user.id, submission.id, oldDescription, updatedResult.rows[0], correlationId(req)]
    );

    await client.query('commit');

    return success(req, res, {
      submission: updatedResult.rows[0],
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not remove submission document.', 500, err.message);
  } finally {
    client.release();
  }
});

// PATCH /api/v1/submissions/:id
router.patch('/:id', async (req, res) => {
  try {
    const { title, description } = req.body;

    const result = await pool.query(
      `
      update submissions
      set 
        title = coalesce($1, title),
        description = coalesce($2, description),
        updated_by = $3,
        updated_at = now()
      where id = $4
        and student_id = $3
        and current_state in ('DRAFT', 'REVISIONS_REQUIRED')
      returning *
      `,
      [title || null, description || null, req.user.id, req.params.id]
    );

    if (result.rowCount === 0) {
      return error(
        req,
        res,
        'Submission cannot be updated in its current state.',
        409
      );
    }

    return success(req, res, {
      submission: result.rows[0],
    });
  } catch (err) {
    return error(req, res, 'Could not update submission.', 500, err.message);
  }
});

// POST /api/v1/submissions/:id/submit
router.post('/:id/submit', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (submission.student_id !== req.user.id) {
      await client.query('rollback');
      return error(req, res, 'Forbidden.', 403);
    }

    if (!['DRAFT', 'REVISIONS_REQUIRED'].includes(submission.current_state)) {
      await client.query('rollback');
      return error(
        req,
        res,
        'Submission cannot be submitted in its current state.',
        409
      );
    }

    await client.query(
      `
      update submissions
      set current_state = 'SUBMITTED',
          updated_by = $1,
          updated_at = now()
      where id = $2
      `,
      [req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = 'SUBMITTED'
      where submission_id = $1
      `,
      [submission.id]
    );

    await client.query(
      `
      update submission_versions
      set is_locked = true,
          submitted_by = $1,
          submitted_at = now()
      where submission_id = $2
        and version_no = $3
      `,
      [req.user.id, submission.id, submission.current_version_no]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, 'SUBMITTED', 'SUBMIT', $3, $4, $5)
      `,
      [
        submission.id,
        submission.current_state,
        req.user.id,
        req.body?.reason || null,
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'SUBMISSION_SUBMITTED', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        { current_state: 'SUBMITTED' },
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message: 'Submission submitted successfully.',
      submission_id: submission.id,
      current_state: 'SUBMITTED',
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not submit submission.', 500, err.message);
  } finally {
    client.release();
  }
});

// GET /api/v1/submissions/:id/allowed-actions
router.get('/:id/allowed-actions', async (req, res) => {
  try {
    const result = await pool.query(
      `
      select *
      from submissions
      where id = $1
      `,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = result.rows[0];

    return success(req, res, {
      submission_id: req.params.id,
      allowed_actions: getAllowedActions(submission, req.user),
    });
  } catch (err) {
    return error(req, res, 'Could not fetch allowed actions.', 500, err.message);
  }
});

// POST /api/v1/submissions/:id/approve
router.post('/:id/approve', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (!req.user.roles.includes('SUPERVISOR')) {
      await client.query('rollback');
      return error(req, res, 'Only supervisors can approve submissions.', 403);
    }

    if (submission.current_state !== 'SUBMITTED') {
      await client.query('rollback');
      return error(req, res, 'Only submitted reports can be approved.', 409);
    }

    const updatedResult = await client.query(
      `
      update submissions
      set current_state = 'APPROVED_BY_SUPERVISOR',
          updated_by = $1,
          updated_at = now()
      where id = $2
      returning *
      `,
      [req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = 'APPROVED_BY_SUPERVISOR'
      where submission_id = $1
      `,
      [submission.id]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, 'APPROVED_BY_SUPERVISOR', 'SUPERVISOR_APPROVE', $3, $4, $5)
      `,
      [
        submission.id,
        submission.current_state,
        req.user.id,
        req.body?.comments || null,
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'Submission approved', 'Your progress report was approved by your supervisor.', 'WORKFLOW')
      `,
      [submission.student_id]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'SUBMISSION_APPROVED_BY_SUPERVISOR', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        updatedResult.rows[0],
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message: 'Submission approved successfully.',
      submission: updatedResult.rows[0],
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not approve submission.', 500, err.message);
  } finally {
    client.release();
  }
});

// POST /api/v1/submissions/:id/return
router.post('/:id/return', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { comments } = req.body || {};

    if (!comments || !comments.trim()) {
      await client.query('rollback');
      return error(req, res, 'Return comments are required.', 422);
    }

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (!req.user.roles.includes('SUPERVISOR')) {
      await client.query('rollback');
      return error(req, res, 'Only supervisors can return submissions.', 403);
    }

    if (submission.current_state !== 'SUBMITTED') {
      await client.query('rollback');
      return error(req, res, 'Only submitted reports can be returned.', 409);
    }

    const updatedResult = await client.query(
      `
      update submissions
      set current_state = 'REVISIONS_REQUIRED',
          updated_by = $1,
          updated_at = now()
      where id = $2
      returning *
      `,
      [req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = 'REVISIONS_REQUIRED'
      where submission_id = $1
      `,
      [submission.id]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, 'REVISIONS_REQUIRED', 'SUPERVISOR_RETURN', $3, $4, $5)
      `,
      [
        submission.id,
        submission.current_state,
        req.user.id,
        comments.trim(),
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'Submission returned', $2, 'WORKFLOW')
      `,
      [submission.student_id, comments.trim()]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'SUBMISSION_RETURNED_BY_SUPERVISOR', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        updatedResult.rows[0],
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message: 'Submission returned successfully.',
      submission: updatedResult.rows[0],
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not return submission.', 500, err.message);
  } finally {
    client.release();
  }
});

// POST /api/v1/submissions/:id/hod/assign-internal-evaluator
router.post('/:id/hod/assign-internal-evaluator', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { evaluator_id, comments } = req.body || {};

    if (!evaluator_id) {
      await client.query('rollback');
      return error(req, res, 'evaluator_id is required.', 422);
    }

    if (!req.user.roles.includes('HOD')) {
      await client.query('rollback');
      return error(req, res, 'Only HOD users can assign internal evaluators.', 403);
    }

    const evaluatorResult = await client.query(
      `
      select
        u.id,
        u.name,
        u.email,
        coalesce(json_agg(r.code) filter (where r.code is not null), '[]') as roles
      from users u
      left join user_roles ur on ur.user_id = u.id
      left join roles r on r.id = ur.role_id
      where u.id = $1
      group by u.id
      `,
      [evaluator_id]
    );

    if (evaluatorResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Internal evaluator not found.', 404);
    }

    const evaluator = evaluatorResult.rows[0];

    if (!evaluator.roles.includes('INTERNAL_EVALUATOR')) {
      await client.query('rollback');
      return error(req, res, 'Selected user is not an internal evaluator.', 422);
    }

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (submission.current_state !== 'APPROVED_BY_SUPERVISOR') {
      await client.query('rollback');
      return error(
        req,
        res,
        'Only supervisor-approved submissions can be assigned to an internal evaluator.',
        409
      );
    }

    const updatedResult = await client.query(
      `
      update submissions
      set current_state = 'UNDER_INTERNAL_EVAL',
          updated_by = $1,
          updated_at = now()
      where id = $2
      returning *
      `,
      [req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = 'UNDER_INTERNAL_EVAL'
      where submission_id = $1
      `,
      [submission.id]
    );

    await client.query(
      `
      insert into workflow_tasks
        (submission_id, assigned_to, assigned_role, task_type, status, due_at)
      values
        ($1, $2, 'INTERNAL_EVALUATOR', 'INTERNAL_EVALUATION', 'OPEN', now() + interval '14 days')
      `,
      [submission.id, evaluator.id]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, 'UNDER_INTERNAL_EVAL', 'HOD_ASSIGN_INTERNAL_EVALUATOR', $3, $4, $5)
      `,
      [
        submission.id,
        submission.current_state,
        req.user.id,
        comments || `Assigned to ${evaluator.name}`,
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'Internal evaluation assigned', $2, 'WORKFLOW')
      `,
      [
        evaluator.id,
        `You have been assigned to evaluate "${submission.title}".`,
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'Submission assigned for evaluation', $2, 'WORKFLOW')
      `,
      [
        submission.student_id,
        `Your submission "${submission.title}" has been assigned to an internal evaluator.`,
      ]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'HOD_ASSIGNED_INTERNAL_EVALUATOR', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        {
          ...updatedResult.rows[0],
          assigned_internal_evaluator_id: evaluator.id,
          assigned_internal_evaluator_name: evaluator.name,
        },
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message: 'Internal evaluator assigned successfully.',
      submission: updatedResult.rows[0],
      evaluator,
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not assign internal evaluator.', 500, err.message);
  } finally {
    client.release();
  }
});

// POST /api/v1/submissions/:id/internal-evaluation/complete
router.post('/:id/internal-evaluation/complete', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { decision, comments } = req.body || {};
    const cleanDecision = String(decision || '').toUpperCase();

    if (!['APPROVE', 'RETURN'].includes(cleanDecision)) {
      await client.query('rollback');
      return error(req, res, 'decision must be APPROVE or RETURN.', 422);
    }

    if (!comments || !comments.trim()) {
      await client.query('rollback');
      return error(req, res, 'Evaluation comments are required.', 422);
    }

    if (!req.user.roles.includes('INTERNAL_EVALUATOR')) {
      await client.query('rollback');
      return error(req, res, 'Only internal evaluators can complete evaluations.', 403);
    }

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (submission.current_state !== 'UNDER_INTERNAL_EVAL') {
      await client.query('rollback');
      return error(
        req,
        res,
        'Only submissions under internal evaluation can be completed.',
        409
      );
    }

    const taskResult = await client.query(
      `
      select *
      from workflow_tasks
      where submission_id = $1
        and assigned_to = $2
        and assigned_role = 'INTERNAL_EVALUATOR'
        and status = 'OPEN'
      order by created_at desc
      limit 1
      `,
      [submission.id, req.user.id]
    );

    if (taskResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'No open internal evaluation task found for this user.', 403);
    }

    const nextState =
      cleanDecision === 'APPROVE'
        ? 'INTERNAL_EVAL_COMPLETED'
        : 'REVISIONS_REQUIRED';

    const actionCode =
      cleanDecision === 'APPROVE'
        ? 'INTERNAL_EVALUATOR_APPROVE'
        : 'INTERNAL_EVALUATOR_RETURN';

    const updatedResult = await client.query(
      `
      update submissions
      set current_state = $1,
          updated_by = $2,
          updated_at = now()
      where id = $3
      returning *
      `,
      [nextState, req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = $1
      where submission_id = $2
      `,
      [nextState, submission.id]
    );

    await client.query(
      `
      update workflow_tasks
      set status = 'COMPLETED',
          completed_at = now()
      where id = $1
      `,
      [taskResult.rows[0].id]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        submission.id,
        submission.current_state,
        nextState,
        actionCode,
        req.user.id,
        comments.trim(),
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, $2, $3, 'WORKFLOW')
      `,
      [
        submission.student_id,
        cleanDecision === 'APPROVE'
          ? 'Internal evaluation completed'
          : 'Submission returned by internal evaluator',
        comments.trim(),
      ]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, $2, 'submission', $3, $4, $5, $6)
      `,
      [
        req.user.id,
        cleanDecision === 'APPROVE'
          ? 'INTERNAL_EVALUATION_COMPLETED'
          : 'INTERNAL_EVALUATION_RETURNED',
        submission.id,
        submission,
        updatedResult.rows[0],
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message:
        cleanDecision === 'APPROVE'
          ? 'Internal evaluation completed successfully.'
          : 'Submission returned successfully.',
      submission: updatedResult.rows[0],
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not complete internal evaluation.', 500, err.message);
  } finally {
    client.release();
  }
});

// POST /api/v1/submissions/:id/hod/forward-fpgcr
router.post('/:id/hod/forward-fpgcr', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { comments } = req.body || {};

    if (!req.user.roles.includes('HOD')) {
      await client.query('rollback');
      return error(req, res, 'Only HOD users can forward submissions to FPGC-R.', 403);
    }

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (submission.current_state !== 'INTERNAL_EVAL_COMPLETED') {
      await client.query('rollback');
      return error(
        req,
        res,
        'Only internally evaluated submissions can be forwarded to FPGC-R.',
        409
      );
    }

    const fpgcrResult = await client.query(
      `
      select
        u.id,
        u.name,
        u.email
      from users u
      inner join user_roles ur on ur.user_id = u.id
      inner join roles r on r.id = ur.role_id
      where r.code = 'FPGC_R'
        and u.status = 'ACTIVE'
      order by u.name asc
      limit 1
      `
    );

    if (fpgcrResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'No active FPGC-R user found.', 404);
    }

    const fpgcrUser = fpgcrResult.rows[0];

    const updatedResult = await client.query(
      `
      update submissions
      set current_state = 'FORWARDED_TO_FPGCR',
          updated_by = $1,
          updated_at = now()
      where id = $2
      returning *
      `,
      [req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = 'FORWARDED_TO_FPGCR'
      where submission_id = $1
      `,
      [submission.id]
    );

    await client.query(
      `
      insert into workflow_tasks
        (submission_id, assigned_to, assigned_role, task_type, status, due_at)
      values
        ($1, $2, 'FPGC_R', 'FPGCR_REVIEW', 'OPEN', now() + interval '14 days')
      `,
      [submission.id, fpgcrUser.id]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, 'FORWARDED_TO_FPGCR', 'HOD_FORWARD_FPGCR', $3, $4, $5)
      `,
      [
        submission.id,
        submission.current_state,
        req.user.id,
        comments || 'Forwarded to FPGC-R after internal evaluation.',
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'Submission forwarded to FPGC-R', $2, 'WORKFLOW')
      `,
      [
        fpgcrUser.id,
        `The submission "${submission.title}" has been forwarded for FPGC-R review.`,
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'Submission forwarded', $2, 'WORKFLOW')
      `,
      [
        submission.student_id,
        `Your submission "${submission.title}" has been forwarded to FPGC-R.`,
      ]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'HOD_FORWARDED_TO_FPGCR', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        {
          ...updatedResult.rows[0],
          assigned_fpgcr_id: fpgcrUser.id,
          assigned_fpgcr_name: fpgcrUser.name,
        },
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message: 'Submission forwarded to FPGC-R successfully.',
      submission: updatedResult.rows[0],
      assigned_to: fpgcrUser,
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not forward submission to FPGC-R.', 500, err.message);
  } finally {
    client.release();
  }
});

// POST /api/v1/submissions/:id/fpgcr/forward-fpgc
router.post('/:id/fpgcr/forward-fpgc', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { comments } = req.body || {};

    if (!req.user.roles.includes('FPGC_R')) {
      await client.query('rollback');
      return error(req, res, 'Only FPGC-R users can forward submissions to FPGC.', 403);
    }

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (submission.current_state !== 'FORWARDED_TO_FPGCR') {
      await client.query('rollback');
      return error(
        req,
        res,
        'Only submissions forwarded to FPGC-R can be forwarded to FPGC.',
        409
      );
    }

    const taskResult = await client.query(
      `
      select *
      from workflow_tasks
      where submission_id = $1
        and assigned_to = $2
        and assigned_role = 'FPGC_R'
        and status = 'OPEN'
      order by created_at desc
      limit 1
      `,
      [submission.id, req.user.id]
    );

    if (taskResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'No open FPGC-R review task found for this user.', 403);
    }

    const fpgcResult = await client.query(
      `
      select
        u.id,
        u.name,
        u.email
      from users u
      inner join user_roles ur on ur.user_id = u.id
      inner join roles r on r.id = ur.role_id
      where r.code = 'FPGC'
        and u.status = 'ACTIVE'
      order by u.name asc
      limit 1
      `
    );

    if (fpgcResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'No active FPGC user found.', 404);
    }

    const fpgcUser = fpgcResult.rows[0];

    const updatedResult = await client.query(
      `
      update submissions
      set current_state = 'FORWARDED_TO_FPGC',
          updated_by = $1,
          updated_at = now()
      where id = $2
      returning *
      `,
      [req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = 'FORWARDED_TO_FPGC'
      where submission_id = $1
      `,
      [submission.id]
    );

    await client.query(
      `
      update workflow_tasks
      set status = 'COMPLETED',
          completed_at = now()
      where id = $1
      `,
      [taskResult.rows[0].id]
    );

    await client.query(
      `
      insert into workflow_tasks
        (submission_id, assigned_to, assigned_role, task_type, status, due_at)
      values
        ($1, $2, 'FPGC', 'FPGC_REVIEW', 'OPEN', now() + interval '14 days')
      `,
      [submission.id, fpgcUser.id]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, 'FORWARDED_TO_FPGC', 'FPGCR_FORWARD_FPGC', $3, $4, $5)
      `,
      [
        submission.id,
        submission.current_state,
        req.user.id,
        comments || 'Forwarded to FPGC for final review.',
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'Submission forwarded to FPGC', $2, 'WORKFLOW')
      `,
      [
        fpgcUser.id,
        `The submission "${submission.title}" has been forwarded for FPGC review.`,
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'Submission forwarded to FPGC', $2, 'WORKFLOW')
      `,
      [
        submission.student_id,
        `Your submission "${submission.title}" has been forwarded to FPGC.`,
      ]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'FPGCR_FORWARDED_TO_FPGC', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        {
          ...updatedResult.rows[0],
          assigned_fpgc_id: fpgcUser.id,
          assigned_fpgc_name: fpgcUser.name,
        },
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message: 'Submission forwarded to FPGC successfully.',
      submission: updatedResult.rows[0],
      assigned_to: fpgcUser,
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not forward submission to FPGC.', 500, err.message);
  } finally {
    client.release();
  }
});

// POST /api/v1/submissions/:id/fpgc/final-decision
router.post('/:id/fpgc/final-decision', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { decision, comments } = req.body || {};
    const cleanDecision = String(decision || '').toUpperCase();

    if (!['APPROVE', 'REJECT'].includes(cleanDecision)) {
      await client.query('rollback');
      return error(req, res, 'decision must be APPROVE or REJECT.', 422);
    }

    if (!comments || !comments.trim()) {
      await client.query('rollback');
      return error(req, res, 'FPGC decision comments are required.', 422);
    }

    if (!req.user.roles.includes('FPGC')) {
      await client.query('rollback');
      return error(req, res, 'Only FPGC users can make the final decision.', 403);
    }

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (submission.current_state !== 'FORWARDED_TO_FPGC') {
      await client.query('rollback');
      return error(
        req,
        res,
        'Only submissions forwarded to FPGC can receive a final decision.',
        409
      );
    }

    const taskResult = await client.query(
      `
      select *
      from workflow_tasks
      where submission_id = $1
        and assigned_to = $2
        and assigned_role = 'FPGC'
        and status = 'OPEN'
      order by created_at desc
      limit 1
      `,
      [submission.id, req.user.id]
    );

    if (taskResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'No open FPGC review task found for this user.', 403);
    }

    const nextState = cleanDecision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    const actionCode =
      cleanDecision === 'APPROVE'
        ? 'FPGC_FINAL_APPROVE'
        : 'FPGC_FINAL_REJECT';

    const updatedResult = await client.query(
      `
      update submissions
      set current_state = $1,
          updated_by = $2,
          updated_at = now()
      where id = $3
      returning *
      `,
      [nextState, req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = $1
      where submission_id = $2
      `,
      [nextState, submission.id]
    );

    await client.query(
      `
      update workflow_tasks
      set status = 'COMPLETED',
          completed_at = now()
      where id = $1
      `,
      [taskResult.rows[0].id]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        submission.id,
        submission.current_state,
        nextState,
        actionCode,
        req.user.id,
        comments.trim(),
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, $2, $3, 'WORKFLOW')
      `,
      [
        submission.student_id,
        cleanDecision === 'APPROVE'
          ? 'Submission approved'
          : 'Submission rejected',
        comments.trim(),
      ]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, $2, 'submission', $3, $4, $5, $6)
      `,
      [
        req.user.id,
        cleanDecision === 'APPROVE'
          ? 'FPGC_FINAL_APPROVAL'
          : 'FPGC_FINAL_REJECTION',
        submission.id,
        submission,
        updatedResult.rows[0],
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message:
        cleanDecision === 'APPROVE'
          ? 'Submission approved successfully.'
          : 'Submission rejected successfully.',
      submission: updatedResult.rows[0],
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not save FPGC final decision.', 500, err.message);
  } finally {
    client.release();
  }
});

// POST /api/v1/submissions/:id/fpgc/assign-external-evaluator
router.post('/:id/fpgc/assign-external-evaluator', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { evaluator_id, comments } = req.body || {};

    if (!evaluator_id) {
      await client.query('rollback');
      return error(req, res, 'evaluator_id is required.', 422);
    }

    if (!req.user.roles.includes('FPGC')) {
      await client.query('rollback');
      return error(req, res, 'Only FPGC users can assign external evaluators.', 403);
    }

    const evaluatorResult = await client.query(
      `
      select
        u.id,
        u.name,
        u.email,
        coalesce(json_agg(r.code) filter (where r.code is not null), '[]') as roles
      from users u
      left join user_roles ur on ur.user_id = u.id
      left join roles r on r.id = ur.role_id
      where u.id = $1
      group by u.id
      `,
      [evaluator_id]
    );

    if (evaluatorResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'External evaluator not found.', 404);
    }

    const evaluator = evaluatorResult.rows[0];

    if (!evaluator.roles.includes('EXTERNAL_EVALUATOR')) {
      await client.query('rollback');
      return error(req, res, 'Selected user is not an external evaluator.', 422);
    }

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (!['FORWARDED_TO_FPGC', 'APPROVED'].includes(submission.current_state)) {
      await client.query('rollback');
      return error(
        req,
        res,
        'Only submissions forwarded to FPGC or approved by FPGC can be assigned to an external evaluator.',
        409
      );
    }

    const updatedResult = await client.query(
      `
      update submissions
      set current_state = 'EXTERNAL_EVAL_ASSIGNED',
          updated_by = $1,
          updated_at = now()
      where id = $2
      returning *
      `,
      [req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = 'EXTERNAL_EVAL_ASSIGNED'
      where submission_id = $1
      `,
      [submission.id]
    );

    await client.query(
      `
      insert into workflow_tasks
        (submission_id, assigned_to, assigned_role, task_type, status, due_at)
      values
        ($1, $2, 'EXTERNAL_EVALUATOR', 'EXTERNAL_EVALUATION', 'OPEN', now() + interval '21 days')
      `,
      [submission.id, evaluator.id]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, 'EXTERNAL_EVAL_ASSIGNED', 'FPGC_ASSIGN_EXTERNAL_EVALUATOR', $3, $4, $5)
      `,
      [
        submission.id,
        submission.current_state,
        req.user.id,
        comments || `Assigned to external evaluator ${evaluator.name}.`,
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'External evaluation assigned', $2, 'WORKFLOW')
      `,
      [
        evaluator.id,
        `You have been assigned to externally evaluate "${submission.title}".`,
      ]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'FPGC_ASSIGNED_EXTERNAL_EVALUATOR', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        {
          ...updatedResult.rows[0],
          external_evaluator_id: evaluator.id,
          external_evaluator_name: evaluator.name,
        },
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message: 'External evaluator assigned successfully.',
      submission: updatedResult.rows[0],
      evaluator,
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not assign external evaluator.', 500, err.message);
  } finally {
    client.release();
  }
});


// POST /api/v1/submissions/:id/external-evaluation/submit
router.post('/:id/external-evaluation/submit', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { grade, recommendation, comments } = req.body || {};
    const numericGrade = Number(grade);

    if (!req.user.roles.includes('EXTERNAL_EVALUATOR')) {
      await client.query('rollback');
      return error(req, res, 'Only external evaluators can submit external evaluations.', 403);
    }

    if (Number.isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      await client.query('rollback');
      return error(req, res, 'grade must be a number between 0 and 100.', 422);
    }

    if (!recommendation || !String(recommendation).trim()) {
      await client.query('rollback');
      return error(req, res, 'recommendation is required.', 422);
    }

    if (!comments || !String(comments).trim()) {
      await client.query('rollback');
      return error(req, res, 'comments are required.', 422);
    }

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (submission.current_state !== 'EXTERNAL_EVAL_ASSIGNED') {
      await client.query('rollback');
      return error(
        req,
        res,
        'Only externally assigned submissions can receive an external evaluation.',
        409
      );
    }

    const taskResult = await client.query(
      `
      select *
      from workflow_tasks
      where submission_id = $1
        and assigned_to = $2
        and assigned_role = 'EXTERNAL_EVALUATOR'
        and status = 'OPEN'
      order by created_at desc
      limit 1
      `,
      [submission.id, req.user.id]
    );

    if (taskResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'No open external evaluation task found for this user.', 403);
    }

    const updatedResult = await client.query(
      `
      update submissions
      set current_state = 'EXTERNAL_EVAL_COMPLETED',
          updated_by = $1,
          updated_at = now()
      where id = $2
      returning *
      `,
      [req.user.id, submission.id]
    );

    await client.query(
      `
      update workflow_instances
      set current_state = 'EXTERNAL_EVAL_COMPLETED'
      where submission_id = $1
      `,
      [submission.id]
    );

    await client.query(
      `
      update workflow_tasks
      set status = 'COMPLETED',
          completed_at = now()
      where id = $1
      `,
      [taskResult.rows[0].id]
    );

    await client.query(
      `
      insert into workflow_transitions
        (submission_id, from_state, to_state, action_code, actor_id, reason, correlation_id)
      values
        ($1, $2, 'EXTERNAL_EVAL_COMPLETED', 'EXTERNAL_EVALUATOR_SUBMIT_EVALUATION', $3, $4, $5)
      `,
      [
        submission.id,
        submission.current_state,
        req.user.id,
        `Grade: ${numericGrade}. Recommendation: ${recommendation}. ${comments}`,
        correlationId(req),
      ]
    );

    await client.query(
      `
      insert into notifications
        (user_id, title, message, category)
      values
        ($1, 'External evaluation completed', $2, 'WORKFLOW')
      `,
      [
        submission.student_id,
        `External evaluation completed for "${submission.title}".`,
      ]
    );

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'EXTERNAL_EVALUATION_SUBMITTED', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        {
          ...updatedResult.rows[0],
          external_grade: numericGrade,
          external_recommendation: recommendation,
          external_comments: comments,
        },
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message: 'External evaluation submitted successfully.',
      submission: updatedResult.rows[0],
      evaluation: {
        grade: numericGrade,
        recommendation,
        comments,
      },
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not submit external evaluation.', 500, err.message);
  } finally {
    client.release();
  }
});


// POST /api/v1/submissions/:id/external-evaluation/claim
router.post('/:id/external-evaluation/claim', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const { amount, bank_name, account_number, account_holder, comments } = req.body || {};

    if (!req.user.roles.includes('EXTERNAL_EVALUATOR')) {
      await client.query('rollback');
      return error(req, res, 'Only external evaluators can submit claims.', 403);
    }

    if (!amount || !bank_name || !account_number || !account_holder) {
      await client.query('rollback');
      return error(req, res, 'amount, bank_name, account_number and account_holder are required.', 422);
    }

    const submissionResult = await client.query(
      `
      select *
      from submissions
      where id = $1
      `,
      [req.params.id]
    );

    if (submissionResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Submission not found.', 404);
    }

    const submission = submissionResult.rows[0];

    if (submission.current_state !== 'EXTERNAL_EVAL_COMPLETED') {
      await client.query('rollback');
      return error(
        req,
        res,
        'Claims can only be submitted after external evaluation is completed.',
        409
      );
    }

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'EXTERNAL_EVALUATOR_CLAIM_SUBMITTED', 'submission', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        submission.id,
        submission,
        {
          submission_id: submission.id,
          amount,
          bank_name,
          account_holder,
          comments: comments || '',
          status: 'SUBMITTED',
        },
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      message: 'External evaluator claim submitted successfully.',
      claim: {
        submission_id: submission.id,
        amount,
        bank_name,
        account_number,
        account_holder,
        comments: comments || '',
        status: 'SUBMITTED',
      },
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not submit external evaluator claim.', 500, err.message);
  } finally {
    client.release();
  }
});

module.exports = router;