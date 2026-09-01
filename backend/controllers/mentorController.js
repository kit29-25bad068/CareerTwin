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
      mentorReply = generateContextualMentorFallback(message.trim(), twinState, req.user);
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

/**
 * Intelligent context-aware mentor fallback when external LLM is unreachable
 */
function generateContextualMentorFallback(message, twinState, user) {
  const query = message.toLowerCase().trim();
  const targetRole = twinState.targetRole || 'Software Engineer';
  const score = twinState.careerReadiness.score !== null ? `${twinState.careerReadiness.score}/100` : 'Not calculated yet';
  const topGaps = twinState.skills.gaps.slice(0, 3).map((g) => g.name);
  const userName = user?.name || 'there';

  // 1. Detect random gibberish or non-words (e.g. asdfghjk, qwerty, zxcvb)
  const isVowelDeficient = !/[aeiouy]/i.test(query) && query.length >= 4;
  const isRepetitive = /(.)\1{3,}/.test(query);
  const isRandomKeySmash = /^[b-df-hj-np-tv-z]{4,}$/i.test(query) || /^[^a-zA-Z0-9\s]{3,}$/.test(query);

  if (isVowelDeficient || isRepetitive || isRandomKeySmash || query.length < 3) {
    return `I noticed your message ("${message}") didn't come through clearly! 

As your CareerTwin AI Mentor, I'm here to help guide your preparation for **${targetRole}**. You can ask me questions like:
- *"How can I improve my Career Readiness score (${score})?"*
- *"What are the most common Spring Boot and Java concurrency interview questions?"*
- *"Can you review my skill gaps (${topGaps.join(', ') || 'Spring Boot, Docker, System Design'}) and suggest what to study next?"*
- *"How should I structure my answer for an architectural system design question?"*`;
  }

  // 2. Greetings
  if (/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))\b/i.test(query)) {
    return `Hello ${userName}! 👋 Great to connect with you. 

Your Digital Career Twin is currently set to **${targetRole}** with an overall Readiness Index of **${score}**. 

Here is what we can work on today:
1. **Mock Interview Preparation**: Practice answering core and advanced technical questions with live speech and gaze analysis.
2. **Addressing Skill Gaps**: Focus on key areas like ${topGaps.length ? `**${topGaps.join('**, **')}**` : '**Framework Architecture & Concurrency**'}.
3. **Resume & Project Review**: Ensure your projects showcase high-impact engineering metrics.

What would you like to dive into?`;
  }

  // 3. Questions about Readiness Score or Why it is low / How to improve
  if (/score|readiness|why|low|improve|index|rank/i.test(query)) {
    const resumeScore = twinState.resume.score !== null ? `${twinState.resume.score}/100` : 'No resume uploaded yet';
    const interviewScore = twinState.interviews.avgOverall !== null ? `${twinState.interviews.avgOverall}/100` : 'No completed interviews yet';
    const projCount = twinState.projects.count || 0;

    return `Here is a transparent breakdown of your **Career Readiness Index (${score})**:

- **Technical Interviews (Weight: 25%)**: Average score is ${interviewScore}. Completing mock interviews is the fastest way to boost this score.
- **Resume Quality & ATS Alignment (Weight: 15%)**: Your resume is currently at ${resumeScore}.
- **Showcase Projects (Weight: 20%)**: You have ${projCount} project(s) evaluated.
- **Skill Coverage (Weight: 15%)**: ${topGaps.length ? `Top identified gaps are: **${topGaps.join(', ')}**.` : 'No critical gaps identified.'}

🎯 **Recommended Action**: Complete a 5-question mock interview in your target role (${targetRole}) to immediately raise your verified technical and communication scores!`;
  }

  // 4. Questions about Java / Spring Boot / Backend Concepts
  if (/java|spring|boot|jvm|garbage|collection|hibernate|jpa|multithreading|concurrency/i.test(query)) {
    return `Let's break down that technical topic for your **${targetRole}** track:

### Core Concepts to Master:
1. **JVM Architecture & Memory**:
   - **Heap vs Stack**: Objects live on the Heap; method execution frames live on the Stack.
   - **Generational GC**: Young Gen (Eden, S0, S1) for short-lived objects; Old Gen for tenured objects.
2. **Spring Boot & JPA Internals**:
   - Understand **IoC (Inversion of Control)** and Bean lifecycles.
   - Be ready to solve the **N+1 query problem** using \`JOIN FETCH\` or \`@EntityGraph\`.
3. **Concurrency & Thread Safety**:
   - Know when to use \`ReentrantLock\`, \`volatile\`, \`AtomicInteger\`, and \`CompletableFuture\`.

💡 **Pro Tip for Interviews**: When asked about a technical concept, always follow a 3-part structure:
1. **Definition & Core Purpose** (What it is).
2. **Internal Mechanics** (How it works under the hood).
3. **Real-World Trade-Offs & Edge Cases** (When to use it vs alternatives).`;
  }

  // 5. Questions about Interviews / Preparation
  if (/interview|mock|prepare|tips|question/i.test(query)) {
    return `For ${targetRole} interviews, hiring managers evaluate 3 key pillars:

1. **Structured Delivery (STAR Method)**:
   - **Situation**: Context of the problem.
   - **Task**: Your specific responsibility.
   - **Action**: The exact architectural and coding steps you took.
   - **Result**: Quantifiable outcomes (e.g. "reduced latency by 35%").

2. **Core to Advanced Progression**:
   - Start with clean fundamentals, then proactively discuss edge cases (concurrency, memory leaks, high traffic scaling).

3. **Presence & Cadence**:
   - Maintain direct eye contact with the camera and aim for a steady 120-150 Words Per Minute cadence without rushing.

Ready to test this out? Head over to the **Mock Interview Room** to run a live session with real-time feedback!`;
  }

  // 6. Default Contextual Response for any other question
  return `Regarding your question: "${message}"

As your CareerTwin Mentor focused on your **${targetRole}** path:
- **Current State**: Your Career Readiness Index is **${score}**.
- **Key Priority**: ${topGaps.length ? `Focus on mastering **${topGaps[0]}**` : 'Continue regular mock interview practice'} and building demonstrable projects.
- **Action Step**: You can review your step-by-step milestones in the **Career Roadmap** tab or upload your latest resume to verify ATS keyword alignment.

Feel free to ask for specific code explanations, interview question breakdowns, or architectural advice!`;
}

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
