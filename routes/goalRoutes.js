const express = require("express");
const router = express.Router();

const {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
  withdrawFromGoal,
  cancelWithdrawal,
} = require("../controller/goalController");
const { protect } = require("../middleware/auth");
const { validate } = require("../middleware/validate");
const { goalValidator } = require("../validators/goalValidators");

router.use(protect); // all goal routes are protected

// Cancel a pending withdrawal
router.post("/:goalId/withdrawals/:transactionId/cancel", cancelWithdrawal);

router.route("/").get(getGoals).post(goalValidator, validate, createGoal);

router
  .route("/:id")
  .get(getGoal)
  .put(goalValidator, validate, updateGoal)
  .delete(deleteGoal);

router.patch("/:id/contribute", contributeToGoal);
router.post("/:id/withdraw", withdrawFromGoal);

module.exports = router;
