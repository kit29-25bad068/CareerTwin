const CareerGoal = require('../models/CareerGoal');
const CareerProfile = require('../models/CareerProfile');

// @desc    Get all career goals for current user
// @route   GET /api/goals
// @access  Private
exports.getGoals = async (req, res, next) => {
  try {
    const goals = await CareerGoal.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: goals.length, goals });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new career goal & optionally update target role across profile
// @route   POST /api/goals
// @access  Private
exports.createGoal = async (req, res, next) => {
  try {
    const { title, targetRole, targetCompany, targetIndustry, priority = 'High', deadline, description } = req.body;

    if (!title || !targetRole) {
      return res.status(400).json({ success: false, message: 'Please provide goal title and target role.' });
    }

    const goal = await CareerGoal.create({
      user: req.user._id,
      title,
      targetRole,
      targetCompany: targetCompany || '',
      targetIndustry: targetIndustry || 'Technology',
      priority,
      status: 'Active',
      deadline: deadline ? new Date(deadline) : null,
      description: description || '',
    });

    // Update CareerProfile targetRole
    await CareerProfile.findOneAndUpdate(
      { user: req.user._id },
      { targetRole, targetCompanies: targetCompany ? [targetCompany] : [] }
    );

    res.status(201).json({
      success: true,
      message: 'Career goal established and profile synchronized.',
      goal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a career goal
// @route   PUT /api/goals/:id
// @access  Private
exports.updateGoal = async (req, res, next) => {
  try {
    const { title, targetRole, targetCompany, priority, status, deadline, description } = req.body;
    const goal = await CareerGoal.findOne({ _id: req.params.id, user: req.user._id });

    if (!goal) {
      return res.status(404).json({ success: false, message: 'Career goal not found.' });
    }

    if (title) goal.title = title;
    if (targetRole) {
      goal.targetRole = targetRole;
      await CareerProfile.findOneAndUpdate({ user: req.user._id }, { targetRole });
    }
    if (targetCompany !== undefined) goal.targetCompany = targetCompany;
    if (priority) goal.priority = priority;
    if (status) goal.status = status;
    if (deadline !== undefined) goal.deadline = deadline ? new Date(deadline) : null;
    if (description !== undefined) goal.description = description;

    await goal.save();

    res.status(200).json({
      success: true,
      message: 'Career goal updated successfully.',
      goal,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a career goal
// @route   DELETE /api/goals/:id
// @access  Private
exports.deleteGoal = async (req, res, next) => {
  try {
    const goal = await CareerGoal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Career goal not found.' });
    }
    res.status(200).json({ success: true, message: 'Career goal deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
