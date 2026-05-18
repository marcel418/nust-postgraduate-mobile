const express = require('express');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `
      select *
      from notifications
      where user_id = $1
      order by created_at desc
      limit 50
      `,
      [req.user.id]
    );

    return success(req, res, {
      items: result.rows,
    });
  } catch (err) {
    return error(req, res, 'Could not fetch notifications.', 500, err.message);
  }
});

router.post('/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      `
      update notifications
      set read_at = now()
      where id = $1 and user_id = $2
      returning *
      `,
      [req.params.id, req.user.id]
    );

    if (result.rowCount === 0) {
      return error(req, res, 'Notification not found.', 404);
    }

    return success(req, res, {
      notification: result.rows[0],
    });
  } catch (err) {
    return error(req, res, 'Could not mark notification as read.', 500, err.message);
  }
});

module.exports = router;