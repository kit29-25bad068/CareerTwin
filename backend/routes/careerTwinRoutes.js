const express = require('express');
const router = express.Router();
const {
  getCareerTwinState,
  getRecommendations,
  dismissRecommendation,
} = require('../controllers/careerTwinController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getCareerTwinState);
router.get('/recommendations', getRecommendations);
router.post('/recommendations/:id/dismiss', dismissRecommendation);

module.exports = router;
