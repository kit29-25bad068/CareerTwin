const jwt = require('jsonwebtoken');
const User = require('../models/User');
const CareerProfile = require('../models/CareerProfile');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'careertwin_super_secure_jwt_secret_key_change_in_production_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Register a new user & initialize empty CareerProfile
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
    });

    // Automatically create initial CareerProfile
    await CareerProfile.create({
      user: user._id,
      targetRole: 'Full Stack Developer',
      experienceLevel: 'student',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        privacySettings: user.privacySettings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        privacySettings: user.privacySettings,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user info
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        privacySettings: user.privacySettings,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update privacy settings
// @route   PUT /api/auth/privacy-settings
// @access  Private
exports.updatePrivacySettings = async (req, res, next) => {
  try {
    const { defaultPrivacyMode, cameraPermission, micPermission } = req.body;
    const user = await User.findById(req.user._id);

    if (defaultPrivacyMode && ['privacy', 'replay'].includes(defaultPrivacyMode)) {
      user.privacySettings.defaultPrivacyMode = defaultPrivacyMode;
    }
    if (typeof cameraPermission === 'boolean') {
      user.privacySettings.cameraPermission = cameraPermission;
    }
    if (typeof micPermission === 'boolean') {
      user.privacySettings.micPermission = micPermission;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully.',
      privacySettings: user.privacySettings,
    });
  } catch (error) {
    next(error);
  }
};
