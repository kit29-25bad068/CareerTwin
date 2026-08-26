const Roadmap = require('../models/Roadmap');
const CareerProfile = require('../models/CareerProfile');
const CareerGoal = require('../models/CareerGoal');
const Skill = require('../models/Skill');
const geminiService = require('../services/geminiService');

// @desc    Get user's personalized career roadmap
// @route   GET /api/roadmap
// @access  Private
exports.getRoadmap = async (req, res, next) => {
  try {
    const roadmap = await Roadmap.findOne({ user: req.user._id });
    if (!roadmap) {
      return res.status(200).json({ success: true, hasRoadmap: false, roadmap: null });
    }
    res.status(200).json({ success: true, hasRoadmap: true, roadmap });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate a new AI personalized roadmap based on goals and skill gaps
// @route   POST /api/roadmap/generate
// @access  Private
exports.generateRoadmap = async (req, res, next) => {
  try {
    const { durationMonths = 6 } = req.body;
    const profile = await CareerProfile.findOne({ user: req.user._id });
    const activeGoal = await CareerGoal.findOne({ user: req.user._id, status: 'Active' });
    const targetRole = activeGoal?.targetRole || profile?.targetRole || 'Full Stack Developer';

    const currentSkillsDocs = await Skill.find({ user: req.user._id });
    const currentSkills = currentSkillsDocs.filter((s) => !s.isGap).map((s) => s.name);
    const skillGaps = currentSkillsDocs.filter((s) => s.isGap).map((s) => s.name);

    // Call Gemini Roadmap Architect
    let roadmapData;
    try {
      roadmapData = await geminiService.generateRoadmap({
        targetRole,
        currentSkills,
        skillGaps,
        durationMonths: Number(durationMonths) || 6,
      });
    } catch (aiErr) {
      console.warn('[Roadmap AI Warning] Fallback roadmap generated:', aiErr.message);
      roadmapData = {
        targetRole,
        durationMonths: Number(durationMonths) || 6,
        milestones: [
          {
            monthIndex: 1,
            monthTitle: 'Month 1: Advanced Core Fundamentals',
            focusArea: 'Data Structures & Algorithms',
            learningGoal: 'Master Arrays, HashMaps, Two Pointers, and recursion patterns',
            tasks: [
              { title: 'Solve 20 medium LeetCode array & hashmap problems', category: 'Coding', estimatedHours: 15, isCompleted: false },
              { title: 'Implement custom Data Structures in JavaScript / TypeScript', category: 'Coding', estimatedHours: 10, isCompleted: false },
            ],
          },
          {
            monthIndex: 2,
            monthTitle: 'Month 2: Backend Architecture & APIs',
            focusArea: 'Node.js, Express & Database Optimization',
            learningGoal: 'Build resilient RESTful APIs with indexing and rate limiting',
            tasks: [
              { title: 'Build and document a production-ready REST API with JWT Auth', category: 'Project', estimatedHours: 20, isCompleted: false },
              { title: 'Learn database indexing strategies and query explain plans', category: 'Concept', estimatedHours: 8, isCompleted: false },
            ],
          },
          {
            monthIndex: 3,
            monthTitle: 'Month 3: System Design & Scaling',
            focusArea: 'Distributed Systems & Caching',
            learningGoal: 'Understand caching, load balancers, and horizontal scalability',
            tasks: [
              { title: 'Study System Design Primer topics: Redis caching & CDNs', category: 'System Design', estimatedHours: 12, isCompleted: false },
              { title: 'Design a scalable URL shortener and Chat service architecture', category: 'System Design', estimatedHours: 10, isCompleted: false },
            ],
          },
        ],
      };
    }

    const roadmapDoc = await Roadmap.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        targetRole,
        durationMonths: roadmapData.durationMonths || durationMonths,
        milestones: roadmapData.milestones || [],
        progressPercentage: 0,
        generatedBasedOn: {
          goalTitle: activeGoal?.title || targetRole,
          skillGapsCount: skillGaps.length,
          interviewScoresCount: 0,
        },
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Personalized career roadmap generated successfully.',
      roadmap: roadmapDoc,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle task completion status
// @route   PUT /api/roadmap/tasks/:milestoneIdx/:taskIdx
// @access  Private
exports.toggleTask = async (req, res, next) => {
  try {
    const { milestoneIdx, taskIdx } = req.params;
    const roadmap = await Roadmap.findOne({ user: req.user._id });
    if (!roadmap) {
      return res.status(404).json({ success: false, message: 'Roadmap not found.' });
    }

    const mIdx = parseInt(milestoneIdx, 10);
    const tIdx = parseInt(taskIdx, 10);

    if (!roadmap.milestones[mIdx] || !roadmap.milestones[mIdx].tasks[tIdx]) {
      return res.status(404).json({ success: false, message: 'Specified task not found in roadmap.' });
    }

    const task = roadmap.milestones[mIdx].tasks[tIdx];
    task.isCompleted = !task.isCompleted;
    task.completedAt = task.isCompleted ? new Date() : null;

    // Recalculate total progress percentage
    let totalTasks = 0;
    let completedTasks = 0;

    roadmap.milestones.forEach((m) => {
      m.tasks.forEach((t) => {
        totalTasks++;
        if (t.isCompleted) completedTasks++;
      });
    });

    roadmap.progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    await roadmap.save();

    res.status(200).json({
      success: true,
      message: `Task marked as ${task.isCompleted ? 'completed' : 'incomplete'}.`,
      progressPercentage: roadmap.progressPercentage,
      roadmap,
    });
  } catch (error) {
    next(error);
  }
};
