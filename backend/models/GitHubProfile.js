const mongoose = require('mongoose');

const gitHubProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    avatarUrl: String,
    bio: String,
    publicReposCount: { type: Number, default: 0 },
    followersCount: { type: Number, default: 0 },
    topLanguages: [
      {
        language: String,
        percentage: Number,
        repoCount: Number,
      },
    ],
    repositories: [
      {
        name: String,
        description: String,
        htmlUrl: String,
        language: String,
        stars: Number,
        forks: Number,
        hasReadme: Boolean,
        updatedAt: Date,
      },
    ],
    analysis: {
      overallScore: { type: Number, default: 0 },
      codeDiversityScore: { type: Number, default: 0 },
      documentationScore: { type: Number, default: 0 },
      consistencyScore: { type: Number, default: 0 },
      engineeringSignals: [String],
      strengths: [String],
      weaknesses: [String],
      recommendedImprovements: [String],
      summary: String,
    },
    lastSyncedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('GitHubProfile', gitHubProfileSchema);
