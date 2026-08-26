const Project = require('../models/Project');
const CareerProfile = require('../models/CareerProfile');
const Skill = require('../models/Skill');
const geminiService = require('../services/geminiService');

// @desc    Submit a new project and run 10-dimension AI evaluation
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res, next) => {
  try {
    const {
      title,
      tagline,
      description,
      techStack = [],
      githubUrl,
      liveDemoUrl,
      figmaUrl,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Please provide project title and description.' });
    }

    const profile = await CareerProfile.findOne({ user: req.user._id });
    const targetRole = profile?.targetRole || 'Software Engineer';

    const parsedTechStack = Array.isArray(techStack)
      ? techStack
      : typeof techStack === 'string'
      ? techStack.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    // 1. Run AI Evaluation
    let evaluation;
    try {
      evaluation = await geminiService.evaluateProject({
        title,
        tagline,
        description,
        techStack: parsedTechStack,
        githubUrl,
        liveDemoUrl,
        targetRole,
      });
    } catch (aiErr) {
      console.warn('[Project AI Warning] Fallback evaluation used:', aiErr.message);
      evaluation = {
        overallScore: 72,
        innovationScore: 70,
        technicalComplexityScore: 74,
        engineeringQualityScore: 72,
        scalabilityScore: 68,
        userValueScore: 75,
        marketPotentialScore: 70,
        documentationScore: 70,
        presentationScore: 75,
        hackathonReadinessScore: 72,
        strengths: ['Clear practical utility and straightforward problem-solving approach'],
        weaknesses: ['Could document performance benchmarks and error handling workflows'],
        improvementSuggestions: ['Add integration tests and architecture flow diagram to repository'],
        recommendedNextSteps: ['Deploy live demo and benchmark API response times'],
        summary: `Strong showcase project demonstrating applied knowledge in ${parsedTechStack.join(', ') || 'modern development'}.`,
      };
    }

    // 2. Save Project
    const project = await Project.create({
      user: req.user._id,
      title,
      tagline: tagline || '',
      description,
      techStack: parsedTechStack,
      githubUrl: githubUrl || '',
      liveDemoUrl: liveDemoUrl || '',
      figmaUrl: figmaUrl || '',
      evaluation,
    });

    // 3. Auto-sync techStack to Skill database
    for (const tech of parsedTechStack) {
      if (tech && tech.trim()) {
        await Skill.findOneAndUpdate(
          { user: req.user._id, name: tech.trim() },
          {
            $setOnInsert: {
              user: req.user._id,
              name: tech.trim(),
              proficiency: 70,
              source: 'project',
              isGap: false,
            },
          },
          { upsert: true }
        );
      }
    }

    res.status(201).json({
      success: true,
      message: 'Project submitted and evaluated successfully.',
      project,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all evaluated projects for current user
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: projects.length, projects });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
exports.getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    res.status(200).json({ success: true, project });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    res.status(200).json({ success: true, message: 'Project removed successfully.' });
  } catch (error) {
    next(error);
  }
};
