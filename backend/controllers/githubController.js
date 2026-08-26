const GitHubProfile = require('../models/GitHubProfile');
const CareerProfile = require('../models/CareerProfile');
const Skill = require('../models/Skill');
const githubService = require('../services/githubService');

// @desc    Connect and analyze GitHub username
// @route   POST /api/github/sync
// @access  Private
exports.syncGitHub = async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Please provide a GitHub username.' });
    }

    const profile = await CareerProfile.findOne({ user: req.user._id });
    const targetRole = profile?.targetRole || 'Software Engineer';

    // 1. Fetch & analyze via GitHub Service
    const githubData = await githubService.fetchAndAnalyzeGitHub(username, targetRole);

    // 2. Upsert GitHubProfile document
    const githubProfile = await GitHubProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        ...githubData,
      },
      { upsert: true, new: true }
    );

    // 3. Auto-sync top languages to Skill database
    if (githubData.topLanguages && Array.isArray(githubData.topLanguages)) {
      for (const lang of githubData.topLanguages) {
        if (lang.language && lang.language !== 'Unspecified') {
          await Skill.findOneAndUpdate(
            { user: req.user._id, name: lang.language },
            {
              $setOnInsert: {
                user: req.user._id,
                name: lang.language,
                category: 'Programming Languages',
                proficiency: Math.min(60 + (lang.percentage || 20), 95),
                source: 'github',
                isGap: false,
              },
            },
            { upsert: true }
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `GitHub profile @${githubData.username} synced and analyzed successfully.`,
      github: githubProfile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's connected GitHub profile & insights
// @route   GET /api/github
// @access  Private
exports.getGitHubProfile = async (req, res, next) => {
  try {
    const github = await GitHubProfile.findOne({ user: req.user._id });
    if (!github) {
      return res.status(200).json({ success: true, isConnected: false, github: null });
    }
    res.status(200).json({ success: true, isConnected: true, github });
  } catch (error) {
    next(error);
  }
};

// @desc    Disconnect GitHub profile
// @route   DELETE /api/github
// @access  Private
exports.disconnectGitHub = async (req, res, next) => {
  try {
    await GitHubProfile.findOneAndDelete({ user: req.user._id });
    res.status(200).json({
      success: true,
      message: 'GitHub profile disconnected and insights removed.',
    });
  } catch (error) {
    next(error);
  }
};
