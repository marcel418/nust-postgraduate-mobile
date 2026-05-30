// backend/src/routes/users.routes.js

const express = require('express');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { success, error, correlationId } = require('../utils/response');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { role } = req.query;

    const params = [];
    let roleFilter = '';

    if (role) {
      params.push(String(role).toUpperCase());
      roleFilter = 'where r.code = $1';
    }

    const result = await pool.query(
      `
      select
        u.id,
        u.name,
        u.email,
        u.status,
        coalesce(json_agg(r.code) filter (where r.code is not null), '[]') as roles
      from users u
      left join user_roles ur on ur.user_id = u.id
      left join roles r on r.id = ur.role_id
      ${roleFilter}
      group by u.id
      order by u.name asc
      `,
      params
    );

    return success(req, res, {
      items: result.rows,
    });
  } catch (err) {
    return error(req, res, 'Could not fetch users.', 500, err.message);
  }
});

router.patch('/:id', requireRole('SYSTEM_ADMIN'), async (req, res) => {
  const client = await pool.connect();

  try {
    const rawName = req.body?.name;
    const rawEmail = req.body?.email;
    const rawStatus = req.body?.status;

    const updates = {};
    const changedFields = {};

    if (rawStatus !== undefined) {
      return error(req, res, 'status is not editable in this endpoint.', 400);
    }

    if (rawName !== undefined) {
      const nextName = String(rawName).trim();

      if (!nextName) {
        return error(req, res, 'name must not be empty.', 422);
      }

      updates.name = nextName;
    }

    if (rawEmail !== undefined) {
      const nextEmail = String(rawEmail).trim();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!nextEmail || !emailPattern.test(nextEmail)) {
        return error(req, res, 'email must be a valid email address.', 422);
      }

      updates.email = nextEmail;
    }

    if (Object.keys(updates).length === 0) {
      return error(req, res, 'At least one field must be provided.', 422);
    }

    await client.query('begin');

    const existingResult = await client.query(
      `
      select
        id,
        name,
        email,
        status,
        updated_at
      from users
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (existingResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'User not found.', 404);
    }

    const currentUser = existingResult.rows[0];

    const existingEmailResult = updates.email !== undefined
      ? await client.query(
          `
          select id
          from users
          where lower(email) = lower($1)
            and id <> $2
          limit 1
          `,
          [updates.email, currentUser.id]
        )
      : { rowCount: 0 };

    if (existingEmailResult.rowCount > 0) {
      await client.query('rollback');
      return error(req, res, 'email must be unique.', 409);
    }

    ['name', 'email'].forEach((field) => {
      if (updates[field] !== undefined && String(updates[field]) !== String(currentUser[field])) {
        changedFields[field] = {
          old: currentUser[field],
          new: updates[field],
        };
      }
    });

    if (Object.keys(changedFields).length === 0) {
      await client.query('rollback');
      return success(req, res, {
        user: currentUser,
      });
    }

    const updateResult = await client.query(
      `
      update users
      set name = coalesce($1, name),
          email = coalesce($2, email),
          updated_at = now()
      where id = $3
      returning id, name, email, status, updated_at
      `,
      [updates.name || null, updates.email || null, currentUser.id]
    );

    const updatedUser = updateResult.rows[0];

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'USER_UPDATED', 'user', $2, $3, $4, $5)
      `,
      [
        req.user.id,
        currentUser.id,
        Object.fromEntries(Object.entries(changedFields).map(([key, value]) => [key, value.old])),
        Object.fromEntries(Object.entries(changedFields).map(([key, value]) => [key, value.new])),
        correlationId(req),
      ]
    );

    await client.query('commit');

    return success(req, res, {
      user: updatedUser,
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not update user.', 500, err.message);
  } finally {
    client.release();
  }
});

router.patch('/:id/status', requireRole('SYSTEM_ADMIN'), async (req, res) => {
  const client = await pool.connect();

  try {
    if (req.body?.name !== undefined || req.body?.email !== undefined) {
      return error(req, res, 'name and email are not editable in this endpoint.', 400);
    }

    const nextStatus = String(req.body?.status || '').trim().toUpperCase();

    if (!['ACTIVE', 'INACTIVE'].includes(nextStatus)) {
      return error(req, res, 'status must be ACTIVE or INACTIVE.', 422);
    }

    if (String(req.params.id) === String(req.user.id) && nextStatus === 'INACTIVE') {
      return error(req, res, 'You cannot deactivate your own account.', 400);
    }

    await client.query('begin');

    const existingResult = await client.query(
      `
      select id, name, email, status, updated_at
      from users
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (existingResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'User not found.', 404);
    }

    const currentUser = existingResult.rows[0];

    if (String(currentUser.status || '').toUpperCase() === nextStatus) {
      await client.query('rollback');
      return success(req, res, { user: currentUser });
    }

    const updateResult = await client.query(
      `
      update users
      set status = $1,
          updated_at = now()
      where id = $2
      returning id, name, email, status, updated_at
      `,
      [nextStatus, currentUser.id]
    );

    const updatedUser = updateResult.rows[0];

    await client.query(
      `
      insert into audit_logs
        (actor_id, event, entity_type, entity_id, old_values, new_values, correlation_id)
      values
        ($1, 'USER_STATUS_UPDATED', 'user', $2, $3, $4, $5)
      `,
      [req.user.id, currentUser.id, { status: currentUser.status }, { status: nextStatus }, correlationId(req)]
    );

    await client.query('commit');

    return success(req, res, {
      user: updatedUser,
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not update user status.', 500, err.message);
  } finally {
    client.release();
  }
});

module.exports = router;