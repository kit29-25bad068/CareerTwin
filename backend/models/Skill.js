const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Frontend', 'Backend', 'Database', 'DevOps & Cloud', 'Mobile', 'AI & Data', 'Core CS & DSA', 'Soft Skills & Leadership', 'Tools & Platforms', 'Other'],
      default: 'Other',
    },
    proficiency: {
      type: Number,
      min: 0,
      max: 100,
      default: 50,
    },
    source: {
      type: String,
      enum: ['manual', 'resume', 'github', 'interview', 'project'],
      default: 'manual',
    },
    isGap: {
      type: Boolean,
      default: false,
    },
    gapPriority: {
      type: String,
      enum: ['High', 'Medium', 'Low', 'None'],
      default: 'None',
    },
    gapReason: {
      type: String,
      default: '',
    },
    learningResources: [
      {
        title: String,
        url: String,
        type: { type: String, default: 'Article' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index so a user doesn't have duplicate skill names
skillSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Skill', skillSchema);
