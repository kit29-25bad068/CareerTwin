# CareerTwin AI

> **"Don't just prepare for interviews. Build your career with an AI that grows with you."**

CareerTwin AI is a privacy-first AI career intelligence platform for students and job seekers. Unlike generic conversational chatbots, CareerTwin constructs a continuously evolving **Digital Career Twin** combining your career goals, verified skills, resume, GitHub repositories, showcase projects, interactive AI mock interviews, speech pacing, vision indicators, skill gaps, personalized roadmap, and mentorship.

---

## 🏗️ Technology Stack

Strictly built using a clean, beginner-friendly architecture:

- **Frontend:** HTML5, Modern CSS3, Vanilla JavaScript (ES6+ Modules)
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose ODM
- **AI Intelligence:** Google Gemini API
- **Speech Intelligence:** Whisper API (Speech-to-Text & Cadence)
- **Vision Intelligence:** JavaScript & MediaPipe (Objective face presence & eye contact)
- **Audio & Video:** MediaRecorder API & Web Audio API
- **GitHub Intelligence:** GitHub REST API
- **Charts & Visualization:** Chart.js
- **Authentication:** JWT, bcryptjs, Express middleware
- **File Handling:** Node.js & Multer (PDF resumes & secure replay media)

---

## 📁 Project Structure

```
CareerTwin/
├── frontend/
│   ├── index.html                   # Landing page
│   ├── login.html                   # User sign-in
│   ├── register.html                # User registration
│   ├── dashboard.html               # Central Command Dashboard
│   ├── career-twin.html             # Digital Career Twin 360-degree Intelligence
│   ├── interview.html               # Live AI Mock Interview room (Audio/Video/Speech)
│   ├── interview-report.html        # Detailed post-interview report with clickable timestamps
│   ├── resume.html                  # Resume upload (PDF) & AI deep analysis
│   ├── github.html                  # GitHub profile & repository intelligence
│   ├── projects.html                # AI Project Evaluator (10-dimension rubric)
│   ├── skills.html                  # Skill Matrix & Skill Gap analysis
│   ├── roadmap.html                 # Dynamic Career Roadmap & Task tracker
│   ├── goals.html                   # Career Goal Engine
│   ├── mentor.html                  # Context-aware Mentor AI chat
│   ├── progress.html                # Career Memory & Historical Trends
│   ├── settings.html                # Data Control, Privacy Settings, Export/Delete
│   ├── css/
│   │   ├── main.css                 # Core design system (dark modern theme, variables)
│   │   ├── components.css           # Cards, buttons, forms, badges, score dials, toasts
│   │   └── pages.css                # Page-specific styling (interview room, charts, twin)
│   └── js/
│       ├── api.js                   # Centralized API fetch client with JWT management
│       ├── auth.js                  # Auth state guard & token helper
│       ├── navbar.js                # Responsive sidebar/header navigation component
│       ├── vision.js                # MediaPipe/Face presence & framing tracker
│       ├── audio.js                 # MediaRecorder, AudioContext & speech visualization
│       ├── interview.js             # Live interview orchestrator & turn-taking
│       ├── report.js                # Report renderer & video replay seeker
│       ├── charts.js                # Chart.js initializers & theme presets
│       └── utils.js                 # UI toasts, formatters, loading overlays, modals
│
├── backend/
│   ├── server.js                    # Express app entrypoint & middleware setup
│   ├── config/
│   │   └── db.js                    # MongoDB Mongoose connection handler
│   ├── models/
│   │   ├── User.js                  # User credentials & preferences
│   │   ├── CareerProfile.js         # Education, target role, domain, background
│   │   ├── CareerGoal.js            # Goals, milestones, target companies
│   │   ├── Skill.js                 # Verified skills & gap items
│   │   ├── Interview.js             # Questions, answers, scores, timestamps, replay link
│   │   ├── Resume.js                # Parsed resume data, scores, suggestions
│   │   ├── Project.js               # Projects & evaluation metrics
│   │   ├── GitHubProfile.js         # Repos, language breakdown, engineering signals
│   │   ├── Roadmap.js               # Roadmap milestones and task checklist
│   │   ├── Recommendation.js        # Smart proactive recommendations
│   │   └── MentorConversation.js    # Multi-turn context-aware mentor history
│   ├── middleware/
│   │   ├── auth.js                  # JWT authentication guard
│   │   ├── upload.js                # Multer file upload (PDF resumes & replay media)
│   │   └── errorHandler.js          # Centralized error handler & safe API error responses
│   ├── services/
│   │   ├── geminiService.js         # Centralized Gemini AI engine (structured JSON prompts)
│   │   ├── whisperService.js        # Whisper Speech-to-Text & Speech Intelligence
│   │   ├── githubService.js         # GitHub REST API client & signal extractor
│   │   ├── resumeParserService.js   # PDF text extraction & structuring
│   │   └── careerTwinService.js     # Core Twin Engine: Readiness Index & aggregated signals
│   ├── controllers/                 # Express controllers for each route domain
│   └── routes/                      # Express route definitions
│
├── uploads/                         # Resumes & Replay recordings (gitignored)
├── test/
│   └── test-app.js                  # Automated verification & test suite
├── .env.example                     # Sample environment variables
├── .gitignore                       # Node, logs, uploads, .env
├── package.json                     # Scripts & dependencies
└── README.md                        # Documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MongoDB** (Local instance or MongoDB Atlas connection URI)
- **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))

### 2. Installation
Navigate to the project root directory:
```bash
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` with your credentials:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/careertwin
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
WHISPER_API_KEY=your_whisper_api_key_here
GITHUB_TOKEN=your_github_token_here (optional)
```

### 4. Running Locally
Start the server:
```bash
npm start
```
Or for development with automatic restart:
```bash
npm run dev
```

Open your browser at **`http://localhost:5000`**.

---

## 🛡️ Dual Privacy System

CareerTwin AI is built with privacy at its foundation:

1. **Privacy Mode (Default):**
   - Audio/video streams are processed in memory and temporary files are **immediately deleted**.
   - Raw recordings are **never** stored permanently on the server.
   - Only derived analytical metrics and the final score report are retained.

2. **Replay Mode (Explicit Consent):**
   - Video and audio are securely stored for timestamp-based replay.
   - Never exposed through public URLs.
   - One-click deletion of video files from the settings page or interview report.

---

## 🌟 Core Features Walkthrough

1. **User & Career Profile:** Comprehensive onboarding capturing target role, degree, experience level, and preferred industries.
2. **AI Interview Twin:** Conversational mock interviews that ask follow-up questions based on previous answers.
3. **Company Twin:** Simulates patterns for Google, Amazon, Microsoft, TCS, Startups, or Custom Companies.
4. **Recruiter Twin:** Select from Technical Interviewer, HR, Hiring Manager, or Startup Founder personas.
5. **Speech Intelligence:** Analyzes Words-Per-Minute (WPM), speech rate, long pauses, and counts filler words (`um`, `uh`, `like`, `actually`, `basically`).
6. **Vision Intelligence:** Optional MediaPipe-powered presence tracking, eye-contact estimation, and framing checks.
7. **Technical Answer Intelligence:** Structured Gemini evaluation grading technical depth, missing trade-offs, and concept correctness.
8. **Timestamped Interview Events:** Clickable timeline highlights (`00:32 GOOD: Strong response structure`, `01:10 IMPROVEMENT: 5 filler words`).
9. **Interview Report:** Post-interview scorecard with role readiness tier and actionable improvement items.
10. **Career Memory Engine:** Historical tracking showing how your technical and communication scores improve over multiple sessions.
11. **Resume Intelligence:** PDF text extraction, keyword density analysis, quantifiable impact evaluation, and missing skills detection.
12. **GitHub Intelligence:** Analyzes public repositories, language distribution, README quality, and engineering signals.
13. **AI Project Evaluator:** Grades projects across a 10-dimension rubric (Complexity, Innovation, Scalability, Docs, Hackathon Readiness).
14. **Skill Gap Engine:** Compares verified competencies against target role requirements and prioritizes gaps.
15. **Personal Career Roadmap:** Month-by-month learning milestones with interactive task checklists.
16. **Career Goal Engine:** Define target roles and deadlines to dynamically sync skill gaps and recommendations.
17. **Career Readiness Index:** Explainable composite score (0-100) supported by real evidence.
18. **Mentor AI:** Chatbot injected with live Career Twin context (scores, gaps, goals) for grounded career guidance.
19. **Smart Recommendations:** Proactive, data-backed suggestions prioritizing your highest-leverage next action.
20. **Complete Data Control:** One-click JSON data export, recording wipes, memory resets, and permanent account deletion.

---

## 📡 API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new candidate account |
| `POST` | `/api/auth/login` | Authenticate user & receive JWT |
| `GET` | `/api/profile` | Retrieve user career profile |
| `PUT` | `/api/profile` | Update profile and target role |
| `GET` | `/api/career-twin` | Retrieve 360-degree aggregated Twin state & Readiness Index |
| `POST` | `/api/interviews` | Initialize new AI mock interview |
| `POST` | `/api/interviews/:id/answer` | Submit answer (audio/text) for evaluation |
| `POST` | `/api/interviews/:id/end` | Finish interview & generate final report |
| `POST` | `/api/resume/upload` | Upload & analyze PDF resume |
| `POST` | `/api/github/sync` | Sync and inspect GitHub username |
| `POST` | `/api/projects` | Evaluate showcase project on 10 dimensions |
| `POST` | `/api/skills/gap-analysis` | Run AI skill gap detection |
| `POST` | `/api/roadmap/generate` | Generate personalized phased roadmap |
| `POST` | `/api/mentor/chat` | Chat with Context-Aware Mentor AI |
| `GET` | `/api/privacy/export` | Download full Career Twin as JSON |
| `DELETE` | `/api/privacy/account` | Permanently delete account and all data |

---

## 🧪 Running Diagnostic Tests

To run the automated verification suite:
```bash
npm test
```

---

## 📄 License

This project is licensed under the MIT License.
