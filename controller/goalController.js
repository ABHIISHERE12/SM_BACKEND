// @desc    Cancel a pending withdrawal
// @route   POST /api/goals/:goalId/withdrawals/:transactionId/cancel
// @access  Private
const cancelWithdrawal = async (req, res, next) => {
  try {
    const { goalId, transactionId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    // Find the transaction
    const transaction = await Transaction.findOne({
      _id: transactionId,
      user: userId,
      goal: goalId,
      status: "pending",
    });
    if (!transaction) {
      return sendError(
        res,
        404,
        "Pending withdrawal not found or already processed.",
      );
    }

    // Mark as cancelled
    transaction.status = "cancelled";
    transaction.cancellationReason = reason || "User cancelled";
    await transaction.save();

    // Return funds to goal
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (goal) {
      goal.currentAmount += transaction.amount;
      await goal.save();
    }

    return sendSuccess(
      res,
      200,
      "Withdrawal cancelled and funds returned to goal.",
      {
        transaction,
        goal,
      },
    );
  } catch (error) {
    next(error);
  }
};
const Goal = require("../models/Goal");
const Transaction = require("../models/Transaction");
const { sendSuccess, sendError } = require("../utils/apiResponse");

// @desc    Get all goals for logged-in user
// @route   GET /api/goals
// @access  Private
const getGoals = async (req, res, next) => {
  try {
    const { status, category, sort = "-createdAt" } = req.query;
    const filter = { user: req.user.id };

    if (status) filter.status = status;
    if (category) filter.category = category;

    const goals = await Goal.find(filter).sort(sort);

    // Check and notify nearing deadline goals
    const nearingDeadline = goals.filter((g) => g.isNearingDeadline);

    return sendSuccess(res, 200, "Goals fetched", {
      count: goals.length,
      nearingDeadlineCount: nearingDeadline.length,
      goals,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single goal
// @route   GET /api/goals/:id
// @access  Private
const getGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });
    if (!goal) return sendError(res, 404, "Goal not found");
    return sendSuccess(res, 200, "Goal fetched", { goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new goal
// @route   POST /api/goals
// @access  Private
const createGoal = async (req, res, next) => {
  try {
    const goal = await Goal.create({ ...req.body, user: req.user.id });
    return sendSuccess(res, 201, "Goal created", { goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a goal
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true },
    );
    if (!goal) return sendError(res, 404, "Goal not found");
    return sendSuccess(res, 200, "Goal updated", { goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a goal
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!goal) return sendError(res, 404, "Goal not found");

    // Unlink transactions attached to this goal
    await Transaction.updateMany(
      { goal: req.params.id },
      { $set: { goal: null } },
    );

    return sendSuccess(res, 200, "Goal deleted");
  } catch (error) {
    next(error);
  }
};

// @desc    Deposit/withdraw amount to a goal
// @route   PATCH /api/goals/:id/contribute
// @access  Private
const contributeToGoal = async (req, res, next) => {
  try {
    const { amount, operation = "add" } = req.body;
    if (!amount || amount <= 0)
      return sendError(res, 400, "Amount must be greater than 0");

    const goal = await Goal.findOne({ _id: req.params.id, user: req.user.id });
    if (!goal) return sendError(res, 404, "Goal not found");

    if (operation === "add") {
      goal.currentAmount = Math.min(
        goal.currentAmount + amount,
        goal.targetAmount,
      );
    } else if (operation === "subtract") {
      goal.currentAmount = Math.max(goal.currentAmount - amount, 0);
    } else {
      return sendError(res, 400, "Operation must be add or subtract");
    }

    await goal.save();
    return sendSuccess(res, 200, "Goal contribution updated", { goal });
  } catch (error) {
    next(error);
  }
};

// @desc    Withdraw amount from a goal (with 80% lock validation)
// @route   POST /api/goals/:id/withdraw
// @access  Private
const withdrawFromGoal = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const goalId = req.params.id;
    const userId = req.user.id;

    // Validate amount
    if (!amount || amount <= 0) {
      return sendError(res, 400, "Withdrawal amount must be greater than 0");
    }

    // Find goal and verify ownership
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      return sendError(res, 404, "Goal not found");
    }

    // Validate withdrawal amount doesn't exceed current amount
    if (amount > goal.currentAmount) {
      return sendError(
        res,
        400,
        "Withdrawal amount exceeds current goal balance",
      );
    }

    // Calculate progress percentage
    const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100;

    // Check if progress is at least 80%
    if (progressPercentage < 80) {
      return sendError(
        res,
        403,
        "You cannot withdraw until you reach at least 80% of your savings goal.",
        {
          progressPercentage: Math.round(progressPercentage),
          currentAmount: goal.currentAmount,
          targetAmount: goal.targetAmount,
          requiredAmount:
            Math.ceil((goal.targetAmount * 80) / 100) - goal.currentAmount,
          locked: true,
        },
      );
    }

    // Deduct immediately
    goal.currentAmount -= amount;
    await goal.save();

    // Create a pending withdrawal transaction with 48-hour cooldown
    const cooldownExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours from now
    const transaction = await Transaction.create({
      user: userId,
      type: "expense",
      amount,
      description: `Withdrawal from goal: ${goal.title}`,
      category: "savings_deposit",
      goal: goal._id,
      status: "pending",
      cooldownExpiry,
    });

    return sendSuccess(
      res,
      200,
      "Withdrawal initiated. Funds will be available in wallet after 48 hours unless cancelled.",
      {
        transaction,
        cooldownExpiry,
        goal,
      },
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  contributeToGoal,
  withdrawFromGoal,
  cancelWithdrawal,
};
