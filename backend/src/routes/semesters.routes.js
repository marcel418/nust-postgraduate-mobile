const express = require('express');
const pool = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

router.use(auth);
router.use(requireRole('SYSTEM_ADMIN', 'FPGC'));

function trimValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `
      select
        s.id,
        s.label,
        s.start_date,
        s.end_date,
        coalesce(s.is_active, false) as is_active
      from academic_semesters s
      order by s.id desc
      `
    );

    return success(req, res, {
      items: result.rows,
    });
  } catch (err) {
    return error(req, res, 'Could not fetch semesters.', 500, err.message);
  }
});

router.post('/', async (req, res) => {
  try {
    const label = trimValue(req.body?.label);
    const startDate = trimValue(req.body?.start_date);
    const endDate = trimValue(req.body?.end_date);

    if (!label || !startDate || !endDate) {
      return error(req, res, 'label, start_date and end_date are required.', 422);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return error(req, res, 'start_date and end_date must be valid dates.', 422);
    }

    if (start.getTime() >= end.getTime()) {
      return error(req, res, 'start_date must be before end_date.', 422);
    }

    const duplicateResult = await pool.query(
      `
      select id
      from academic_semesters
      where lower(label) = lower($1)
      limit 1
      `,
      [label]
    );

    if (duplicateResult.rowCount > 0) {
      return error(req, res, 'Semester label already exists.', 409);
    }

    const insertResult = await pool.query(
      `
      insert into academic_semesters (label, start_date, end_date, is_active)
      values ($1, $2, $3, false)
      returning id, label, start_date, end_date, is_active
      `,
      [label, startDate, endDate]
    );

    return success(req, res, {
      semester: insertResult.rows[0],
    }, 201);
  } catch (err) {
    return error(req, res, 'Could not create semester.', 500, err.message);
  }
});

router.patch('/:id/activate', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('begin');

    const semesterResult = await client.query(
      `
      select id, label, start_date, end_date, is_active
      from academic_semesters
      where id = $1
      for update
      `,
      [req.params.id]
    );

    if (semesterResult.rowCount === 0) {
      await client.query('rollback');
      return error(req, res, 'Semester not found.', 404);
    }

    const semester = semesterResult.rows[0];

    await client.query(
      `update academic_semesters set is_active = false where is_active = true`
    );

    const activateResult = await client.query(
      `
      update academic_semesters
      set is_active = true
      where id = $1
      returning id, label, start_date, end_date, is_active
      `,
      [semester.id]
    );

    await client.query('commit');

    return success(req, res, {
      semester: activateResult.rows[0],
    });
  } catch (err) {
    await client.query('rollback');
    return error(req, res, 'Could not activate semester.', 500, err.message);
  } finally {
    client.release();
  }
});

module.exports = router;