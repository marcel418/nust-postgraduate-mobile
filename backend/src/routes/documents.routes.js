const express = require('express');
const multer = require('multer');
const pool = require('../db');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

const router = express.Router();

router.use(auth);

router.post('/upload-url', async (req, res) => {
  return success(req, res, {
    message: 'For MVP, use direct multipart upload endpoint instead.',
    upload_type: 'multipart',
    endpoint: '/api/v1/documents/upload',
  });
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return error(req, res, 'File is required.', 422);
    }

    const storageKey = `uploads/${Date.now()}-${req.file.originalname}`;

    const result = await pool.query(
      `
      insert into documents
        (storage_key, original_filename, mime_type, size_bytes, uploaded_by, virus_scan_status)
      values
        ($1, $2, $3, $4, $5, 'NOT_SCANNED')
      returning *
      `,
      [
        storageKey,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        req.user.id,
      ]
    );

    return success(req, res, {
      document: result.rows[0],
      note: 'MVP stores metadata only. Add Supabase Storage upload next.',
    }, 201);
  } catch (err) {
    return error(req, res, 'Could not upload document.', 500, err.message);
  }
});

router.get('/:id/download-url', async (req, res) => {
  try {
    const result = await pool.query(
      `select * from documents where id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return error(req, res, 'Document not found.', 404);
    }

    return success(req, res, {
      document: result.rows[0],
      download_url: null,
      message: 'Supabase Storage signed download URL still to be implemented.',
    });
  } catch (err) {
    return error(req, res, 'Could not create download URL.', 500, err.message);
  }
});

router.post('/submissions/:submissionId/documents', async (req, res) => {
  return error(req, res, 'Use POST /api/v1/submissions/:id/documents instead.', 404);
});

module.exports = router;