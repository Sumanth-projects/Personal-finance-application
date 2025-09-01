import { body, query, param, validationResult } from 'express-validator';

// Validation result handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// User validation rules
export const validateUserRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  handleValidationErrors
];

export const validateUserLogin = [
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Transaction validation rules
export const validateTransaction = [
  body('type')
    .isIn(['income', 'expense'])
    .withMessage('Type must be either income or expense'),
  
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  
  body('categoryId')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  
  body('categoryName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name must be between 1 and 50 characters'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name must be between 1 and 50 characters'),
  
  // Receipt-related optional fields
  body('receiptFileInfo')
    .optional()
    .isObject()
    .withMessage('Receipt file info must be an object'),
  
  body('receiptFileInfo.tempFileId')
    .optional()
    .isString()
    .withMessage('Receipt temp file ID must be a string'),
  
  body('receiptFileInfo.originalName')
    .optional()
    .isString()
    .withMessage('Receipt original name must be a string'),
  
  body('receiptData')
    .optional()
    .isObject()
    .withMessage('Receipt data must be an object'),
  
  body('receiptData.storeName')
    .optional()
    .isString()
    .withMessage('Store name must be a string'),
  
  body('receiptData.total')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Receipt total must be a positive number'),
  
  // Custom validation to ensure either categoryId, categoryName, or category is provided
  body().custom((value, { req }) => {
    const hasCategory = req.body.categoryId || req.body.categoryName || req.body.category;
    if (!hasCategory) {
      throw new Error('Either categoryId, categoryName, or category is required');
    }
    
    // Count how many category fields are provided
    const categoryFields = [req.body.categoryId, req.body.categoryName, req.body.category].filter(Boolean);
    if (categoryFields.length > 1) {
      throw new Error('Provide only one: categoryId, categoryName, or category');
    }
    return true;
  }),
  
  // Custom validation for receipt consistency
  body().custom((value, { req }) => {
    const hasReceiptFileInfo = req.body.receiptFileInfo;
    const hasReceiptData = req.body.receiptData;
    
    // If one is provided, both should be provided
    if ((hasReceiptFileInfo && !hasReceiptData) || (!hasReceiptFileInfo && hasReceiptData)) {
      throw new Error('Both receiptFileInfo and receiptData must be provided together');
    }
    return true;
  }),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'credit_card', 'debit_card', 'bank_transfer', 'digital_wallet', 'check', 'other'])
    .withMessage('Invalid payment method'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Each tag cannot exceed 20 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  handleValidationErrors
];

// Category validation rules
export const validateCategory = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ max: 50 })
    .withMessage('Category name cannot exceed 50 characters'),
  
  body('type')
    .isIn(['income', 'expense', 'both'])
    .withMessage('Type must be income, expense, or both'),
  
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  
  body('parentCategory')
    .optional()
    .isMongoId()
    .withMessage('Invalid parent category ID'),
  
  handleValidationErrors
];

// Query validation rules
export const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

// ID validation
export const validateObjectId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format'),
  
  handleValidationErrors
];
