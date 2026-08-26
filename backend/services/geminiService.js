const axios = require('axios');

/**
 * Clean & extract JSON from LLM markdown response
 */
function cleanJsonText(rawText) {
  if (!rawText) return '{}';
  let cleaned = rawText.trim();
  // Remove markdown code blocks if present
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  // Find first { or [ and last } or ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = 0;
  let endIdx = cleaned.length;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) endIdx = lastBrace + 1;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket !== -1) endIdx = lastBracket + 1;
  }

  const candidate = cleaned.slice(startIdx, endIdx);
  try {
    return JSON.parse(candidate);
  } catch (err) {
    // Attempt relaxed fix for trailing commas
    const relaxed = candidate.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(relaxed);
  }
}

/**
 * Call Gemini API directly via Google AI REST endpoint
 */
async function callGemini(prompt, systemInstruction = '', jsonMode = true) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in .env. Please configure a valid Gemini API key.');
  }

  // Use gemini-1.5-flash or gemini-2.5-flash
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.4,
      topP: 0.95,
      maxOutputTokens: 2500,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (jsonMode) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  try {
    const response = await axios.post(url, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 45000,
    });

    const candidates = response.data.candidates;
    if (!candidates || candidates.length === 0 || !candidates[0].content) {
      throw new Error('Gemini returned an empty response.');
    }

    const outputText = candidates[0].content.parts.map((p) => p.text).join('\n');
    return jsonMode ? cleanJsonText(outputText) : outputText;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
      const errMsg = error.response.data.error.message || 'Gemini API Error';
      throw new Error(`Gemini API Error: ${errMsg}`);
    }
    throw error;
  }
}

// -------------------------------------------------------------
// FEATURE 2, 3, 4: AI INTERVIEW TWIN GENERATION
// -------------------------------------------------------------

async function generateInterviewQuestion({
  role,
  company,
  interviewType,
  difficulty,
  recruiterType,
  questionIndex,
  previousQuestions = [],
  previousAnswers = [],
}) {
  const systemInstruction = `You are a realistic AI Interviewer acting as a "${recruiterType}" at "${company}" for a candidate applying for the "${role}" role.
Interview Type: ${interviewType}. Difficulty: ${difficulty}.
Important Guidelines:
- Note: This is a simulation based on publicly available and generalized interview patterns.
- Ask ONE clear, focused question suited for the recruiter style.
- If previous answers had gaps or interesting claims, formulate an adaptive follow-up question or transition to the next topic.
- Avoid repetitive questions.
- Never diagnose mental health, emotional state, or make absolute hiring promises.
Return ONLY valid JSON matching this schema:
{
  "questionText": "The question to ask the candidate",
  "category": "technical | problem-solving | behavioral | architecture | background",
  "difficulty": "Easy | Medium | Hard",
  "expectedConcepts": ["concept1", "concept2", "concept3"]
}`;

  const prompt = `Context:
Candidate Role: ${role}
Company: ${company}
Recruiter Persona: ${recruiterType}
Difficulty: ${difficulty}
Question Number: ${questionIndex + 1}
Previous Questions & Answers:
${previousQuestions.map((q, i) => `Q${i + 1}: ${q}\nA${i + 1}: ${previousAnswers[i] || 'No answer recorded'}`).join('\n\n')}

Generate question #${questionIndex + 1}.`;

  return await callGemini(prompt, systemInstruction, true);
}

// -------------------------------------------------------------
// FEATURE 8: TECHNICAL ANSWER EVALUATION
// -------------------------------------------------------------

async function evaluateAnswer({ role, question, answerText, category, difficulty, recruiterType }) {
  const systemInstruction = `You are a senior technical assessor. Evaluate the candidate's interview answer objectively and constructively.
Never claim lie detection, emotion detection, or guarantee hiring outcomes.
Return ONLY valid JSON matching this schema:
{
  "technicalScore": 0-100,
  "communicationScore": 0-100,
  "problemSolvingScore": 0-100,
  "whatWasCorrect": ["Point 1", "Point 2"],
  "whatWasMissing": ["Point 1", "Point 2"],
  "improvementTips": ["Tip 1", "Tip 2"],
  "recommendedConcepts": ["Topic 1", "Topic 2"],
  "feedbackSummary": "Concise 2-sentence objective summary of the answer performance."
}`;

  const prompt = `Target Role: ${role}
Recruiter Persona: ${recruiterType}
Category: ${category}
Difficulty: ${difficulty}

Question Asked:
"${question}"

Candidate's Answer:
"${answerText}"

Provide structured technical evaluation.`;

  return await callGemini(prompt, systemInstruction, true);
}

// -------------------------------------------------------------
// FEATURE 10: INTERVIEW FINAL REPORT
// -------------------------------------------------------------

async function generateInterviewReport({ interview, profile }) {
  const systemInstruction = `You are an expert career evaluation engine. Analyze the entire completed mock interview session and produce a comprehensive post-interview report.
Ground all strengths and weaknesses in the actual questions and answers.
Return ONLY valid JSON matching this schema:
{
  "overallScore": 0-100,
  "technicalScore": 0-100,
  "communicationScore": 0-100,
  "problemSolvingScore": 0-100,
  "answerStructureScore": 0-100,
  "strengths": ["Strength 1 with concrete evidence", "Strength 2"],
  "weaknesses": ["Weakness 1 with actionable context", "Weakness 2"],
  "mostImportantImprovement": "Single highest leverage area candidate must improve next.",
  "recommendedPractice": ["Practice action 1", "Practice action 2"],
  "roleReadiness": "Early Stage | Developing | Ready with Minor Polish | Interview Ready | Strong Fit",
  "summary": "3-4 sentence comprehensive assessment summary."
}`;

  const qaSummary = interview.questions
    .map(
      (q, idx) => `Question ${idx + 1}: ${q.questionText}
Answer: ${q.answerText || 'None'}
Evaluation: Tech ${q.evaluation?.technicalScore || 0}, Comm ${q.evaluation?.communicationScore || 0}
Speech Notes: ${q.speechMetrics?.wordsPerMinute || 0} WPM, ${q.speechMetrics?.fillerWordsCount || 0} fillers`
    )
    .join('\n---\n');

  const prompt = `Role: ${interview.role}
Company: ${interview.company}
Interview Type: ${interview.interviewType}
Questions and Answers:
${qaSummary}

Generate the final interview report JSON.`;

  return await callGemini(prompt, systemInstruction, true);
}

// -------------------------------------------------------------
// FEATURE 12: RESUME INTELLIGENCE
// -------------------------------------------------------------

async function analyzeResume({ resumeText, targetRole = 'Software Engineer' }) {
  const systemInstruction = `You are a resume analysis expert. Parse the resume content, extract structured data, assess keyword alignment, quantifiable achievements, and missing skills for the target role.
Do not claim guaranteed ATS bypass or guaranteed interview calls.
Return ONLY valid JSON matching this schema:
{
  "parsedData": {
    "candidateName": "Extracted Name or Candidate",
    "email": "Extracted email or empty",
    "phone": "Extracted phone or empty",
    "education": [{"institution": "...", "degree": "...", "year": "...", "gpa": "..."}],
    "experience": [{"role": "...", "company": "...", "duration": "...", "highlights": ["..."]}],
    "skills": ["Skill 1", "Skill 2"],
    "projects": [{"title": "...", "description": "...", "techStack": ["..."]}],
    "certifications": ["..."]
  },
  "analysis": {
    "overallScore": 0-100,
    "impactScore": 0-100,
    "clarityScore": 0-100,
    "keywordScore": 0-100,
    "roleAlignmentScore": 0-100,
    "strengths": ["..."],
    "weaknesses": ["..."],
    "missingSkills": ["..."],
    "quantifiableSuggestions": ["..."],
    "summary": "Detailed summary of resume effectiveness for the target role."
  }
}`;

  const prompt = `Target Role: ${targetRole}

Resume Text:
"""
${resumeText.slice(0, 10000)}
"""

Extract structured data and generate evaluation JSON.`;

  return await callGemini(prompt, systemInstruction, true);
}

// -------------------------------------------------------------
// FEATURE 14: AI PROJECT EVALUATOR
// -------------------------------------------------------------

async function evaluateProject({ title, tagline, description, techStack, githubUrl, liveDemoUrl, targetRole }) {
  const systemInstruction = `You are a technical project evaluator and hackathon judge. Evaluate this software project across 10 engineering dimensions.
Return ONLY valid JSON matching this schema:
{
  "overallScore": 0-100,
  "innovationScore": 0-100,
  "technicalComplexityScore": 0-100,
  "engineeringQualityScore": 0-100,
  "scalabilityScore": 0-100,
  "userValueScore": 0-100,
  "marketPotentialScore": 0-100,
  "documentationScore": 0-100,
  "presentationScore": 0-100,
  "hackathonReadinessScore": 0-100,
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "improvementSuggestions": ["Suggestion 1", "Suggestion 2"],
  "recommendedNextSteps": ["Step 1", "Step 2"],
  "summary": "Comprehensive 3-sentence project evaluation."
}`;

  const prompt = `Target Role Context: ${targetRole || 'Software Engineer'}
Project Title: ${title}
Tagline: ${tagline || 'N/A'}
Tech Stack: ${Array.isArray(techStack) ? techStack.join(', ') : techStack}
GitHub: ${githubUrl || 'N/A'}
Live Demo: ${liveDemoUrl || 'N/A'}

Project Description:
${description}

Generate full 10-dimension evaluation JSON.`;

  return await callGemini(prompt, systemInstruction, true);
}

// -------------------------------------------------------------
// FEATURE 13: GITHUB INTELLIGENCE
// -------------------------------------------------------------

async function analyzeGitHubSignals({ username, publicReposCount, topLanguages, repos, targetRole }) {
  const systemInstruction = `You are an engineering talent assessor. Evaluate publicly available GitHub metrics and repository descriptions.
Do NOT judge solely on star counts or raw commit counts. Look for engineering rigor, documentation quality, tech breadth, and project depth.
Return ONLY valid JSON matching this schema:
{
  "overallScore": 0-100,
  "codeDiversityScore": 0-100,
  "documentationScore": 0-100,
  "consistencyScore": 0-100,
  "engineeringSignals": ["Signal 1", "Signal 2"],
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "recommendedImprovements": ["Improvement 1", "Improvement 2"],
  "summary": "Objective explanation of GitHub portfolio strength."
}`;

  const repoListSummary = repos
    .slice(0, 15)
    .map((r) => `- ${r.name} (${r.language || 'Various'}): ${r.description || 'No description'}, README: ${r.hasReadme ? 'Yes' : 'No'}`)
    .join('\n');

  const prompt = `GitHub Username: ${username}
Target Role: ${targetRole || 'Software Engineer'}
Public Repositories: ${publicReposCount}
Languages Distribution: ${topLanguages.map((l) => `${l.language} (${l.percentage}%)`).join(', ')}

Sample Repositories:
${repoListSummary}

Analyze GitHub engineering signals.`;

  return await callGemini(prompt, systemInstruction, true);
}

// -------------------------------------------------------------
// FEATURE 15: SKILL GAP ENGINE
// -------------------------------------------------------------

async function analyzeSkillGaps({ currentSkills, targetRole, careerGoal }) {
  const systemInstruction = `You are a Career Skill Gap Engine. Compare the candidate's current verified skills against industry standard expectations for their target role.
Return ONLY valid JSON matching this schema:
{
  "targetRole": "${targetRole}",
  "skillCoveragePercentage": 0-100,
  "verifiedSkills": ["Skill 1", "Skill 2"],
  "skillGaps": [
    {
      "name": "Skill Name",
      "category": "Frontend | Backend | Database | DevOps & Cloud | Core CS & DSA | System Design | Soft Skills",
      "priority": "High | Medium | Low",
      "reason": "Why this skill is needed for this role.",
      "estimatedTimeToLearnHours": 20,
      "recommendedResources": [
        {"title": "Resource Name", "url": "https://...", "type": "Documentation | Course | Project"}
      ]
    }
  ],
  "learningSequenceSummary": "Brief step-by-step order candidate should follow."
}`;

  const prompt = `Target Role: ${targetRole}
Career Goal: ${careerGoal || targetRole}
Current Skills List: ${currentSkills.join(', ')}

Identify real skill gaps and recommended learning priorities.`;

  return await callGemini(prompt, systemInstruction, true);
}

// -------------------------------------------------------------
// FEATURE 16: PERSONAL CAREER ROADMAP
// -------------------------------------------------------------

async function generateRoadmap({ targetRole, currentSkills = [], skillGaps = [], durationMonths = 6 }) {
  const systemInstruction = `You are a Career Roadmap Architect. Generate a realistic month-by-month learning and execution roadmap.
Return ONLY valid JSON matching this schema:
{
  "targetRole": "${targetRole}",
  "durationMonths": ${durationMonths},
  "milestones": [
    {
      "monthIndex": 1,
      "monthTitle": "Month 1: Milestone Name",
      "focusArea": "Core focus",
      "learningGoal": "Clear measurable outcome",
      "tasks": [
        {
          "title": "Task title",
          "description": "Concrete action item",
          "category": "Concept | Coding | Project | System Design",
          "estimatedHours": 10,
          "resources": [{"name": "Documentation/Guide", "url": "https://..."}]
        }
      ]
    }
  ]
}`;

  const prompt = `Target Role: ${targetRole}
Current Skills: ${currentSkills.join(', ')}
Key Skill Gaps: ${skillGaps.join(', ')}
Duration: ${durationMonths} Months

Generate a structured roadmap.`;

  return await callGemini(prompt, systemInstruction, true);
}

// -------------------------------------------------------------
// FEATURE 19: MENTOR AI CONVERSATION
// -------------------------------------------------------------

async function mentorChat({ userMessage, conversationHistory = [], twinContext }) {
  const systemInstruction = `You are CareerTwin Mentor AI, an empathetic, highly analytical personal career advisor.
You have direct access to the user's live Career Twin data snapshot:
Target Role: ${twinContext.targetRole || 'Software Engineer'}
Career Readiness Index: ${twinContext.careerReadinessScore || 'N/A'}/100
Interview Average Technical Score: ${twinContext.avgTechnicalScore || 'N/A'}
Interview Average Communication Score: ${twinContext.avgCommunicationScore || 'N/A'}
Resume Score: ${twinContext.resumeScore || 'N/A'}
Top Skill Gaps: ${twinContext.topGaps?.join(', ') || 'None identified yet'}
Projects Count: ${twinContext.projectsCount || 0}
GitHub Connected: ${twinContext.githubConnected ? 'Yes' : 'No'}

CRITICAL RULES:
- Always reference the user's ACTUAL Career Twin data in your answers instead of generic advice.
- If the user asks why their score is low, reference their actual interview/resume/skill data.
- Never diagnose mental health, emotional state, or make absolute hiring promises.
- Maintain an encouraging, structured, practical tone with actionable bullet points.`;

  const historyFormatted = conversationHistory
    .slice(-6)
    .map((msg) => `${msg.sender.toUpperCase()}: ${msg.text}`)
    .join('\n');

  const prompt = `${historyFormatted ? `Recent Conversation:\n${historyFormatted}\n\n` : ''}User Question: ${userMessage}`;

  return await callGemini(prompt, systemInstruction, false);
}

module.exports = {
  callGemini,
  generateInterviewQuestion,
  evaluateAnswer,
  generateInterviewReport,
  analyzeResume,
  evaluateProject,
  analyzeGitHubSignals,
  analyzeSkillGaps,
  generateRoadmap,
  mentorChat,
};
