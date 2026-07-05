const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/rooms', chatController.getRooms);
router.get('/rooms/:roomId/messages', chatController.getMessages);
router.post('/messages', chatController.sendMessage);

module.exports = router;
