const { body } = require("express-validator");

const goalValidator = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Goal title is required")
    .isLength({ max: 100 })
    .withMessage("Title cannot exceed 100 characters"),

  body("targetAmount")
    .notEmpty()
    .withMessage("Target amount is required")
    .isFloat({ min: 1 })
    .withMessage("Target amount must be at least 1"),

  body("deadline")
    .notEmpty()
    .withMessage("Deadline is required")
    .isISO8601()
    .withMessage("Deadline must be a valid date")
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error("Deadline must be a future date");
      }
      return true;
    }),

  body("category")
    .notEmpty()
    .withMessage("Category is required")
    .toLowerCase()
    .isIn([
      "emergency",
      "travel",
      "education",
      "home",
      "car",
      "retirement",
      "other",
    ])
    .withMessage("Invalid category"),

  body("currentAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Current amount cannot be negative"),
];

module.exports = { goalValidator };
