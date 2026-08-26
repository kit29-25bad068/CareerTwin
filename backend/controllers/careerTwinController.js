const careerTwinService = require('../services/careerTwinService');
const Recommendation = require('../models/Recommendation');

// @desc    Get complete 360-degree Career Twin intelligence state
// @route   GET /api/career-twin
// @access  Private
exports.getCareerTwinState = async (req, res, next) => {
  try {
    const twinState = await careerTwinService.getCareerTwinState(req.user._id);
    res.status(200).json({ success: true, twin: twinState });
  } catch (error) {
    next(error);
  }
};

// @desc    Get smart recommendations based on real twin state
// @route   GET /api/recommendations
// @access  Private
exports.getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await careerTwinService.generateSmartRecommendations(req.user._id);
    res.status(200).json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Dismiss a recommendation
// @route   POST /api/recommendations/:id/dismiss
// @access  Private
exports.dismissRecommendation = async (req, res, next) => {
  try {
    await Recommendation.findByIdAndUpdate(req.params.id, { isDismissed: true });
    res.status(200).json({ success: true, message: 'Recommendation dismissed.' });
  } catch (error) {
    next(error);
  }
};
