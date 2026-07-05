const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/comments.controller');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Comments CRUD
router.get('/:entityType/:entityId', commentsController.getComments);
router.post('/:entityType/:entityId', commentsController.createComment);
router.put('/:commentId', commentsController.updateComment);
router.delete('/:commentId', commentsController.deleteComment);

module.exports = router;
