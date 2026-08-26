const mongoose = require('mongoose');

const careerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    college: {
      type: String,
      trim: true,
      default: '',
    },
    degree: {
      type: String,
      trim: true,
      default: '',
    },
    branch: {
      type: String,
      trim: true,
      default: '',
    },
    graduationYear: {
      type: Number,
      default: null,
    },
    currentYear: {
      type: String,
      default: '',
    },
    experienceLevel: {
      type: String,
      enum: ['student', 'entry-level', 'intermediate', 'senior', 'career-changer'],
      default: 'student',
    },
    technicalSkills: [
      {
        type: String,
        trim: true,
      },
    ],
    programmingLanguages: [
      {
        type: String,
        trim: true,
      },
    ],
    certifications: [
      {
        name: String,
        issuer: String,
        year: Number,
      },
    ],
    preferredIndustries: [
      {
        type: String,
        trim: true,
      },
    ],
    targetRole: {
      type: String,
      trim: true,
      default: 'Full Stack Developer',
    },
    targetCompanies: [
      {
        type: String,
        trim: true,
      },
    ],
    careerSummary: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('CareerProfile', careerProfileSchema);
