const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['Interview', 'Resume', 'Project', 'Skill', 'GitHub', 'Roadmap', 'General'],
      default: 'General',
    },
    priority: {
      type: String,
      enum: ['Critical', 'High', 'Medium', 'Low'],
      default: 'High',
    },
    actionLabel: {
      type: String,
      default: 'Take Action',
    },
    actionUrl: {
      type: String,
      default: '/dashboard.html',
    },
    isDismissed: {
      type: Boolean,
      default: false,
    },
    evidence: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Recommendation', recommendationSchema);
