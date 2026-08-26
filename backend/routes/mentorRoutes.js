const express = require('express');
const router = express.Router();
const { getMentorConversation, sendMessage, clearConversation } = require('../controllers/mentorController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getMentorConversation).delete(clearConversation);
router.post('/chat', sendMessage);

module.exports = router;
