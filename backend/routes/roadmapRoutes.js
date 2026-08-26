const express = require('express');
const router = express.Router();
const { getRoadmap, generateRoadmap, toggleTask } = require('../controllers/roadmapController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getRoadmap);
router.post('/generate', generateRoadmap);
router.put('/tasks/:milestoneIdx/:taskIdx', toggleTask);

module.exports = router;
