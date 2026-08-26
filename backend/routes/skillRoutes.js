const express = require('express');
const router = express.Router();
const { getSkills, addSkill, runSkillGapAnalysis, deleteSkill } = require('../controllers/skillController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getSkills).post(addSkill);
router.post('/gap-analysis', runSkillGapAnalysis);
router.delete('/:id', deleteSkill);

module.exports = router;
