const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectById,
  deleteProject,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').post(createProject).get(getProjects);
router.route('/:id').get(getProjectById).delete(deleteProject);

module.exports = router;
