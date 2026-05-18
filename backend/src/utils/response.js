function correlationId(req) {
  return req.header('X-Correlation-ID') || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function success(req, res, data = {}, status = 200) {
  return res.status(status).json({
    data,
    meta: {
      correlation_id: correlationId(req),
    },
    errors: [],
  });
}

function error(req, res, message, status = 500, details = null) {
  return res.status(status).json({
    data: null,
    meta: {
      correlation_id: correlationId(req),
    },
    errors: [
      {
        message,
        details,
      },
    ],
  });
}

module.exports = {
  correlationId,
  success,
  error,
};