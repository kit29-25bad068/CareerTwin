const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const CareerProfile = require('../models/CareerProfile');
const CareerGoal = require('../models/CareerGoal');
const Skill = require('../models/Skill');
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const Project = require('../models/Project');
const GitHubProfile = require('../models/GitHubProfile');
const Roadmap = require('../models/Roadmap');
const Recommendation = require('../models/Recommendation');
const MentorConversation = require('../models/MentorConversation');
const careerTwinService = require('../services/careerTwinService');

// @desc    Wipe all interview history (Career Memory)
// @route   POST /api/privacy/wipe-memory
// @access  Private
exports.wipeCareerMemory = async (req, res, next) => {
  try {
    const interviews = await Interview.find({ user: req.user._id });
    // Remove files
    interviews.forEach((inv) => {
      if (inv.recordingPath) {
        const fullPath = path.join(__dirname, '../../', inv.recordingPath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {}
        }
      }
    });

    await Interview.deleteMany({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: 'All interview history and career memory wiped successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Wipe all saved video/audio recordings from disk
// @route   POST /api/privacy/wipe-recordings
// @access  Private
exports.wipeRecordings = async (req, res, next) => {
  try {
    const interviews = await Interview.find({ user: req.user._id, recordingPath: { $ne: null } });
    let deletedCount = 0;

    for (const inv of interviews) {
      if (inv.recordingPath) {
        const fullPath = path.join(__dirname, '../../', inv.recordingPath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
            deletedCount++;
          } catch (e) {}
        }
        inv.recordingPath = null;
        await inv.save();
      }
    }

    res.status(200).json({
      success: true,
      message: `Permanently deleted ${deletedCount} recording file(s). Metrics and score reports preserved.`,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export all user data as JSON
// @route   GET /api/privacy/export
// @access  Private
exports.exportUserData = async (req, res, next) => {
  try {
    const twinData = await careerTwinService.getCareerTwinState(req.user._id);
    const user = await User.findById(req.user._id).select('-password');

    const exportPayload = {
      exportTimestamp: new Date(),
      platform: 'CareerTwin AI',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        privacySettings: user.privacySettings,
        createdAt: user.createdAt,
      },
      digitalCareerTwin: twinData,
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=careertwin-export-${req.user._id}-${Date.now()}.json`);
    res.status(200).send(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    next(error);
  }
};

// @desc    Complete account and data deletion
// @route   DELETE /api/privacy/account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // 1. Delete all resume files
    const resume = await Resume.findOne({ user: userId });
    if (resume && resume.storedFilePath) {
      const rPath = path.join(__dirname, '../../', resume.storedFilePath);
      if (fs.existsSync(rPath)) {
        try {
          fs.unlinkSync(rPath);
        } catch (e) {}
      }
    }

    // 2. Delete all recordings
    const interviews = await Interview.find({ user: userId });
    interviews.forEach((inv) => {
      if (inv.recordingPath) {
        const fullPath = path.join(__dirname, '../../', inv.recordingPath);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
          } catch (e) {}
        }
      }
    });

    // 3. Delete database documents
    await Promise.all([
      User.findByIdAndDelete(userId),
      CareerProfile.deleteMany({ user: userId }),
      CareerGoal.deleteMany({ user: userId }),
      Skill.deleteMany({ user: userId }),
      Interview.deleteMany({ user: userId }),
      Resume.deleteMany({ user: userId }),
      Project.deleteMany({ user: userId }),
      GitHubProfile.deleteMany({ user: userId }),
      Roadmap.deleteMany({ user: userId }),
      Recommendation.deleteMany({ user: userId }),
      MentorConversation.deleteMany({ user: userId }),
    ]);

    res.status(200).json({
      success: true,
      message: 'Account and all associated career data have been permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
};
