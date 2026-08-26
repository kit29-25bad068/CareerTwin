const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Initialize Express App
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static frontend assets
app.use(express.static(path.join(__dirname, '../frontend')));

// Uploads (resumes and recordings)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date(),
    service: 'CareerTwin AI Platform',
    version: '1.0.0',
  });
});

// Mount API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/profile', require('./routes/profileRoutes'));
app.use('/api/interviews', require('./routes/interviewRoutes'));
app.use('/api/resume', require('./routes/resumeRoutes'));
app.use('/api/github', require('./routes/githubRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/skills', require('./routes/skillRoutes'));
app.use('/api/roadmap', require('./routes/roadmapRoutes'));
app.use('/api/goals', require('./routes/goalRoutes'));
app.use('/api/mentor', require('./routes/mentorRoutes'));
app.use('/api/career-twin', require('./routes/careerTwinRoutes'));
app.use('/api/recommendations', require('./routes/careerTwinRoutes'));
app.use('/api/privacy', require('./routes/privacyRoutes'));

// Fallback for HTML page navigation
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  const potentialHtmlFile = path.join(__dirname, '../frontend', `${req.path.replace(/^\//, '')}.html`);
  const directPath = path.join(__dirname, '../frontend', req.path);

  const fs = require('fs');
  if (fs.existsSync(potentialHtmlFile)) {
    return res.sendFile(potentialHtmlFile);
  }
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return res.sendFile(directPath);
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 CareerTwin AI Server running on port ${PORT}`);
  console.log(`🔗 Local App: http://localhost:${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🛡️ Privacy Mode: Active by default (No recordings stored unless opted in)`);
  console.log(`====================================================`);
});

module.exports = app;
