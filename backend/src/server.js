// backend/src/server.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const usersRoutes = require('./routes/users.routes');

const authRoutes = require('./routes/auth.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const documentsRoutes = require('./routes/documents.routes');

const { success, error } = require('./utils/response');

const app = express();

const port = process.env.PORT || 8080;

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use(cors());

app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true }));

// Simple request logger.
// This helps confirm exactly what endpoint PowerShell/mobile is hitting.
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// Route Debugging
// ─────────────────────────────────────────────────────────────────────────────

function listRoutes(label, router) {
  const routes = router.stack
    .filter((layer) => layer.route)
    .map((layer) => {
      const methods = Object.keys(layer.route.methods)
        .join(',')
        .toUpperCase();

      return `${methods} ${layer.route.path}`;
    });

  console.log(`Loaded ${label} routes:`, routes);
}

listRoutes('auth', authRoutes);
listRoutes('submissions', submissionsRoutes);
listRoutes('notifications', notificationsRoutes);
listRoutes('documents', documentsRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/v1/health', (req, res) => {
  return success(req, res, {
    status: 'ok',
    service: 'NUST Mobile Backend',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// API Routes
// IMPORTANT: These must stay above the 404 handler.
// ─────────────────────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/submissions', submissionsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/documents', documentsRoutes);

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res) => {
  return error(req, res, 'Route not found.', 404, {
    method: req.method,
    path: req.originalUrl,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  return error(req, res, 'Internal server error.', 500, {
    message: err.message,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

app.listen(port, '0.0.0.0', () => {
  console.log(`NUST Mobile Backend running on http://0.0.0.0:${port}`);
});