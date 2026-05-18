require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const submissionsRoutes = require('./routes/submissions.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const documentsRoutes = require('./routes/documents.routes');
const { success, error } = require('./utils/response');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/v1/health', (req, res) => {
  return success(req, res, {
    status: 'ok',
    service: 'NUST Mobile Backend',
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/submissions', submissionsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/documents', documentsRoutes);

app.use((req, res) => {
  return error(req, res, 'Route not found.', 404);
});

const port = process.env.PORT || 8080;

app.listen(port, '0.0.0.0', () => {
  console.log(`NUST Mobile Backend running on http://0.0.0.0:${port}`);
});