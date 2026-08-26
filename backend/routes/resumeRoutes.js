const express = require('express');
const router = express.Router();
const { uploadResume, getResume, deleteResume } = require('../controllers/resumeController');
const { protect } = require('../middleware/auth');
const { uploadResume: multerResumeUpload } = require('../middleware/upload');

router.use(protect);

router.post('/upload', multerResumeUpload.single('resume'), uploadResume);
router.route('/').get(getResume).delete(deleteResume);

module.exports = router;
