require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('../src/db');

async function seed() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const users = [
  { name: 'Student User', email: 'student@nust.na', role: 'STUDENT' },
  { name: 'Supervisor User', email: 'supervisor@nust.na', role: 'SUPERVISOR' },
  { name: 'HOD User', email: 'hod@nust.na', role: 'HOD' },
  { name: 'Internal Evaluator User', email: 'internal@nust.na', role: 'INTERNAL_EVALUATOR' },
  { name: 'External Evaluator User', email: 'external@nust.na', role: 'EXTERNAL_EVALUATOR' },
  { name: 'FPGC-R User', email: 'fpgcr@nust.na', role: 'FPGC_R' },
  { name: 'FPGC User', email: 'fpgc@nust.na', role: 'FPGC' },
  { name: 'Admin User', email: 'admin@nust.na', role: 'SYSTEM_ADMIN' },
  ];

  for (const user of users) {
    const userResult = await pool.query(
      `
      insert into users (name, email, password_hash)
      values ($1, $2, $3)
      on conflict (email)
      do update set name = excluded.name
      returning *
      `,
      [user.name, user.email, passwordHash]
    );

    const roleResult = await pool.query(
      `select id from roles where code = $1`,
      [user.role]
    );

    await pool.query(
      `
      insert into user_roles (user_id, role_id)
      values ($1, $2)
      on conflict do nothing
      `,
      [userResult.rows[0].id, roleResult.rows[0].id]
    );
  }

  console.log('Seed complete.');
  console.log('Password for all test users: Password123!');

  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});