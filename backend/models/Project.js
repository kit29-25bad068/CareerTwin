const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    tagline: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      required: [true, 'Project description is required'],
    },
    techStack: [
      {
        type: String,
        trim: true,
      },
    ],
    githubUrl: {
      type: String,
      trim: true,
      default: '',
    },
    liveDemoUrl: {
      type: String,
      trim: true,
      default: '',
    },
    figmaUrl: {
      type: String,
      trim: true,
      default: '',
    },
    evaluation: {
      overallScore: { type: Number, default: 0 },
      innovationScore: { type: Number, default: 0 },
      technicalComplexityScore: { type: Number, default: 0 },
      engineeringQualityScore: { type: Number, default: 0 },
      scalabilityScore: { type: Number, default: 0 },
      userValueScore: { type: Number, default: 0 },
      marketPotentialScore: { type: Number, default: 0 },
      documentationScore: { type: Number, default: 0 },
      presentationScore: { type: Number, default: 0 },
      hackathonReadinessScore: { type: Number, default: 0 },
      strengths: [String],
      weaknesses: [String],
      improvementSuggestions: [String],
      recommendedNextSteps: [String],
      summary: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Project', projectSchema);
