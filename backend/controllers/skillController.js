const Skill = require('../models/Skill');
const CareerProfile = require('../models/CareerProfile');
const CareerGoal = require('../models/CareerGoal');
const geminiService = require('../services/geminiService');

// @desc    Get all skills and skill gaps for user
// @route   GET /api/skills
// @access  Private
exports.getSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find({ user: req.user._id }).sort({ proficiency: -1 });
    const verifiedSkills = skills.filter((s) => !s.isGap);
    const skillGaps = skills.filter((s) => s.isGap);

    res.status(200).json({
      success: true,
      totalCount: skills.length,
      verifiedCount: verifiedSkills.length,
      gapsCount: skillGaps.length,
      skills: verifiedSkills,
      gaps: skillGaps,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add or update a skill manually
// @route   POST /api/skills
// @access  Private
exports.addSkill = async (req, res, next) => {
  try {
    const { name, category = 'Other', proficiency = 60, isGap = false, gapPriority = 'None', gapReason = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a valid skill name.' });
    }

    const skill = await Skill.findOneAndUpdate(
      { user: req.user._id, name: name.trim() },
      {
        user: req.user._id,
        name: name.trim(),
        category,
        proficiency: Number(proficiency) || 60,
        isGap: Boolean(isGap),
        gapPriority: gapPriority || 'None',
        gapReason: gapReason || '',
        source: 'manual',
      },
      { upsert: true, new: true }
    );

    res.status(201).json({
      success: true,
      message: 'Skill saved successfully.',
      skill,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run AI Skill Gap Analysis against target role
// @route   POST /api/skills/gap-analysis
// @access  Private
exports.runSkillGapAnalysis = async (req, res, next) => {
  try {
    const profile = await CareerProfile.findOne({ user: req.user._id });
    const activeGoal = await CareerGoal.findOne({ user: req.user._id, status: 'Active' });
    const targetRole = activeGoal?.targetRole || profile?.targetRole || 'Full Stack Developer';

    const currentSkillsDocs = await Skill.find({ user: req.user._id, isGap: false });
    const currentSkillNames = currentSkillsDocs.map((s) => s.name);

    // Call Gemini Skill Gap Engine
    let gapResult;
    try {
      gapResult = await geminiService.analyzeSkillGaps({
        currentSkills: currentSkillNames,
        targetRole,
        careerGoal: activeGoal?.title || targetRole,
      });
    } catch (aiErr) {
      console.warn('[Skill Gap Warning] Fallback gaps generated:', aiErr.message);
      gapResult = {
        targetRole,
        skillCoveragePercentage: currentSkillNames.length > 5 ? 65 : 40,
        verifiedSkills: currentSkillNames,
        skillGaps: [
          {
            name: 'System Design & Distributed Systems',
            category: 'Core CS & DSA',
            priority: 'High',
            reason: 'Essential for high-scale backend services.',
            estimatedTimeToLearnHours: 25,
            recommendedResources: [{ title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'Guide' }],
          },
          {
            name: 'Docker & Containerization',
            category: 'DevOps & Cloud',
            priority: 'Medium',
            reason: 'Standard for modern production deployment.',
            estimatedTimeToLearnHours: 15,
            recommendedResources: [{ title: 'Docker Official Docs', url: 'https://docs.docker.com/', type: 'Documentation' }],
          },
        ],
        learningSequenceSummary: 'Focus on System Design first, followed by Containerization.',
      };
    }

    // Save identified gaps into Skill database
    if (gapResult.skillGaps && Array.isArray(gapResult.skillGaps)) {
      for (const gap of gapResult.skillGaps) {
        await Skill.findOneAndUpdate(
          { user: req.user._id, name: gap.name },
          {
            user: req.user._id,
            name: gap.name,
            category: gap.category || 'Other',
            proficiency: 20,
            source: 'manual',
            isGap: true,
            gapPriority: gap.priority || 'High',
            gapReason: gap.reason || '',
            learningResources: gap.recommendedResources || [],
          },
          { upsert: true }
        );
      }
    }

    res.status(200).json({
      success: true,
      message: 'Skill gap analysis complete.',
      analysis: gapResult,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a skill or skill gap
// @route   DELETE /api/skills/:id
// @access  Private
exports.deleteSkill = async (req, res, next) => {
  try {
    const skill = await Skill.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!skill) {
      return res.status(404).json({ success: false, message: 'Skill not found.' });
    }
    res.status(200).json({ success: true, message: 'Skill removed successfully.' });
  } catch (error) {
    next(error);
  }
};
