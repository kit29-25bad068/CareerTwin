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

const STAGE_PROGRESSION = [
  {
    stage: 1,
    name: 'Introduction & Project Overview',
    theme: 'Candidate introduction, technical background journey in role, and high-level architectural walkthrough of a key showcase project.',
    goal: 'Assess how clearly the candidate presents their background, communication structure, and architectural ownership.',
  },
  {
    stage: 2,
    name: 'Core Language Fundamentals & CS Basics',
    theme: 'Core programming language syntax, runtime execution model, memory layout, OOP principles, data structures, and foundational paradigms.',
    goal: 'Test raw technical fundamentals from first principles.',
  },
  {
    stage: 3,
    name: 'Intermediate Architecture, Concurrency & Framework Design',
    theme: 'Multithreading/concurrency, asynchronous processing, API design patterns, ORM/database integration, and framework mechanics.',
    goal: 'Evaluate practical day-to-day engineering and clean implementation skills.',
  },
  {
    stage: 4,
    name: 'Advanced Scaling, Performance Tuning & Production Debugging',
    theme: 'High-load bottlenecks, memory leak diagnosis, thread dumps / profiling, distributed transactions, database indexing, and critical production outage triage.',
    goal: 'Test senior problem-solving, observability, and deep system understanding.',
  },
  {
    stage: 5,
    name: 'Behavioral STAR Scenario, Leadership & Engineering Trade-Offs',
    theme: 'Situation-Task-Action-Result scenario covering technical debt vs delivery speed, code review conflict resolution, or post-mortem incident ownership.',
    goal: 'Evaluate communication, maturity, teamwork, and decision-making under pressure.',
  },
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
  const currentStage = STAGE_PROGRESSION[Math.min(questionIndex, STAGE_PROGRESSION.length - 1)];
  const randomSeed = Math.random().toString(36).substring(7);

  const systemInstruction = `You are a world-class technical hiring manager acting as a "${recruiterType}" at "${company}" conducting an interview for the "${role}" position.
Interview Type: ${interviewType}. Difficulty Level: ${difficulty}.
Current Interview Stage: Stage ${currentStage.stage} of 5 - "${currentStage.name}".
Stage Goal: ${currentStage.goal}
Stage Focus: ${currentStage.theme}
Session Seed: ${randomSeed}

STRICT PROFESSIONAL INTERVIEW STRUCTURE:
- Question 1 (Stage 1): MUST open warmly with a greeting, ask the candidate for a concise self-introduction, their technical background in ${role}, and an architectural walkthrough of a major project they've built.
- Question 2 (Stage 2): MUST focus on core basics and fundamentals for ${role} (e.g. For Java: OOP principles, JVM memory model, Collections vs Streams, immutability, pass-by-value).
- Question 3 (Stage 3): MUST focus on intermediate implementation and concurrency (e.g. For Java: Thread safety, CompletableFuture, Spring Boot dependency injection, JPA query optimizations).
- Question 4 (Stage 4): MUST present an advanced real-world production incident or performance scaling scenario (e.g. For Java: 100% CPU deadlock triage, OutOfMemoryError heap dump analysis, database connection pool exhaustion).
- Question 5 (Stage 5): MUST ask a structured behavioral question using the STAR method (e.g. handling a major production bug, resolving technical disagreements with peers, balancing tech debt with tight deadlines).

GUIDELINES:
- Ask ONE clear, scenario-driven question appropriate for Stage ${currentStage.stage}.
- Never repeat or rephrase previous questions.
- If previous answers had strengths or gaps, acknowledge them briefly and transition logically.
- Return ONLY valid JSON matching this schema:
{
  "questionText": "The exact interview question to ask the candidate",
  "category": "background | technical | problem-solving | architecture | behavioral",
  "difficulty": "Easy | Medium | Hard",
  "expectedConcepts": ["concept1", "concept2", "concept3"],
  "stageName": "${currentStage.name}"
}`;

  const prompt = `Target Role: ${role}
Company: ${company}
Recruiter Persona: ${recruiterType}
Difficulty: ${difficulty}
Turn: #${questionIndex + 1} of 5 (Stage ${currentStage.stage}: ${currentStage.name})

Interview History So Far:
${previousQuestions.length > 0
  ? previousQuestions.map((q, i) => `[Turn ${i + 1}] Q: ${q}\nA: ${previousAnswers[i] || 'No answer recorded'}`).join('\n\n')
  : 'None (This is the opening question of the interview)'}

Generate Question #${questionIndex + 1} according to the Stage ${currentStage.stage} rules.`;

  return await callGemini(prompt, systemInstruction, true, { temperature: 0.85 });
}

// -------------------------------------------------------------
// DYNAMIC MULTI-STAGE FALLBACK QUESTION GENERATOR
// -------------------------------------------------------------
function getDynamicFallbackQuestion(role = 'Software Engineer', questionIndex = 0, difficulty = 'Medium') {
  const normalizedRole = role.toLowerCase();

  const javaQuestions = [
    // Stage 1: Intro & Project Overview
    [
      {
        questionText: "Welcome to our interview! To begin, please introduce yourself, give a brief overview of your background in Java development, and walk me through the architecture of a major Java/Spring Boot project you have built.",
        category: "background",
        expectedConcepts: ["Self Introduction", "Project Architecture", "Spring Boot", "Core Tech Stack"],
      },
      {
        questionText: "Hello and welcome! Let's kick off with an introduction: could you share your engineering background and walk me through a flagship Java project you're most proud of, detailing the technical decisions you made?",
        category: "background",
        expectedConcepts: ["Candidate Background", "Service Layer Design", "Database Architecture", "Key Challenges"],
      },
    ],
    // Stage 2: Core Language Fundamentals & CS Basics
    [
      {
        questionText: "Let's dive into Java core fundamentals: How does the JVM manage memory between the Heap (Young vs Old Generation) and Stack, and how does Garbage Collection work under the hood?",
        category: "technical",
        expectedConcepts: ["JVM Memory Model", "Generational GC", "Stack vs Heap", "Object Lifecycle"],
      },
      {
        questionText: "In core Java, what are the differences between HashMap, ConcurrentHashMap, and TreeMap in terms of internal hashing, bucket collisions, and thread-safety?",
        category: "technical",
        expectedConcepts: ["HashMap Internal Buckets", "ConcurrentHashMap Segment Locking", "TreeMap Red-Black Tree", "equals & hashCode contract"],
      },
    ],
    // Stage 3: Intermediate Concurrency & Framework Architecture
    [
      {
        questionText: "When building high-throughput services with Spring Boot and Java, how do you handle asynchronous parallel processing using CompletableFuture and ExecutorService, and how do you prevent race conditions?",
        category: "problem-solving",
        expectedConcepts: ["CompletableFuture", "ThreadPoolExecutor", "Atomic Variables / Locks", "Thread Safety"],
      },
      {
        questionText: "In Spring Data JPA and Hibernate, how do you detect and resolve the N+1 query problem, and what are the trade-offs between JOIN FETCH, @EntityGraph, and DTO projections?",
        category: "technical",
        expectedConcepts: ["N+1 Query Problem", "JOIN FETCH", "@EntityGraph", "DTO Projections", "Hibernate Lazy Loading"],
      },
    ],
    // Stage 4: Advanced Performance Tuning & Production Debugging
    [
      {
        questionText: "Imagine your Java microservice in production experiences sudden 100% CPU spikes and thread deadlocks after a release. What exact step-by-step diagnostic process and tools (e.g. jstack, jcmd, VisualVM) would you use to isolate and resolve it?",
        category: "problem-solving",
        expectedConcepts: ["Thread Dumps", "jstack / jcmd", "CPU Profiling", "Deadlock Graph Analysis", "Rollback Strategy"],
      },
      {
        questionText: "How do you diagnose and fix a slow memory leak causing OutOfMemoryError (Metaspace or Heap) in a live Java application, and how do you analyze heap dumps using Eclipse MAT?",
        category: "problem-solving",
        expectedConcepts: ["OutOfMemoryError", "Heap Dump Analysis", "Eclipse Memory Analyzer Tool", "GC Overhead Limit"],
      },
    ],
    // Stage 5: Behavioral STAR Leadership & Trade-Offs
    [
      {
        questionText: "Tell me about a time when you had to balance delivering a high-priority feature on a tight deadline versus refactoring critical technical debt or optimizing performance in Java. How did you structure that decision?",
        category: "behavioral",
        expectedConcepts: ["STAR Method", "Technical Debt vs Velocity", "Stakeholder Communication", "Engineering Trade-offs"],
      },
      {
        questionText: "Describe a situation where a critical bug or production incident slipped past code review and automated tests. How did you take ownership, communicate with your team, and establish safeguards to prevent recurrence?",
        category: "behavioral",
        expectedConcepts: ["Incident Ownership", "Blameless Post-Mortem", "Automated Testing Safeguards", "Continuous Improvement"],
      },
    ],
  ];

  const generalQuestions = [
    // Stage 1
    [
      {
        questionText: `Welcome to the interview! To start, please introduce yourself, describe your experience as a ${role}, and give an architectural overview of a key project you've engineered.`,
        category: "background",
        expectedConcepts: ["Self Introduction", "Project Architecture", "Technology Decisions"],
      },
    ],
    // Stage 2
    [
      {
        questionText: "Let's explore foundational concepts: How do you design data structures, manage memory allocation, and enforce clean object-oriented or functional principles in your code?",
        category: "technical",
        expectedConcepts: ["Core Data Structures", "Memory Management", "Clean Code & Design Principles"],
      },
    ],
    // Stage 3
    [
      {
        questionText: "How do you design scalable RESTful APIs, manage concurrent requests, and optimize database querying in your backend services?",
        category: "architecture",
        expectedConcepts: ["API Design", "Concurrency Control", "Database Indexing & Caching"],
      },
    ],
    // Stage 4
    [
      {
        questionText: "Walk me through a complex production bug or performance bottleneck you diagnosed under pressure. What tools and structured root-cause methodology did you employ?",
        category: "problem-solving",
        expectedConcepts: ["Observability & Logs", "Root Cause Analysis", "Mitigation & Patching"],
      },
    ],
    // Stage 5
    [
      {
        questionText: "Describe a situation where you had a significant technical disagreement with a teammate regarding architecture or code design. How did you reach a consensus constructively?",
        category: "behavioral",
        expectedConcepts: ["STAR Framework", "Constructive Dialogue", "Engineering Compromise"],
      },
    ],
  ];

  const bank = normalizedRole.includes('java') ? javaQuestions : generalQuestions;
  const stagePool = bank[Math.min(questionIndex, bank.length - 1)] || generalQuestions[0];
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
  const systemInstruction = `You are a senior hiring manager and principal engineering assessor. Evaluate the candidate's interview answer with rigorous structure and constructive feedback.
Never claim lie detection, emotion detection, or guarantee hiring outcomes.

EVALUATION CRITERIA:
1. Response Structure & Progression: Did the candidate start with a clear high-level summary/definition, explain core mechanics, and finish with practical considerations or trade-offs?
2. Technical Depth & Precision: Are technical terms, architectures, and concepts accurate for ${role}?
3. Communication & Clarity: Was the answer concise, articulate, and free of rambling?

Return ONLY valid JSON matching this schema:
{
  "technicalScore": 0-100,
  "communicationScore": 0-100,
  "problemSolvingScore": 0-100,
  "structureScore": 0-100,
  "whatWasCorrect": ["Accurate concept 1 explained well", "Accurate concept 2"],
  "whatWasMissing": ["Missing concept 1 that should be mentioned", "Gaps in explanation"],
  "improvementTips": ["Concrete tip on how to structure the answer better", "Technical depth enhancement"],
  "recommendedConcepts": ["Topic to study 1", "Topic to study 2"],
  "feedbackSummary": "Concise 2-sentence objective assessment of the candidate's answer structure and depth."
}`;

  const prompt = `Target Role: ${role}
Recruiter Persona: ${recruiterType}
Category: ${category}
Difficulty: ${difficulty}

Question Asked:
"${question}"

Candidate's Answer:
"${answerText}"

Provide structured technical & structural evaluation.`;

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
