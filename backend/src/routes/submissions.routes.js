// backend/src/routes/submissions.routes.js

const express = require('express');
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

// GET /api/v1/submissions
router.get('/', async (req, res) => {
  try {
    const roles = req.user.roles || [];
    const params = [];

    let query = `
      select distinct
        s.*,
        wi.current_state as workflow_state
      from submissions s
      left join workflow_instances wi on wi.submission_id = s.id
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
    const { submission_type, title, description } = req.body;

    if (!submission_type || !title) {
      return error(req, res, 'submission_type and title are required.', 422);
    }

    await client.query('begin');

    const submissionResult = await client.query(
      `
      insert into submissions 
        (student_id, submission_type, title, description, current_state, created_by, updated_by)
      values 
        ($1, $2, $3, $4, 'DRAFT', $1, $1)
      returning *
      `,
      [req.user.id, submission_type, title, description || null]
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
        wi.current_state as workflow_state
      from submissions s
      left join workflow_instances wi on wi.submission_id = s.id
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