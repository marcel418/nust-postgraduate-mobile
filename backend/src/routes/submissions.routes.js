const express = require('express');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { success, error, correlationId } = require('../utils/response');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const roles = req.user.roles || [];
    const params = [];

    let where = '';

    if (roles.includes('STUDENT')) {
      params.push(req.user.id);
      where = 'where s.student_id = $1';
    }

    const result = await pool.query(
      `
      select 
        s.*,
        wi.current_state as workflow_state
      from submissions s
      left join workflow_instances wi on wi.submission_id = s.id
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

    return success(req, res, {
      submission,
    }, 201);
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not create submission.', 500, err.message);
  } finally {
    client.release();
  }
});

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

    return success(req, res, {
      submission: result.rows[0],
      allowed_actions: getAllowedActions(result.rows[0], req.user),
    });
  } catch (err) {
    return error(req, res, 'Could not fetch submission.', 500, err.message);
  }
});

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
      return error(req, res, 'Submission cannot be updated in its current state.', 409);
    }

    return success(req, res, {
      submission: result.rows[0],
    });
  } catch (err) {
    return error(req, res, 'Could not update submission.', 500, err.message);
  }
});

router.post('/:id/submit', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const submissionResult = await client.query(
      `
      select * from submissions
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
      return error(req, res, 'Submission cannot be submitted in its current state.', 409);
    }

    await client.query(
      `
      update submissions
      set current_state = 'SUBMITTED', updated_by = $1, updated_at = now()
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
      set is_locked = true, submitted_by = $1, submitted_at = now()
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
      [submission.id, submission.current_state, req.user.id, req.body.reason || null, correlationId(req)]
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

router.get('/:id/allowed-actions', async (req, res) => {
  try {
    const result = await pool.query(
      `select * from submissions where id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return error(req, res, 'Submission not found.', 404);
    }

    return success(req, res, {
      submission_id: req.params.id,
      allowed_actions: getAllowedActions(result.rows[0], req.user),
    });
  } catch (err) {
    return error(req, res, 'Could not fetch allowed actions.', 500, err.message);
  }
});

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

  if (roles.includes('HOD') && submission.current_state === 'SUBMITTED_BY_SUPERVISOR') {
    return ['ASSIGN_INTERNAL_EVALUATOR', 'RETURN'];
  }

  return [];
}

module.exports = router;