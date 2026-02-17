import { body, validationResult } from 'express-validator';

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Login validation rules (LENIENT - won't break existing users)
export const validateLogin = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username or email is required')
    .escape(), // Sanitize to prevent XSS
  body('password')
    .notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

// Buyer registration validation rules (LENIENT)
export const validateBuyerRegister = [
  body('firstName')
    .optional()
    .trim()
    .escape(),
  body('lastName')
    .optional()
    .trim()
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional()
    .trim()
    .escape(),
  body('whatsappNo')
    .optional()
    .trim()
    .escape(),
  handleValidationErrors
];

// Seller registration validation rules (LENIENT)
export const validateSellerRegister = [
  body('firstName')
    .optional()
    .trim()
    .escape(),
  body('lastName')
    .optional()
    .trim()
    .escape(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('businessName')
    .optional()
    .trim()
    .escape(),
  body('phone')
    .optional()
    .trim()
    .escape(),
  handleValidationErrors
];

// OTP send validation (LENIENT)
export const validateSendOTP = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email or phone number is required')
    .escape(),
  body('userType')
    .optional()
    .trim()
    .isIn(['buyer', 'seller', 'admin']).withMessage('Invalid user type'),
  handleValidationErrors
];

// OTP verify validation (LENIENT)
export const validateVerifyOTP = [
  body('identifier')
    .trim()
    .notEmpty().withMessage('Email or phone number is required')
    .escape(),
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 4, max: 8 }).withMessage('Invalid OTP format'),
  body('userType')
    .optional()
    .trim()
    .isIn(['buyer', 'seller', 'admin']).withMessage('Invalid user type'),
  handleValidationErrors
];

// Password reset validation (LENIENT)
export const validatePasswordReset = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .toLowerCase(),
  body('userType')
    .optional()
    .trim()
    .isIn(['buyer', 'seller', 'admin']).withMessage('Invalid user type'),
  handleValidationErrors
];

// New password validation (LENIENT)
export const validateNewPassword = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword')
    .optional()
    .custom((value, { req }) => {
      if (value && value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
  handleValidationErrors
];

export default {
  validateLogin,
  validateBuyerRegister,
  validateSellerRegister,
  validateSendOTP,
  validateVerifyOTP,
  validatePasswordReset,
  validateNewPassword,
  handleValidationErrors
};
