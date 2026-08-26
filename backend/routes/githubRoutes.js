const express = require('express');
const router = express.Router();
const { syncGitHub, getGitHubProfile, disconnectGitHub } = require('../controllers/githubController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/sync', syncGitHub);
router.route('/').get(getGitHubProfile).delete(disconnectGitHub);

module.exports = router;
