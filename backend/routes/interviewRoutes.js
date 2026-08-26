const express = require('express');
const router = express.Router();
const {
  createInterview,
  getInterviews,
  getInterviewById,
  submitAnswer,
  finishInterview,
  uploadRecordingFile,
  deleteRecording,
  deleteInterview,
} = require('../controllers/interviewController');
const { protect } = require('../middleware/auth');
const { uploadTempAudio, uploadRecording } = require('../middleware/upload');

router.use(protect);

router.route('/').post(createInterview).get(getInterviews);
router.route('/:id').get(getInterviewById).delete(deleteInterview);
router.post('/:id/answer', uploadTempAudio.single('audio'), submitAnswer);
router.post('/:id/end', finishInterview);
router.post('/:id/recording', uploadRecording.single('recording'), uploadRecordingFile);
router.delete('/:id/recording', deleteRecording);

module.exports = router;
