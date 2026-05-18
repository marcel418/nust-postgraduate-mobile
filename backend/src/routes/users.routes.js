// backend/src/routes/users.routes.js

const express = require('express');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

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

module.exports = router;