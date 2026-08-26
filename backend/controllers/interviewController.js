const fs = require('fs');
const path = require('path');
const Interview = require('../models/Interview');
const CareerProfile = require('../models/CareerProfile');
const geminiService = require('../services/geminiService');
const whisperService = require('../services/whisperService');

// @desc    Start a new AI mock interview session
// @route   POST /api/interviews
// @access  Private
exports.createInterview = async (req, res, next) => {
  try {
    const {
      role,
      company,
      interviewType,
      difficulty,
      recruiterType,
      privacyMode,
      cameraEnabled,
      micEnabled,
    } = req.body;

    const profile = await CareerProfile.findOne({ user: req.user._id });
    const targetRole = role || profile?.targetRole || 'Software Engineer';
    const targetCompany = company || 'General Tech Company';
    const chosenType = interviewType || 'Mixed';
    const chosenDifficulty = difficulty || 'Medium';
    const chosenRecruiter = recruiterType || 'Technical Interviewer';
    const chosenPrivacyMode = privacyMode === 'replay' ? 'replay' : 'privacy';

    // 1. Generate First Question using Gemini
    let firstQuestion;
    try {
      firstQuestion = await geminiService.generateInterviewQuestion({
        role: targetRole,
        company: targetCompany,
        interviewType: chosenType,
        difficulty: chosenDifficulty,
        recruiterType: chosenRecruiter,
        questionIndex: 0,
        previousQuestions: [],
        previousAnswers: [],
      });
    } catch (aiErr) {
      console.warn('[Interview Gemini Warning] Fallback question used:', aiErr.message);
      firstQuestion = {
        questionText: `Welcome! Let's begin. Can you introduce yourself and tell me about a challenging technical project you built as a ${targetRole}?`,
        category: 'technical',
        difficulty: chosenDifficulty,
        expectedConcepts: ['Project Architecture', 'Trade-offs', 'Problem Solving'],
      };
    }

    // 2. Create Interview document in MongoDB
    const interview = await Interview.create({
      user: req.user._id,
      role: targetRole,
      company: targetCompany,
      interviewType: chosenType,
      difficulty: chosenDifficulty,
      recruiterType: chosenRecruiter,
      privacyMode: chosenPrivacyMode,
      cameraEnabled: Boolean(cameraEnabled),
      micEnabled: micEnabled !== false,
      status: 'in-progress',
      startedAt: new Date(),
      questions: [
        {
          questionIndex: 0,
          questionText: firstQuestion.questionText,
          category: firstQuestion.category || 'technical',
          difficulty: firstQuestion.difficulty || chosenDifficulty,
          expectedConcepts: firstQuestion.expectedConcepts || [],
        },
      ],
      events: [
        {
          timestampSeconds: 0,
          formattedTime: '00:00',
          type: 'INFO',
          category: 'other',
          title: 'Interview Session Started',
          description: `Simulation initialized with ${chosenRecruiter} representing ${targetCompany} in ${chosenPrivacyMode === 'privacy' ? 'Privacy Mode (no media stored)' : 'Replay Mode (secure media saved)'}.`,
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Interview session initialized.',
      interview,
      currentQuestion: interview.questions[0],
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all interviews for current user
// @route   GET /api/interviews
// @access  Private
exports.getInterviews = async (req, res, next) => {
  try {
    const interviews = await Interview.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-questions.audioUrl');
    res.status(200).json({ success: true, count: interviews.length, interviews });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single interview details & report
// @route   GET /api/interviews/:id
// @access  Private
exports.getInterviewById = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }
    res.status(200).json({ success: true, interview });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit answer to current question, evaluate, and get next adaptive question
// @route   POST /api/interviews/:id/answer
// @access  Private
exports.submitAnswer = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({ success: false, message: 'This interview has already been completed.' });
    }

    const {
      answerText = '',
      durationSeconds = 30,
      currentTimestampSeconds = 0,
      visionMetrics = {},
    } = req.body;

    let finalTranscript = answerText;
    let audioFilePath = req.file ? req.file.path : null;

    // 1. Run Whisper Speech Analysis
    const speechResult = await whisperService.transcribeAudio(
      audioFilePath,
      finalTranscript,
      Number(durationSeconds) || 30
    );
    finalTranscript = speechResult.transcript || finalTranscript || 'Answer provided via microphone.';

    // Privacy cleanup: if privacy mode, delete temporary audio file immediately
    if (audioFilePath && fs.existsSync(audioFilePath)) {
      try {
        fs.unlinkSync(audioFilePath);
      } catch (e) {
        console.warn('Could not delete temp audio:', e.message);
      }
    }

    const currentQIdx = interview.questions.length - 1;
    const currentQ = interview.questions[currentQIdx];

    // 2. Evaluate Answer with Gemini
    let answerEvaluation;
    try {
      answerEvaluation = await geminiService.evaluateAnswer({
        role: interview.role,
        question: currentQ.questionText,
        answerText: finalTranscript,
        category: currentQ.category,
        difficulty: currentQ.difficulty,
        recruiterType: interview.recruiterType,
      });
    } catch (aiErr) {
      console.warn('[Answer Eval Warning] Fallback evaluation used:', aiErr.message);
      answerEvaluation = {
        technicalScore: finalTranscript.length > 50 ? 75 : 55,
        communicationScore: speechResult.speechMetrics.wordsPerMinute > 100 ? 80 : 65,
        problemSolvingScore: 70,
        whatWasCorrect: ['Addressed the main question topic directly'],
        whatWasMissing: ['Could provide deeper architectural trade-offs'],
        improvementTips: ['Structure thoughts using Problem-Action-Result format'],
        recommendedConcepts: ['System Design principles', 'Core Data Structures'],
        feedbackSummary: 'Clear answer with foundational understanding.',
      };
    }

    // 3. Save Question Details
    currentQ.answerText = finalTranscript;
    currentQ.durationSeconds = Number(durationSeconds) || 30;
    currentQ.answeredAt = new Date();
    currentQ.speechMetrics = speechResult.speechMetrics;
    currentQ.visionMetrics = {
      faceDetectedPercentage: visionMetrics.faceDetectedPercentage ?? 100,
      eyeContactPercentage: visionMetrics.eyeContactPercentage ?? 100,
      lookingAwayCount: visionMetrics.lookingAwayCount ?? 0,
      framingQuality: visionMetrics.framingQuality || 'Good',
    };
    currentQ.evaluation = answerEvaluation;

    // 4. Append timestamped events to interview timeline
    const baseSecs = Number(currentTimestampSeconds) || (currentQIdx * 60);
    const formatTime = (secs) => {
      const m = Math.floor(secs / 60).toString().padStart(2, '0');
      const s = Math.floor(secs % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    // Add evaluation timestamp events
    if (answerEvaluation.technicalScore >= 80) {
      interview.events.push({
        timestampSeconds: baseSecs + 10,
        formattedTime: formatTime(baseSecs + 10),
        type: 'GOOD',
        category: 'technical',
        title: `Strong Technical Explanation (Q${currentQIdx + 1})`,
        description: answerEvaluation.whatWasCorrect[0] || 'Clear, accurate technical breakdown.',
      });
    } else if (answerEvaluation.technicalScore < 60) {
      interview.events.push({
        timestampSeconds: baseSecs + 12,
        formattedTime: formatTime(baseSecs + 12),
        type: 'NEEDS_IMPROVEMENT',
        category: 'technical',
        title: `Concept Gaps Detected (Q${currentQIdx + 1})`,
        description: answerEvaluation.whatWasMissing[0] || 'Review fundamental concepts for this topic.',
      });
    }

    // Add speech events
    if (speechResult.speechMetrics.timestampEvents) {
      speechResult.speechMetrics.timestampEvents.forEach((ev) => {
        interview.events.push({
          timestampSeconds: baseSecs + ev.timestampSeconds,
          formattedTime: formatTime(baseSecs + ev.timestampSeconds),
          type: ev.type,
          category: ev.category,
          title: ev.title,
          description: ev.description,
        });
      });
    }

    // 5. Determine whether to ask next question or conclude (Default 5 questions per session)
    const MAX_QUESTIONS = 5;
    let nextQuestion = null;
    let isComplete = false;

    if (interview.questions.length < MAX_QUESTIONS) {
      const previousQuestions = interview.questions.map((q) => q.questionText);
      const previousAnswers = interview.questions.map((q) => q.answerText);

      try {
        const nextQData = await geminiService.generateInterviewQuestion({
          role: interview.role,
          company: interview.company,
          interviewType: interview.interviewType,
          difficulty: interview.difficulty,
          recruiterType: interview.recruiterType,
          questionIndex: interview.questions.length,
          previousQuestions,
          previousAnswers,
        });

        interview.questions.push({
          questionIndex: interview.questions.length,
          questionText: nextQData.questionText,
          category: nextQData.category || 'technical',
          difficulty: nextQData.difficulty || interview.difficulty,
          expectedConcepts: nextQData.expectedConcepts || [],
        });
        nextQuestion = interview.questions[interview.questions.length - 1];
      } catch (aiErr) {
        console.warn('[Next Question Warning] Fallback next question used:', aiErr.message);
        interview.questions.push({
          questionIndex: interview.questions.length,
          questionText: 'How do you handle debugging and diagnosing issues when deploying code to production?',
          category: 'problem-solving',
          difficulty: interview.difficulty,
          expectedConcepts: ['Logging', 'Monitoring', 'Root Cause Analysis'],
        });
        nextQuestion = interview.questions[interview.questions.length - 1];
      }
    } else {
      isComplete = true;
    }

    await interview.save();

    res.status(200).json({
      success: true,
      evaluatedQuestion: currentQ,
      isComplete,
      nextQuestion,
      currentQuestionIndex: interview.questions.length - (isComplete ? 0 : 1),
      totalQuestions: MAX_QUESTIONS,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Complete interview & generate final comprehensive report
// @route   POST /api/interviews/:id/end
// @access  Private
exports.finishInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }

    const { totalDurationSeconds = 300 } = req.body;
    interview.totalDurationSeconds = Number(totalDurationSeconds) || 300;
    interview.completedAt = new Date();
    interview.status = 'completed';

    const profile = await CareerProfile.findOne({ user: req.user._id });

    // Generate Final Report via Gemini
    let finalReport;
    try {
      finalReport = await geminiService.generateInterviewReport({ interview, profile });
    } catch (aiErr) {
      console.warn('[Final Report Warning] Fallback report generated:', aiErr.message);
      // Compute averages from answers
      const answered = interview.questions.filter((q) => q.evaluation && q.evaluation.technicalScore);
      const techAvg = answered.length > 0
        ? Math.round(answered.reduce((a, c) => a + c.evaluation.technicalScore, 0) / answered.length)
        : 72;
      const commAvg = answered.length > 0
        ? Math.round(answered.reduce((a, c) => a + c.evaluation.communicationScore, 0) / answered.length)
        : 76;

      finalReport = {
        overallScore: Math.round((techAvg + commAvg) / 2),
        technicalScore: techAvg,
        communicationScore: commAvg,
        problemSolvingScore: 74,
        answerStructureScore: 70,
        strengths: ['Demonstrated clear familiarity with core development topics', 'Good articulation of project workflow'],
        weaknesses: ['Add deeper trade-off discussions regarding performance and scalability'],
        mostImportantImprovement: 'Incorporate quantifiable results and concrete architectural choices into technical answers.',
        recommendedPractice: ['Practice STAR structured behavioral questions', 'Review system design scaling techniques'],
        roleReadiness: techAvg >= 80 ? 'Interview Ready' : 'Developing',
        summary: `Completed mock interview for ${interview.role} at ${interview.company}.`,
      };
    }

    interview.finalReport = finalReport;
    await interview.save();

    res.status(200).json({
      success: true,
      message: 'Interview completed and report generated.',
      interview,
      report: finalReport,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload video/audio recording for Replay Mode
// @route   POST /api/interviews/:id/recording
// @access  Private
exports.uploadRecordingFile = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }

    if (interview.privacyMode !== 'replay') {
      // In privacy mode, enforce no storage
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({
        success: false,
        message: 'This interview was conducted in Privacy Mode. Recordings cannot be stored.',
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No recording file received.' });
    }

    interview.recordingPath = `/uploads/recordings/${req.file.filename}`;
    await interview.save();

    res.status(200).json({
      success: true,
      message: 'Recording securely saved for replay.',
      recordingPath: interview.recordingPath,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete recording file for a specific interview (keeps metrics & report)
// @route   DELETE /api/interviews/:id/recording
// @access  Private
exports.deleteRecording = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview not found.' });
    }

    if (interview.recordingPath) {
      const fullPath = path.join(__dirname, '../../', interview.recordingPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      interview.recordingPath = null;
      await interview.save();
    }

    res.status(200).json({
      success: true,
      message: 'Interview recording permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an entire interview session
// @route   DELETE /api/interviews/:id
// @access  Private
exports.deleteInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, user: req.user._id });
    if (!interview) {
      return res.status(404).json({ success: false, message: 'Interview session not found.' });
    }

    if (interview.recordingPath) {
      const fullPath = path.join(__dirname, '../../', interview.recordingPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await Interview.findByIdAndDelete(interview._id);

    res.status(200).json({
      success: true,
      message: 'Interview session and related data deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
