const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure base upload directories exist
const uploadDirs = [
  path.join(__dirname, '../../uploads'),
  path.join(__dirname, '../../uploads/resumes'),
  path.join(__dirname, '../../uploads/recordings'),
  path.join(__dirname, '../../uploads/temp'),
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage engine for resumes
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/resumes'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `resume-${req.user ? req.user._id : 'anon'}-${uniqueSuffix}${path.extname(sanitizedOriginal)}`);
  },
});

// Storage engine for interview recordings (Replay mode)
const recordingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/recordings'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `recording-${req.user ? req.user._id : 'anon'}-${uniqueSuffix}.webm`);
  },
});

// Storage engine for temporary speech audio
const tempAudioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/temp'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `temp-audio-${uniqueSuffix}.webm`);
  },
});

// Filters
const pdfFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedMimeTypes.includes(file.mimetype) || ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF resume files are supported.'), false);
  }
};

const mediaFilter = (req, file, cb) => {
  const allowedMimeTypes = ['audio/webm', 'video/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/ogg', 'video/mp4'];
  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported audio/video format.'), false);
  }
};

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024; // 10MB default

const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: maxFileSize },
});

const uploadRecording = multer({
  storage: recordingStorage,
  fileFilter: mediaFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for video replay
});

const uploadTempAudio = multer({
  storage: tempAudioStorage,
  fileFilter: mediaFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

module.exports = {
  uploadResume,
  uploadRecording,
  uploadTempAudio,
};
