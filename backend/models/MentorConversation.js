const mongoose = require('mongoose');

const mentorMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'mentor'],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  twinContextSnapshot: {
    targetRole: String,
    careerReadinessScore: Number,
    recentInterviewScore: Number,
    topGaps: [String],
  },
});

const mentorConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      default: 'Career Mentorship Session',
    },
    messages: [mentorMessageSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MentorConversation', mentorConversationSchema);
