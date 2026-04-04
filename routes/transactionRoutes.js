const express = require("express");
const router = express.Router();

const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  monthlySummary,
} = require("../controller/transactionController");
const { protect } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { transactionValidator } = require("../validators/transactionValidators");

router.use(protect);

router.get("/summary/monthly", monthlySummary);

router
  .route("/")
  .get(getTransactions)
  .post(transactionValidator, validate, createTransaction);

router
  .route("/:id")
  .get(getTransaction)
  .put(transactionValidator, validate, updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
