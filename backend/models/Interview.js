const mongoose = require('mongoose');

const timestampEventSchema = new mongoose.Schema({
  timestampSeconds: {
    type: Number,
    required: true,
  },
  formattedTime: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['GOOD', 'NEEDS_IMPROVEMENT', 'INFO'],
    default: 'INFO',
  },
  category: {
    type: String,
    enum: ['structure', 'technical', 'communication', 'speech_rate', 'filler_words', 'pause', 'vision', 'other'],
    default: 'other',
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});

const interviewQuestionSchema = new mongoose.Schema({
  questionIndex: Number,
  questionText: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: 'technical',
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium',
  },
  expectedConcepts: [String],
  answerText: {
    type: String,
    default: '',
  },
  audioUrl: {
    type: String,
    default: '',
  },
  durationSeconds: {
    type: Number,
    default: 0,
  },
  speechMetrics: {
    wordsCount: { type: Number, default: 0 },
    wordsPerMinute: { type: Number, default: 0 },
    fillerWordsCount: { type: Number, default: 0 },
    fillerWordsList: [String],
    longPausesCount: { type: Number, default: 0 },
    pauseDurationSeconds: { type: Number, default: 0 },
    speechRateEvaluation: { type: String, default: 'Optimal' },
  },
  visionMetrics: {
    faceDetectedPercentage: { type: Number, default: 100 },
    eyeContactPercentage: { type: Number, default: 100 },
    lookingAwayCount: { type: Number, default: 0 },
    framingQuality: { type: String, default: 'Good' },
  },
  evaluation: {
    technicalScore: { type: Number, default: 0 },
    communicationScore: { type: Number, default: 0 },
    problemSolvingScore: { type: Number, default: 0 },
    whatWasCorrect: [String],
    whatWasMissing: [String],
    improvementTips: [String],
    recommendedConcepts: [String],
    feedbackSummary: String,
  },
  answeredAt: Date,
});

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
      default: 'Software Engineer',
    },
    company: {
      type: String,
      default: 'General Tech Company',
    },
    interviewType: {
      type: String,
      enum: ['Technical', 'HR', 'Behavioral', 'Project-based', 'Coding', 'Mixed', 'Managerial', 'System Design'],
      default: 'Mixed',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard', 'Adaptive'],
      default: 'Medium',
    },
    recruiterType: {
      type: String,
      enum: ['Technical Interviewer', 'HR Recruiter', 'Engineering Manager', 'Startup Founder', 'Behavioral Interviewer'],
      default: 'Technical Interviewer',
    },
    privacyMode: {
      type: String,
      enum: ['privacy', 'replay'],
      default: 'privacy',
    },
    cameraEnabled: {
      type: Boolean,
      default: false,
    },
    micEnabled: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['created', 'in-progress', 'completed', 'abandoned'],
      default: 'created',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
    totalDurationSeconds: {
      type: Number,
      default: 0,
    },
    recordingPath: {
      type: String,
      default: null, // Only stored if privacyMode === 'replay'
    },
    questions: [interviewQuestionSchema],
    events: [timestampEventSchema],
    finalReport: {
      overallScore: { type: Number, default: 0 },
      technicalScore: { type: Number, default: 0 },
      communicationScore: { type: Number, default: 0 },
      problemSolvingScore: { type: Number, default: 0 },
      answerStructureScore: { type: Number, default: 0 },
      strengths: [String],
      weaknesses: [String],
      mostImportantImprovement: String,
      recommendedPractice: [String],
      roleReadiness: {
        type: String,
        enum: ['Early Stage', 'Developing', 'Ready with Minor Polish', 'Interview Ready', 'Strong Fit'],
        default: 'Developing',
      },
      summary: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Interview', interviewSchema);
