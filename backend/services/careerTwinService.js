const CareerProfile = require('../models/CareerProfile');
const CareerGoal = require('../models/CareerGoal');
const Skill = require('../models/Skill');
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const Project = require('../models/Project');
const GitHubProfile = require('../models/GitHubProfile');
const Roadmap = require('../models/Roadmap');
const Recommendation = require('../models/Recommendation');

/**
 * Compile the full 360-degree Career Twin State and compute explainable Readiness Index
 */
async function getCareerTwinState(userId) {
  // Parallel fetch of all user data
  const [
    profile,
    activeGoal,
    skills,
    interviews,
    resume,
    projects,
    github,
    roadmap,
  ] = await Promise.all([
    CareerProfile.findOne({ user: userId }),
    CareerGoal.findOne({ user: userId, status: 'Active' }).sort({ updatedAt: -1 }),
    Skill.find({ user: userId }),
    Interview.find({ user: userId, status: 'completed' }).sort({ completedAt: -1 }),
    Resume.findOne({ user: userId }),
    Project.find({ user: userId }).sort({ updatedAt: -1 }),
    GitHubProfile.findOne({ user: userId }),
    Roadmap.findOne({ user: userId }),
  ]);

  const targetRole = activeGoal?.targetRole || profile?.targetRole || 'Full Stack Developer';

  // 1. Process Skills
  const verifiedSkills = skills.filter((s) => !s.isGap);
  const skillGaps = skills.filter((s) => s.isGap);
  const totalSkillsCount = verifiedSkills.length + skillGaps.length;
  const skillCoveragePercentage =
    totalSkillsCount > 0 ? Math.round((verifiedSkills.length / totalSkillsCount) * 100) : null;

  // 2. Process Interviews
  const completedInterviewsCount = interviews.length;
  let avgTechnicalScore = null;
  let avgCommunicationScore = null;
  let avgProblemSolvingScore = null;
  let avgOverallInterviewScore = null;

  if (completedInterviewsCount > 0) {
    const sumTech = interviews.reduce((acc, curr) => acc + (curr.finalReport?.technicalScore || 0), 0);
    const sumComm = interviews.reduce((acc, curr) => acc + (curr.finalReport?.communicationScore || 0), 0);
    const sumPS = interviews.reduce((acc, curr) => acc + (curr.finalReport?.problemSolvingScore || 0), 0);
    const sumOverall = interviews.reduce((acc, curr) => acc + (curr.finalReport?.overallScore || 0), 0);

    avgTechnicalScore = Math.round(sumTech / completedInterviewsCount);
    avgCommunicationScore = Math.round(sumComm / completedInterviewsCount);
    avgProblemSolvingScore = Math.round(sumPS / completedInterviewsCount);
    avgOverallInterviewScore = Math.round(sumOverall / completedInterviewsCount);
  }

  // 3. Process Projects
  const projectsCount = projects.length;
  let avgProjectScore = null;
  if (projectsCount > 0) {
    const sumProj = projects.reduce((acc, curr) => acc + (curr.evaluation?.overallScore || 0), 0);
    avgProjectScore = Math.round(sumProj / projectsCount);
  }

  // 4. Process Resume & GitHub
  const resumeScore = resume?.analysis?.overallScore ?? null;
  const githubScore = github?.analysis?.overallScore ?? null;
  const roadmapProgress = roadmap?.progressPercentage ?? 0;

  // -------------------------------------------------------------
  // FEATURE 18: CAREER READINESS INDEX CALCULATION (Explainable)
  // -------------------------------------------------------------
  const breakdown = [];
  let totalWeightedScore = 0;
  let totalWeightApplied = 0;

  // Dimension 1: Technical Knowledge & Interview (Weight: 25%)
  if (avgTechnicalScore !== null) {
    totalWeightedScore += avgTechnicalScore * 0.25;
    totalWeightApplied += 0.25;
    breakdown.push({
      dimension: 'Technical Knowledge & Interviews',
      weight: 25,
      score: avgTechnicalScore,
      status: 'Calculated',
      evidence: `Based on ${completedInterviewsCount} completed mock interview(s) (Avg: ${avgTechnicalScore}/100).`,
    });
  } else {
    breakdown.push({
      dimension: 'Technical Knowledge & Interviews',
      weight: 25,
      score: null,
      status: 'No data yet',
      evidence: 'Complete at least 1 mock interview session to unlock technical readiness score.',
    });
  }

  // Dimension 2: Problem Solving & Projects (Weight: 20%)
  const psScoreCandidate = avgProjectScore !== null ? avgProjectScore : avgProblemSolvingScore;
  if (psScoreCandidate !== null) {
    totalWeightedScore += psScoreCandidate * 0.2;
    totalWeightApplied += 0.2;
    breakdown.push({
      dimension: 'Problem Solving & Projects',
      weight: 20,
      score: psScoreCandidate,
      status: 'Calculated',
      evidence: `Based on ${projectsCount} evaluated project(s) (Avg: ${psScoreCandidate}/100).`,
    });
  } else {
    breakdown.push({
      dimension: 'Problem Solving & Projects',
      weight: 20,
      score: null,
      status: 'No data yet',
      evidence: 'Submit projects to the AI Project Evaluator to assess engineering complexity.',
    });
  }

  // Dimension 3: Communication & Speech (Weight: 15%)
  if (avgCommunicationScore !== null) {
    totalWeightedScore += avgCommunicationScore * 0.15;
    totalWeightApplied += 0.15;
    breakdown.push({
      dimension: 'Communication & Speech Intelligence',
      weight: 15,
      score: avgCommunicationScore,
      status: 'Calculated',
      evidence: `Average speech articulation and structure score across ${completedInterviewsCount} interview(s).`,
    });
  } else {
    breakdown.push({
      dimension: 'Communication & Speech Intelligence',
      weight: 15,
      score: null,
      status: 'No data yet',
      evidence: 'Complete an interactive mock interview with speech analysis.',
    });
  }

  // Dimension 4: Resume Alignment (Weight: 15%)
  if (resumeScore !== null) {
    totalWeightedScore += resumeScore * 0.15;
    totalWeightApplied += 0.15;
    breakdown.push({
      dimension: 'Resume Quality & Role Alignment',
      weight: 15,
      score: resumeScore,
      status: 'Calculated',
      evidence: `Extracted from PDF resume analysis against target role "${targetRole}".`,
    });
  } else {
    breakdown.push({
      dimension: 'Resume Quality & Role Alignment',
      weight: 15,
      score: null,
      status: 'No data yet',
      evidence: 'Upload your resume PDF to receive ATS keyword and impact evaluation.',
    });
  }

  // Dimension 5: GitHub & Engineering Signals (Weight: 10%)
  if (githubScore !== null) {
    totalWeightedScore += githubScore * 0.1;
    totalWeightApplied += 0.1;
    breakdown.push({
      dimension: 'GitHub & Engineering Signals',
      weight: 10,
      score: githubScore,
      status: 'Calculated',
      evidence: `Calculated from @${github.username}'s public repositories and language distribution.`,
    });
  } else {
    breakdown.push({
      dimension: 'GitHub & Engineering Signals',
      weight: 10,
      score: null,
      status: 'No data yet',
      evidence: 'Connect your GitHub username to analyze code diversity and project signals.',
    });
  }

  // Dimension 6: Skill Coverage (Weight: 15%)
  if (skillCoveragePercentage !== null) {
    totalWeightedScore += skillCoveragePercentage * 0.15;
    totalWeightApplied += 0.15;
    breakdown.push({
      dimension: 'Skill Coverage vs Target Role',
      weight: 15,
      score: skillCoveragePercentage,
      status: 'Calculated',
      evidence: `${verifiedSkills.length} verified skill(s) out of ${totalSkillsCount} total target competencies.`,
    });
  } else {
    breakdown.push({
      dimension: 'Skill Coverage vs Target Role',
      weight: 15,
      score: null,
      status: 'No data yet',
      evidence: 'Run Skill Gap analysis to compare current skills with role requirements.',
    });
  }

  // Final overall score normalized to available signals
  let careerReadinessIndex = null;
  let readinessTier = 'Not enough data yet';

  if (totalWeightApplied >= 0.25) {
    careerReadinessIndex = Math.round(totalWeightedScore / totalWeightApplied);
    if (careerReadinessIndex >= 85) readinessTier = 'High Role Readiness';
    else if (careerReadinessIndex >= 70) readinessTier = 'Solid Competence';
    else if (careerReadinessIndex >= 50) readinessTier = 'Developing Foundation';
    else readinessTier = 'Early Learning Stage';
  }

  // -------------------------------------------------------------
  // FEATURE 11: CAREER MEMORY TIMELINE
  // -------------------------------------------------------------
  const memoryTimeline = interviews.map((inv) => ({
    interviewId: inv._id,
    date: inv.completedAt || inv.createdAt,
    role: inv.role,
    company: inv.company,
    overallScore: inv.finalReport?.overallScore || 0,
    technicalScore: inv.finalReport?.technicalScore || 0,
    communicationScore: inv.finalReport?.communicationScore || 0,
    problemSolvingScore: inv.finalReport?.problemSolvingScore || 0,
  })).reverse();

  return {
    profile: profile || {},
    activeGoal: activeGoal || null,
    targetRole,
    careerReadiness: {
      score: careerReadinessIndex,
      tier: readinessTier,
      weightCoverage: Math.round(totalWeightApplied * 100),
      breakdown,
      disclaimer: 'Career Readiness Index is an internal readiness indicator based on your recorded artifacts and does not guarantee employment.',
    },
    skills: {
      verified: verifiedSkills,
      gaps: skillGaps,
      coveragePercentage: skillCoveragePercentage,
    },
    interviews: {
      totalCount: completedInterviewsCount,
      avgTechnical: avgTechnicalScore,
      avgCommunication: avgCommunicationScore,
      avgProblemSolving: avgProblemSolvingScore,
      avgOverall: avgOverallInterviewScore,
      latest: interviews[0] || null,
    },
    resume: {
      hasResume: Boolean(resume),
      score: resumeScore,
      analysis: resume?.analysis || null,
    },
    projects: {
      count: projectsCount,
      avgScore: avgProjectScore,
      list: projects,
    },
    github: {
      isConnected: Boolean(github),
      username: github?.username || null,
      score: githubScore,
      analysis: github?.analysis || null,
    },
    roadmap: {
      hasRoadmap: Boolean(roadmap),
      progressPercentage: roadmapProgress,
      milestonesCount: roadmap?.milestones?.length || 0,
    },
    careerMemory: {
      historyCount: memoryTimeline.length,
      timeline: memoryTimeline,
    },
  };
}

/**
 * Generate Smart Recommendations based on user's real Career Twin state
 */
async function generateSmartRecommendations(userId) {
  const twin = await getCareerTwinState(userId);
  const recommendations = [];

  // Rule 1: Missing Resume
  if (!twin.resume.hasResume) {
    recommendations.push({
      user: userId,
      title: 'Upload your Resume for Role Alignment',
      description: `Upload your PDF resume to extract skills, evaluate keyword density, and measure alignment against "${twin.targetRole}".`,
      category: 'Resume',
      priority: 'High',
      actionLabel: 'Upload Resume',
      actionUrl: '/resume.html',
      evidence: 'No resume has been uploaded to your Career Twin yet.',
    });
  } else if (twin.resume.score < 70) {
    recommendations.push({
      user: userId,
      title: 'Strengthen Quantifiable Resume Impact',
      description: 'Your resume analysis identified missing quantifiable metrics. Add numbers indicating scale, throughput, or efficiency gains.',
      category: 'Resume',
      priority: 'Medium',
      actionLabel: 'Review Resume Feedback',
      actionUrl: '/resume.html',
      evidence: `Resume score is currently ${twin.resume.score}/100.`,
    });
  }

  // Rule 2: GitHub Connection
  if (!twin.github.isConnected) {
    recommendations.push({
      user: userId,
      title: 'Connect GitHub Profile',
      description: 'Link your public GitHub profile to extract code diversity metrics and engineering signals for your Career Twin.',
      category: 'GitHub',
      priority: 'Medium',
      actionLabel: 'Connect GitHub',
      actionUrl: '/github.html',
      evidence: 'GitHub engineering signals are not yet factored into your Career Readiness Index.',
    });
  }

  // Rule 3: Interview Experience
  if (twin.interviews.totalCount === 0) {
    recommendations.push({
      user: userId,
      title: 'Complete Your First AI Mock Interview',
      description: `Practice in an interactive interview tailored for "${twin.targetRole}" to measure speech pacing, technical depth, and communication.`,
      category: 'Interview',
      priority: 'Critical',
      actionLabel: 'Start Mock Interview',
      actionUrl: '/interview.html',
      evidence: '0 mock interviews completed.',
    });
  } else if (twin.interviews.avgCommunication && twin.interviews.avgCommunication < 65) {
    recommendations.push({
      user: userId,
      title: 'Improve Speech Structure & Reduce Fillers',
      description: 'Recent interview speech analysis detected filler words and varied pacing. Focus on the STAR method to organize answers.',
      category: 'Interview',
      priority: 'High',
      actionLabel: 'Practice Behavioral Interview',
      actionUrl: '/interview.html',
      evidence: `Average communication score across ${twin.interviews.totalCount} interview(s) is ${twin.interviews.avgCommunication}/100.`,
    });
  }

  // Rule 4: Skill Gaps
  if (twin.skills.gaps.length > 0) {
    const topGap = twin.skills.gaps[0].name;
    recommendations.push({
      user: userId,
      title: `Address High-Priority Skill Gap: ${topGap}`,
      description: `"${topGap}" was identified as a critical missing requirement for ${twin.targetRole}. Check your personalized roadmap tasks.`,
      category: 'Skill',
      priority: 'High',
      actionLabel: 'View Roadmap',
      actionUrl: '/roadmap.html',
      evidence: `${twin.skills.gaps.length} skill gap(s) identified for target role.`,
    });
  }

  // Rule 5: Projects
  if (twin.projects.count === 0) {
    recommendations.push({
      user: userId,
      title: 'Add a Showcase Project',
      description: 'Submit your flagship project to the AI Project Evaluator to verify technical complexity and architecture quality.',
      category: 'Project',
      priority: 'Medium',
      actionLabel: 'Evaluate Project',
      actionUrl: '/projects.html',
      evidence: 'No evaluated projects in your Career Twin.',
    });
  }

  return recommendations;
}

module.exports = {
  getCareerTwinState,
  generateSmartRecommendations,
};
