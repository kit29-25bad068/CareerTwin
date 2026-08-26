const express = require('express');
const router = express.Router();
const {
  wipeCareerMemory,
  wipeRecordings,
  exportUserData,
  deleteAccount,
} = require('../controllers/privacyController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/wipe-memory', wipeCareerMemory);
router.post('/wipe-recordings', wipeRecordings);
router.get('/export', exportUserData);
router.delete('/account', deleteAccount);

module.exports = router;
