const CareerProfile = require('../models/CareerProfile');
const User = require('../models/User');

// @desc    Get user's career profile
// @route   GET /api/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    let profile = await CareerProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = await CareerProfile.create({ user: req.user._id });
    }
    res.status(200).json({ success: true, profile });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user's career profile & sync user name
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      college,
      degree,
      branch,
      graduationYear,
      currentYear,
      experienceLevel,
      technicalSkills,
      programmingLanguages,
      certifications,
      preferredIndustries,
      targetRole,
      targetCompanies,
      careerSummary,
    } = req.body;

    if (name) {
      await User.findByIdAndUpdate(req.user._id, { name: name.trim() });
    }

    let profile = await CareerProfile.findOne({ user: req.user._id });
    if (!profile) {
      profile = new CareerProfile({ user: req.user._id });
    }

    if (college !== undefined) profile.college = college;
    if (degree !== undefined) profile.degree = degree;
    if (branch !== undefined) profile.branch = branch;
    if (graduationYear !== undefined) profile.graduationYear = graduationYear;
    if (currentYear !== undefined) profile.currentYear = currentYear;
    if (experienceLevel !== undefined) profile.experienceLevel = experienceLevel;
    if (technicalSkills !== undefined) profile.technicalSkills = technicalSkills;
    if (programmingLanguages !== undefined) profile.programmingLanguages = programmingLanguages;
    if (certifications !== undefined) profile.certifications = certifications;
    if (preferredIndustries !== undefined) profile.preferredIndustries = preferredIndustries;
    if (targetRole !== undefined) profile.targetRole = targetRole;
    if (targetCompanies !== undefined) profile.targetCompanies = targetCompanies;
    if (careerSummary !== undefined) profile.careerSummary = careerSummary;

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Career profile updated successfully.',
      profile,
    });
  } catch (error) {
    next(error);
  }
};
