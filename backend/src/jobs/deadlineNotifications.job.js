const cron = require('node-cron');
const pool = require('../db');

const DEADLINE_TRIGGERS = [
  {
    type: 'DUE_7_DAYS',
    daysBefore: 7,
    category: 'DEADLINE',
    title: 'Deadline reminder',
    message: (label) => `Your ${label} is due in 7 days.`,
  },
  {
    type: 'DUE_1_DAY',
    daysBefore: 1,
    category: 'DEADLINE',
    title: 'Deadline reminder',
    message: (label) => `Your ${label} is due tomorrow.`,
  },
  {
    type: 'DUE_TODAY',
    daysBefore: 0,
    category: 'DEADLINE',
    title: 'Deadline reminder',
    message: (label) => `Your ${label} is due today.`,
  },
  {
    type: 'OVERDUE',
    daysBefore: -1,
    category: 'OVERDUE',
    title: 'Deadline overdue',
    message: (label) => `Your ${label} is overdue. Please contact your supervisor.`,
  },
];

function getEffectiveDueDate(submission) {
  return submission?.extended_due_date || submission?.due_date || null;
}

function getCalendarDayDifference(referenceDate, dueDate) {
  const start = new Date(referenceDate);
  const end = new Date(dueDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / (24 * 60 * 60 * 1000));
}

function resolveTrigger(daysUntilDue) {
  return DEADLINE_TRIGGERS.find((trigger) => trigger.daysBefore === daysUntilDue) || null;
}

async function scheduleNotification(client, submission, userId, trigger) {
  const inserted = await client.query(
    `
    insert into notification_schedules
      (submission_id, user_id, trigger_type)
    values
      ($1, $2, $3)
    on conflict do nothing
    returning id
    `,
    [submission.id, userId, trigger.type]
  );

  if (inserted.rowCount === 0) {
    return false;
  }

  await client.query(
    `
    insert into notifications
      (user_id, title, message, category)
    values
      ($1, $2, $3, $4)
    `,
    [userId, trigger.title, trigger.message(submission.document_label || submission.title || 'submission'), trigger.category]
  );

  return true;
}

async function runDeadlineNotifications() {
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      select
        s.id,
        s.student_id,
        s.document_label,
        s.due_date,
        s.extended_due_date,
        s.current_state,
        u.supervisor_id
      from submissions s
      left join users u on u.id = s.student_id
      where s.current_state not in ('APPROVED', 'REJECTED')
        and coalesce(s.extended_due_date, s.due_date) is not null
      `
    );

    const now = new Date();

    for (const submission of result.rows) {
      const effectiveDueDate = getEffectiveDueDate(submission);

      if (!effectiveDueDate) {
        continue;
      }

      const daysUntilDue = getCalendarDayDifference(now, effectiveDueDate);

      if (daysUntilDue === null) {
        continue;
      }

      const trigger = resolveTrigger(daysUntilDue);

      if (!trigger) {
        continue;
      }

      await client.query('begin');

      try {
        await scheduleNotification(client, submission, submission.student_id, trigger);

        if (submission.supervisor_id) {
          await scheduleNotification(client, submission, submission.supervisor_id, trigger);
        }

        await client.query('commit');
      } catch (err) {
        await client.query('rollback');
        throw err;
      }
    }
  } finally {
    client.release();
  }
}

function registerDeadlineNotificationJob() {
  cron.schedule('0 8 * * *', async () => {
    try {
      await runDeadlineNotifications();
    } catch (err) {
      console.error('Deadline notification job failed:', err);
    }
  });

  return {
    runDeadlineNotifications,
  };
}

module.exports = {
  registerDeadlineNotificationJob,
  runDeadlineNotifications,
};