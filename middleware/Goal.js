const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1'],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    deadline: {
      type: Date,
      required: [true, 'Deadline is required'],
    },
    category: {
      type: String,
      enum: ['emergency', 'travel', 'education', 'home', 'car', 'retirement', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active',
    },
    color: {
      type: String,
      default: '#4CAF50',
    },
    icon: {
      type: String,
      default: 'savings',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: progress percentage
goalSchema.virtual('progressPercentage').get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(Math.round((this.currentAmount / this.targetAmount) * 100), 100);
});

// Virtual: days remaining
goalSchema.virtual('daysRemaining').get(function () {
  const today = new Date();
  const deadline = new Date(this.deadline);
  const diff = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  return diff;
});

// Virtual: is nearing deadline (within 7 days and not completed)
goalSchema.virtual('isNearingDeadline').get(function () {
  return this.daysRemaining <= 7 && this.daysRemaining > 0 && this.status === 'active';
});

// Auto-complete goal when target is met
goalSchema.pre('save', function (next) {
  if (this.currentAmount >= this.targetAmount) {
    this.status = 'completed';
  }
  next();
});

module.exports = mongoose.model('Goal', goalSchema);
