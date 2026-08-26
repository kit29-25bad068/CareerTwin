const mongoose = require('mongoose');

const roadmapTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: String,
  category: {
    type: String,
    default: 'Concept',
  },
  estimatedHours: {
    type: Number,
    default: 10,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: Date,
  resources: [
    {
      name: String,
      url: String,
    },
  ],
});

const roadmapMilestoneSchema = new mongoose.Schema({
  monthIndex: {
    type: Number,
    required: true,
  },
  monthTitle: {
    type: String,
    required: true,
  },
  focusArea: {
    type: String,
    required: true,
  },
  learningGoal: {
    type: String,
    required: true,
  },
  tasks: [roadmapTaskSchema],
});

const roadmapSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    targetRole: {
      type: String,
      required: true,
    },
    durationMonths: {
      type: Number,
      default: 6,
    },
    milestones: [roadmapMilestoneSchema],
    progressPercentage: {
      type: Number,
      default: 0,
    },
    generatedBasedOn: {
      goalTitle: String,
      skillGapsCount: Number,
      interviewScoresCount: Number,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Roadmap', roadmapSchema);
