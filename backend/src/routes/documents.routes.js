const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const pool = require('../db');
const { auth } = require('../middleware/auth');
const { success, error } = require('../utils/response');

const router = express.Router();

router.use(auth);

const uploadsDir = path.resolve(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function safeFileName(originalName) {
  const ext = path.extname(originalName || '').toLowerCase();
  const base = path
    .basename(originalName || 'document', ext)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .slice(0, 80);

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${base}${ext}`;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, safeFileName(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();

    const allowedExtensions = ['.pdf', '.docx'];
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ];

    if (
      allowedExtensions.includes(ext) &&
      allowedMimeTypes.includes(file.mimetype)
    ) {
      return cb(null, true);
    }

    return cb(
      new Error('Only PDF and DOCX files are allowed.'),
      false
    );
  },
});

function uploadSingleFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      return error(req, res, 'File is too large. Maximum size is 20MB.', 413);
    }

    return error(req, res, err.message || 'Could not upload file.', 422);
  });
}

router.post('/upload-url', async (req, res) => {
  return success(req, res, {
    message: 'For MVP, use direct multipart upload endpoint.',
    upload_type: 'multipart',
    endpoint: '/api/v1/documents/upload',
  });
});

router.post('/upload', uploadSingleFile, async (req, res) => {
  try {
    if (!req.file) {
      return error(req, res, 'File is required.', 422);
    }

    const storageKey = `uploads/${req.file.filename}`;

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

    return success(
      req,
      res,
      {
        document: result.rows[0],
        message: 'Document uploaded successfully.',
      },
      201
    );
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return error(req, res, 'Could not upload document.', 500, err.message);
  }
});

router.get('/:id/download-url', async (req, res) => {
  try {
    const result = await pool.query(
      `
      select *
      from documents
      where id = $1
      `,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return error(req, res, 'Document not found.', 404);
    }

    return success(req, res, {
      document: result.rows[0],
      download_url: `/api/v1/documents/${req.params.id}/download`,
      message: 'Use this authenticated download endpoint to retrieve the file.',
    });
  } catch (err) {
    return error(req, res, 'Could not create download URL.', 500, err.message);
  }
});

router.get('/:id/download', async (req, res) => {
  try {
    const result = await pool.query(
      `
      select *
      from documents
      where id = $1
      `,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return error(req, res, 'Document not found.', 404);
    }

    const document = result.rows[0];

    const absolutePath = path.resolve(__dirname, '../..', document.storage_key);
    const allowedRoot = path.resolve(__dirname, '../../uploads');

    if (!absolutePath.startsWith(allowedRoot)) {
      return error(req, res, 'Invalid document path.', 403);
    }

    if (!fs.existsSync(absolutePath)) {
      return error(req, res, 'File not found on server.', 404);
    }

    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.original_filename}"`
    );

    return res.sendFile(absolutePath);
  } catch (err) {
    return error(req, res, 'Could not download document.', 500, err.message);
  }
});

router.post('/submissions/:submissionId/documents', async (req, res) => {
  return error(req, res, 'Use POST /api/v1/submissions/:id/documents instead.', 404);
});

module.exports = router;