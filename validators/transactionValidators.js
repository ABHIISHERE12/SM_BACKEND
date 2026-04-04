const { body } = require('express-validator');

const INCOME_CATEGORIES = ['salary', 'freelance', 'investment', 'gift', 'other_income'];
const EXPENSE_CATEGORIES = [
  'food', 'transport', 'housing', 'healthcare', 'entertainment',
  'shopping', 'education', 'utilities', 'savings_deposit', 'other_expense',
];
const ALL_CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

const transactionValidator = [
  body('type')
    .notEmpty().withMessage('Transaction type is required')
    .isIn(['income', 'expense']).withMessage('Type must be income or expense'),

  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),

  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),

  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn(ALL_CATEGORIES).withMessage('Invalid category'),

  body('date')
    .optional()
    .isISO8601().withMessage('Date must be a valid ISO 8601 date'),

  body('goal')
    .optional({ nullable: true })
    .isMongoId().withMessage('Goal must be a valid ID'),
];

module.exports = { transactionValidator, INCOME_CATEGORIES, EXPENSE_CATEGORIES };
