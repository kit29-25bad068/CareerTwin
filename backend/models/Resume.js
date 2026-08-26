const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    storedFilePath: {
      type: String,
      required: true,
    },
    fileSizeBytes: {
      type: Number,
      required: true,
    },
    rawText: {
      type: String,
      required: true,
    },
    parsedData: {
      candidateName: String,
      email: String,
      phone: String,
      education: [
        {
          institution: String,
          degree: String,
          year: String,
          gpa: String,
        },
      ],
      experience: [
        {
          role: String,
          company: String,
          duration: String,
          highlights: [String],
        },
      ],
      skills: [String],
      projects: [
        {
          title: String,
          description: String,
          techStack: [String],
        },
      ],
      certifications: [String],
    },
    analysis: {
      overallScore: {
        type: Number,
        default: 0,
      },
      impactScore: {
        type: Number,
        default: 0,
      },
      clarityScore: {
        type: Number,
        default: 0,
      },
      keywordScore: {
        type: Number,
        default: 0,
      },
      roleAlignmentScore: {
        type: Number,
        default: 0,
      },
      strengths: [String],
      weaknesses: [String],
      missingSkills: [String],
      quantifiableSuggestions: [String],
      summary: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Resume', resumeSchema);
