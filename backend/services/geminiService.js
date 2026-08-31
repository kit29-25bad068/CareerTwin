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
/**
 * Call Gemini API directly via Google AI REST endpoint with multi-model fallback
 */
async function callGemini(prompt, systemInstruction = '', jsonMode = true, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured in .env. Please configure a valid Gemini API key.');
  }

  const modelsToTry = [
    process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: options.temperature !== undefined ? options.temperature : 0.85,
          topP: 0.95,
          maxOutputTokens: options.maxTokens || 2500,
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

      const response = await axios.post(url, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000,
      });

      const candidates = response.data?.candidates;
      if (!candidates || candidates.length === 0 || !candidates[0].content) {
        throw new Error('Gemini returned an empty response.');
      }

      const outputText = candidates[0].content.parts.map((p) => p.text).join('\n');
      return jsonMode ? cleanJsonText(outputText) : outputText;
    } catch (error) {
      lastError = error;
      const errMsg = error.response?.data?.error?.message || error.message;
      console.warn(`[Gemini API Warning] Model ${modelName} failed (${errMsg}). Trying fallback model...`);
    }
  }

  throw lastError || new Error('All Gemini models failed.');
}

// -------------------------------------------------------------
// FEATURE 2, 3, 4: AI INTERVIEW TWIN GENERATION
// -------------------------------------------------------------

const STAGE_TOPICS = [
  'Core Role Fundamentals, OOP / Architecture & Language Internals',
  'Concurrency, Multi-Threading, Memory Management & Performance Tuning',
  'System Design, Database Transactions, Indexing & REST/Microservices',
  'Real-World Production Incidents, Edge Cases, Bug Triage & Debugging',
  'Behavioral STAR Scenario, Technical Trade-Offs & Engineering Leadership',
];

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
  const stageGuide = STAGE_TOPICS[questionIndex % STAGE_TOPICS.length];
  const randomSeed = Math.random().toString(36).substring(7);

  const systemInstruction = `You are a top-tier technical interviewer acting as a "${recruiterType}" at "${company}" interviewing a candidate for the "${role}" role.
Interview Type: ${interviewType}. Difficulty: ${difficulty}. Current Stage Theme: "${stageGuide}".
Random Session Seed: ${randomSeed}.

CRITICAL QUESTION DESIGN RULES:
- Ask ONE clear, highly engaging, scenario-driven interview question appropriate for ${role} at ${difficulty} level.
- NEVER repeat or paraphrase any previously asked question.
- If previous answers had strengths or gaps, formulate an adaptive follow-up or smoothly transition to the stage theme: "${stageGuide}".
- For technical roles (e.g. Java Developer, Python, Backend, Frontend), ask deep, concrete, practical questions (e.g. for Java: Garbage Collection tuning, Spring Boot transaction management, CompletableFuture async pipelines, JPA N+1 query optimization, deadlock prevention).
- Return ONLY valid JSON matching this schema:
{
  "questionText": "The exact interview question to ask the candidate",
  "category": "technical | problem-solving | behavioral | architecture | background",
  "difficulty": "Easy | Medium | Hard",
  "expectedConcepts": ["concept1", "concept2", "concept3"]
}`;

  const prompt = `Context:
Candidate Target Role: ${role}
Company Representation: ${company}
Recruiter Persona: ${recruiterType}
Difficulty Level: ${difficulty}
Question Turn: #${questionIndex + 1} of 5
Theme Focus: ${stageGuide}

History of Previous Questions & Candidate Answers:
${previousQuestions.length > 0
  ? previousQuestions.map((q, i) => `[Turn ${i + 1}] Q: ${q}\nA: ${previousAnswers[i] || 'No answer recorded'}`).join('\n\n')
  : 'None (This is the opening question)'}

Generate a fresh, unique, and insightful question for Turn #${questionIndex + 1}.`;

  return await callGemini(prompt, systemInstruction, true, { temperature: 0.85 });
}

// -------------------------------------------------------------
// DYNAMIC MULTI-STAGE FALLBACK QUESTION GENERATOR
// -------------------------------------------------------------
function getDynamicFallbackQuestion(role = 'Software Engineer', questionIndex = 0, difficulty = 'Medium') {
  const normalizedRole = role.toLowerCase();

  const javaQuestions = [
    [
      {
        questionText: "Welcome! To start off, could you walk me through the architecture of a complex Java/Spring Boot project you've built, focusing on how you structured your service and data access layers?",
        category: "architecture",
        expectedConcepts: ["Spring Boot", "Service Layer", "Dependency Injection", "Repository Pattern"],
      },
      {
        questionText: "Let's dive into Java core fundamentals: How does the JVM handle Garbage Collection across Young and Old generations, and how do you diagnose memory leaks in production?",
        category: "technical",
        expectedConcepts: ["JVM Generational GC", "Heap Memory", "OutOfMemoryError", "VisualVM/Profiling"],
      },
    ],
    [
      {
        questionText: "In a high-throughput Java application, how would you design a thread-safe caching mechanism or handle asynchronous parallel tasks using CompletableFuture and ExecutorService?",
        category: "problem-solving",
        expectedConcepts: ["CompletableFuture", "ConcurrentHashMap", "Thread Pools", "Race Condition Prevention"],
      },
      {
        questionText: "What is the difference between Synchronized blocks, ReentrantLock, and Volatile variables in Java, and in what real-world concurrency scenario would you choose each?",
        category: "technical",
        expectedConcepts: ["ReentrantLock", "Volatile Memory Visibility", "Atomic Classes", "Deadlock Prevention"],
      },
    ],
    [
      {
        questionText: "When working with Spring Data JPA and Hibernate, how do you identify and resolve the N+1 SELECT query problem, and how do you manage distributed transactions across microservices?",
        category: "technical",
        expectedConcepts: ["N+1 Problem", "JOIN FETCH", "@EntityGraph", "Saga Pattern / Distributed Transactions"],
      },
      {
        questionText: "How do you design a resilient REST API in Java using Spring Boot that handles rate limiting, circuit breaking with Resilience4j, and structured error responses?",
        category: "architecture",
        expectedConcepts: ["Resilience4j", "Circuit Breakers", "@ControllerAdvice", "API Idempotency"],
      },
    ],
    [
      {
        questionText: "Imagine your Java microservice in production is experiencing sudden 100% CPU spikes and thread deadlocks after a new deployment. What step-by-step methodology would you use to isolate and resolve the root cause?",
        category: "problem-solving",
        expectedConcepts: ["Thread Dumps", "jstack / jcmd", "CPU Profiling", "Rollback & Patch Strategy"],
      },
      {
        questionText: "How do you optimize SQL database indexing and connection pooling (e.g. HikariCP) in a Java backend when query latency starts degrading under heavy concurrent traffic?",
        category: "technical",
        expectedConcepts: ["HikariCP Pool Tuning", "B-Tree Indexing", "Execution Plans (EXPLAIN)", "Query Batching"],
      },
    ],
    [
      {
        questionText: "Tell me about a time when you had to balance delivering a feature quickly versus refactoring existing technical debt or addressing scalability in Java. How did you negotiate that trade-off?",
        category: "behavioral",
        expectedConcepts: ["STAR Method", "Technical Debt Management", "Stakeholder Communication", "Engineering Trade-offs"],
      },
      {
        questionText: "Describe a situation where a major bug or production outage slipped past code review. How did you take ownership, communicate with the team, and prevent recurrence?",
        category: "behavioral",
        expectedConcepts: ["Root Cause Analysis", "Post-Mortem", "Automated Testing", "Accountability"],
      },
    ],
  ];

  const generalQuestions = [
    [
      {
        questionText: `Can you walk me through the system architecture of a full-scale project you've developed as a ${role}, highlighting your core tech stack decisions?`,
        category: "architecture",
        expectedConcepts: ["System Architecture", "Tech Stack Trade-offs", "Data Flow"],
      },
    ],
    [
      {
        questionText: "How do you ensure state management, data integrity, and low-latency response times when handling high-concurrency user requests?",
        category: "technical",
        expectedConcepts: ["Concurrency Control", "Caching", "Data Integrity"],
      },
    ],
    [
      {
        questionText: "How do you design secure, scalable RESTful or GraphQL APIs with authentication (JWT/OAuth), input validation, and database indexing?",
        category: "architecture",
        expectedConcepts: ["Authentication", "API Security", "Database Query Optimization"],
      },
    ],
    [
      {
        questionText: "Walk me through a difficult debugging scenario you encountered in production where standard unit tests did not catch the issue. How did you resolve it?",
        category: "problem-solving",
        expectedConcepts: ["Log Analysis", "Root Cause Analysis", "Observability"],
      },
    ],
    [
      {
        questionText: "Tell me about a time when you received critical feedback during a technical code review or had a disagreement with a team member on architecture. How did you handle it?",
        category: "behavioral",
        expectedConcepts: ["Constructive Collaboration", "Communication", "Engineering Growth"],
      },
    ],
  ];

  const bank = normalizedRole.includes('java') ? javaQuestions : generalQuestions;
  const stagePool = bank[questionIndex % bank.length] || generalQuestions[0];
  const chosen = stagePool[Math.floor(Math.random() * stagePool.length)];

  return {
    questionText: chosen.questionText,
    category: chosen.category,
    difficulty,
    expectedConcepts: chosen.expectedConcepts,
  };
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
  getDynamicFallbackQuestion,
};
