const mongoose = require('mongoose');

const careerGoalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
    },
    targetRole: {
      type: String,
      required: [true, 'Target role is required'],
      trim: true,
    },
    targetCompany: {
      type: String,
      trim: true,
      default: '',
    },
    targetIndustry: {
      type: String,
      trim: true,
      default: 'Technology',
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'High',
    },
    status: {
      type: String,
      enum: ['Active', 'In Progress', 'Achieved', 'Archived'],
      default: 'Active',
    },
    deadline: {
      type: Date,
    },
    description: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CareerGoal', careerGoalSchema);
