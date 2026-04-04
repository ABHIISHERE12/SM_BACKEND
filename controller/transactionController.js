const Transaction = require('../models/Transaction');
const Goal = require('../models/Goal');
const { sendSuccess, sendError } = require('../utils/apiResponse');

// @desc    Get all transactions (with optional filters)
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res, next) => {
  try {
    const { type, category, goal, startDate, endDate, page = 1, limit = 20, sort = '-date' } = req.query;
    const filter = { user: req.user.id };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (goal) filter.goal = goal;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .populate('goal', 'title category'),
      Transaction.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Transactions fetched', {
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id,
    }).populate('goal', 'title');
    if (!transaction) return sendError(res, 404, 'Transaction not found');
    return sendSuccess(res, 200, 'Transaction fetched', { transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Add transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res, next) => {
  try {
    const { goal: goalId, amount, type } = req.body;

    // If linking to a goal, verify ownership
    if (goalId) {
      const goal = await Goal.findOne({ _id: goalId, user: req.user.id });
      if (!goal) return sendError(res, 404, 'Linked goal not found');

      // Auto-update goal's currentAmount for savings_deposit
      if (type === 'income' || req.body.category === 'savings_deposit') {
        goal.currentAmount = Math.min(goal.currentAmount + amount, goal.targetAmount);
        await goal.save();
      }
    }

    const transaction = await Transaction.create({ ...req.body, user: req.user.id });
    return sendSuccess(res, 201, 'Transaction added', { transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!transaction) return sendError(res, 404, 'Transaction not found');
    return sendSuccess(res, 200, 'Transaction updated', { transaction });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!transaction) return sendError(res, 404, 'Transaction not found');
    return sendSuccess(res, 200, 'Transaction deleted');
  } catch (error) {
    next(error);
  }
};

// @desc    Monthly summary
// @route   GET /api/transactions/summary/monthly
// @access  Private
const monthlySummary = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const summary = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryBreakdown = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { type: '$type', category: '$category' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const result = { income: 0, expense: 0, net: 0 };
    summary.forEach((s) => (result[s._id] = s.total));
    result.net = result.income - result.expense;

    return sendSuccess(res, 200, 'Monthly summary', {
      period: { year: parseInt(year), month: parseInt(month) },
      ...result,
      categoryBreakdown,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  monthlySummary,
};
