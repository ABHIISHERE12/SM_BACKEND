const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Withdrawal status: pending, completed, cancelled
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed", // Only withdrawals will use pending/cancelled
    },
    // Cooldown expiry for withdrawals
    cooldownExpiry: {
      type: Date,
      default: null,
    },
    // If this withdrawal is cancelled, store cancellation reason
    cancellationReason: {
      type: String,
      default: null,
      trim: true,
      maxlength: [200, "Cancellation reason cannot exceed 200 characters"],
    },
    type: {
      type: String,
      enum: ["income", "expense"],
      required: [true, "Transaction type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    category: {
      type: String,
      enum: [
        "salary",
        "freelance",
        "investment",
        "gift",
        "other_income",
        "food",
        "transport",
        "housing",
        "healthcare",
        "entertainment",
        "shopping",
        "education",
        "utilities",
        "savings_deposit",
        "other_expense",
      ],
      required: [true, "Category is required"],
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null,
    },
    tags: [{ type: String, trim: true }],
    note: {
      type: String,
      trim: true,
      maxlength: [500, "Note cannot exceed 500 characters"],
    },
  },
  { timestamps: true },
);

// Compound index for efficient user+date queries
transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
