const MentorConversation = require('../models/MentorConversation');
const careerTwinService = require('../services/careerTwinService');
const geminiService = require('../services/geminiService');

// @desc    Get or initialize the user's mentor conversation
// @route   GET /api/mentor
// @access  Private
exports.getMentorConversation = async (req, res, next) => {
  try {
    let conversation = await MentorConversation.findOne({ user: req.user._id });
    if (!conversation) {
      conversation = await MentorConversation.create({
        user: req.user._id,
        title: 'CareerTwin AI Mentorship',
        messages: [
          {
            sender: 'mentor',
            text: `Hello! I am your personal CareerTwin AI Mentor. I have full access to your digital career profile, target roles, interview metrics, and skill gaps. How can I help guide your preparation today?`,
            timestamp: new Date(),
          },
        ],
      });
    }
    res.status(200).json({ success: true, conversation });
  } catch (error) {
    next(error);
  }
};

// @desc    Send message to Mentor AI and get contextual reply
// @route   POST /api/mentor/chat
// @access  Private
exports.sendMessage = async (req, res, next) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter a message.' });
    }

    // 1. Get current Career Twin State
    const twinState = await careerTwinService.getCareerTwinState(req.user._id);

    // 2. Find or create conversation
    let conversation = await MentorConversation.findOne({ user: req.user._id });
    if (!conversation) {
      conversation = new MentorConversation({
        user: req.user._id,
        messages: [],
      });
    }

    // 3. Add user message
    conversation.messages.push({
      sender: 'user',
      text: message.trim(),
      timestamp: new Date(),
      twinContextSnapshot: {
        targetRole: twinState.targetRole,
        careerReadinessScore: twinState.careerReadiness.score,
        recentInterviewScore: twinState.interviews.avgOverall,
        topGaps: twinState.skills.gaps.slice(0, 3).map((g) => g.name),
      },
    });

    // 4. Generate AI Mentor response with injected context
    let mentorReply;
    try {
      mentorReply = await geminiService.mentorChat({
        userMessage: message.trim(),
        conversationHistory: conversation.messages,
        twinContext: {
          targetRole: twinState.targetRole,
          careerReadinessScore: twinState.careerReadiness.score,
          avgTechnicalScore: twinState.interviews.avgTechnical,
          avgCommunicationScore: twinState.interviews.avgCommunication,
          resumeScore: twinState.resume.score,
          topGaps: twinState.skills.gaps.map((g) => g.name),
          projectsCount: twinState.projects.count,
          githubConnected: twinState.github.isConnected,
        },
      });
    } catch (aiErr) {
      console.warn('[Mentor AI Warning] Fallback mentor reply used:', aiErr.message);
      mentorReply = `Based on your current profile for "${twinState.targetRole}", you have a Career Readiness score of ${twinState.careerReadiness.score || 'uncalculated'}/100. I recommend focusing on ${twinState.skills.gaps[0]?.name || 'mock interview practice'} to build solid momentum.`;
    }

    // 5. Add mentor reply to conversation
    conversation.messages.push({
      sender: 'mentor',
      text: mentorReply,
      timestamp: new Date(),
    });

    await conversation.save();

    res.status(200).json({
      success: true,
      message: mentorReply,
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear mentor conversation history
// @route   DELETE /api/mentor
// @access  Private
exports.clearConversation = async (req, res, next) => {
  try {
    await MentorConversation.findOneAndDelete({ user: req.user._id });
    res.status(200).json({ success: true, message: 'Mentorship history cleared.' });
  } catch (error) {
    next(error);
  }
};
