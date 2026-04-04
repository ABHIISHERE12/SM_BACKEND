const { validationResult } = require('express-validator');
const { sendError } = require('../utils/apiResponse');

// Runs after express-validator chains — returns 422 if errors exist
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
    }));
    return sendError(res, 422, 'Validation failed', formatted);
  }
  next();
};

module.exports = { validate };
