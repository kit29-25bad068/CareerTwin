const fs = require('fs');
const path = require('path');
const Resume = require('../models/Resume');
const CareerProfile = require('../models/CareerProfile');
const Skill = require('../models/Skill');
const resumeParserService = require('../services/resumeParserService');

// @desc    Upload, parse, and analyze PDF resume
// @route   POST /api/resume/upload
// @access  Private
exports.uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please provide a PDF resume file.' });
    }

    const profile = await CareerProfile.findOne({ user: req.user._id });
    const targetRole = profile?.targetRole || 'Software Engineer';

    // 1. Parse PDF & analyze with Gemini
    const { rawText, parsedData, analysis } = await resumeParserService.parseAndAnalyzeResume(
      req.file.path,
      targetRole
    );

    // 2. Check if previous resume existed; delete previous file if present
    const existingResume = await Resume.findOne({ user: req.user._id });
    if (existingResume && existingResume.storedFilePath) {
      const oldPath = path.join(__dirname, '../../', existingResume.storedFilePath);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn('Could not delete old resume file:', e.message);
        }
      }
    }

    // 3. Upsert Resume in DB
    const relativePath = `/uploads/resumes/${req.file.filename}`;
    const resumeDoc = await Resume.findOneAndUpdate(
      { user: req.user._id },
      {
        user: req.user._id,
        originalFileName: req.file.originalname,
        storedFilePath: relativePath,
        fileSizeBytes: req.file.size,
        rawText,
        parsedData,
        analysis,
      },
      { upsert: true, new: true }
    );

    // 4. Auto-synchronize extracted skills to Skill database
    if (parsedData.skills && Array.isArray(parsedData.skills)) {
      for (const skillName of parsedData.skills.slice(0, 15)) {
        if (skillName && skillName.trim()) {
          await Skill.findOneAndUpdate(
            { user: req.user._id, name: skillName.trim() },
            {
              $setOnInsert: {
                user: req.user._id,
                name: skillName.trim(),
                proficiency: 75,
                source: 'resume',
                isGap: false,
              },
            },
            { upsert: true }
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Resume uploaded and analyzed successfully.',
      resume: resumeDoc,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    next(error);
  }
};

// @desc    Get user's uploaded resume & analysis
// @route   GET /api/resume
// @access  Private
exports.getResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ user: req.user._id });
    if (!resume) {
      return res.status(200).json({ success: true, hasResume: false, resume: null });
    }
    res.status(200).json({ success: true, hasResume: true, resume });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user's resume and file
// @route   DELETE /api/resume
// @access  Private
exports.deleteResume = async (req, res, next) => {
  try {
    const resume = await Resume.findOne({ user: req.user._id });
    if (!resume) {
      return res.status(404).json({ success: false, message: 'No resume found to delete.' });
    }

    if (resume.storedFilePath) {
      const fullPath = path.join(__dirname, '../../', resume.storedFilePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    await Resume.findByIdAndDelete(resume._id);

    res.status(200).json({
      success: true,
      message: 'Resume and associated analysis permanently deleted.',
    });
  } catch (error) {
    next(error);
  }
};
