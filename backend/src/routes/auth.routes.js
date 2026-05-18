const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(req, res, 'Email and password are required.', 422);
    }

    const result = await pool.query(
      `
      select 
        u.id, u.name, u.email, u.password_hash, u.status,
        coalesce(json_agg(r.code) filter (where r.code is not null), '[]') as roles
      from users u
      left join user_roles ur on ur.user_id = u.id
      left join roles r on r.id = ur.role_id
      where lower(u.email) = lower($1)
      group by u.id
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return error(req, res, 'Invalid email address or password.', 401);
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return error(req, res, 'Invalid email address or password.', 401);
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      }
    );

    return success(req, res, {
      token,
      token_type: 'Bearer',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      roles: user.roles || [],
      permissions: [],
    });
  } catch (err) {
    return error(req, res, 'Login failed.', 500, err.message);
  }
});

router.post('/logout', auth, async (req, res) => {
  return success(req, res, {
    message: 'Logged out successfully.',
  });
});

router.get('/me', auth, async (req, res) => {
  return success(req, res, {
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },
    roles: req.user.roles || [],
    permissions: [],
  });
});

module.exports = router;