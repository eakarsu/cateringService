const { body, param, query, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
}

const sanitizeString = (field) => body(field).optional().trim().escape();

const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  handleValidation
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidation
];

const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  handleValidation
];

const validatePasswordReset = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  handleValidation
];

const validatePasswordResetConfirm = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain a number'),
  handleValidation
];

const validateProfileUpdate = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty').escape(),
  body('phone').optional().trim().escape(),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  handleValidation
];

const validatePagination = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim(),
  query('sortBy').optional().trim(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  handleValidation
];

module.exports = {
  handleValidation,
  sanitizeString,
  validateRegistration,
  validateLogin,
  validatePasswordChange,
  validatePasswordReset,
  validatePasswordResetConfirm,
  validateProfileUpdate,
  validatePagination
};
