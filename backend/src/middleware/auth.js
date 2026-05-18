const jwt = require('jsonwebtoken');
const pool = require('../db');
const { error } = require('../utils/response');

async function auth(req, res, next) {
  try {
    const header = req.header('Authorization');

    if (!header || !header.startsWith('Bearer ')) {
      return error(req, res, 'Missing Bearer token.', 401);
    }

    const token = header.replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const userResult = await pool.query(
      `
      select 
        u.id, u.name, u.email, u.status,
        coalesce(json_agg(r.code) filter (where r.code is not null), '[]') as roles
      from users u
      left join user_roles ur on ur.user_id = u.id
      left join roles r on r.id = ur.role_id
      where u.id = $1
      group by u.id
      `,
      [payload.sub]
    );

    if (userResult.rowCount === 0) {
      return error(req, res, 'User not found.', 401);
    }

    req.user = userResult.rows[0];
    next();
  } catch (err) {
    return error(req, res, 'Invalid or expired token.', 401);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const roles = req.user?.roles || [];

    const hasRole = roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return error(req, res, 'Forbidden.', 403);
    }

    next();
  };
}

module.exports = {
  auth,
  requireRole,
};