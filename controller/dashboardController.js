const Transaction = require("../models/Transaction");
const Goal = require("../models/Goal");
const { sendSuccess } = require("../utils/apiResponse");

// @desc    Full dashboard financial summary
// @route   GET /api/dashboard
// @access  Private
const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Run all queries in parallel for performance
    const [
      allTimeSummary,
      monthlySummary,
      goals,
      recentTransactions,
      categorySpending,
    ] = await Promise.all([
      // All-time income vs expense
      Transaction.aggregate([
        { $match: { user: userId } },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),

      // This month's income vs expense
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),

      // All active goals with progress
      Goal.find({ user: userId, status: "active" }).sort("-createdAt"),

      // Last 5 transactions
      Transaction.find({ user: userId })
        .sort("-date")
        .limit(5)
        .populate("goal", "title"),

      // Expense by category this month
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: "expense",
            date: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    // Build financial totals
    const buildTotals = (summary) => {
      const totals = { income: 0, expense: 0, net: 0 };
      summary.forEach((s) => (totals[s._id] = s.total));
      totals.net = totals.income - totals.expense;
      return totals;
    };

    const allTime = buildTotals(allTimeSummary);
    const thisMonth = buildTotals(monthlySummary);

    // Goals progress
    const goalsProgress = goals.map((g) => ({
      id: g._id,
      title: g.title,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount,
      progressPercentage: g.progressPercentage,
      daysRemaining: g.daysRemaining,
      isNearingDeadline: g.isNearingDeadline,
      category: g.category,
      deadline: g.deadline,
    }));

    // Budget alert
    const budgetLimit = req.user.monthlyBudget;
    const budgetStatus =
      budgetLimit > 0
        ? {
            limit: budgetLimit,
            spent: thisMonth.expense,
            remaining: budgetLimit - thisMonth.expense,
            percentUsed: Math.round((thisMonth.expense / budgetLimit) * 100),
            isOverBudget: thisMonth.expense > budgetLimit,
          }
        : null;

    // Notification alerts
    const notifications = goals
      .filter((g) => g.isNearingDeadline)
      .map((g) => ({
        type: "deadline_warning",
        goalId: g._id,
        title: g.title,
        message: `Your goal "${g.title}" is due in ${g.daysRemaining} day(s)!`,
        daysRemaining: g.daysRemaining,
      }));

    if (budgetStatus?.isOverBudget) {
      notifications.push({
        type: "budget_exceeded",
        message: `You've exceeded your monthly budget by $${(budgetStatus.spent - budgetStatus.limit).toFixed(2)}`,
      });
    }

    // Get pending and recent withdrawal transactions for wallet dashboard
    const withdrawalTransactions = await Transaction.find({
      user: userId,
      type: "expense",
      category: "savings_deposit",
      $or: [
        { status: "pending" },
        {
          status: "completed",
          cooldownExpiry: { $ne: null },
          updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        {
          status: "cancelled",
          cooldownExpiry: { $ne: null },
          updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      ],
    })
      .sort("-createdAt")
      .populate("goal", "title");

    return sendSuccess(res, 200, "Dashboard data", {
      allTime,
      thisMonth,
      goalsProgress,
      recentTransactions,
      categorySpending,
      budgetStatus,
      notifications,
      withdrawalTransactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Monthly trend (last 6 months)
// @route   GET /api/dashboard/trend
// @access  Private
const getMonthlyTrend = async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const trend = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    return sendSuccess(res, 200, "Monthly trend", { trend });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getMonthlyTrend };
