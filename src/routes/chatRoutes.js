/**
 * Chat Routes
 * API routes for chat and health check endpoints
 */

const express = require('express');
const multer = require('multer');
const ChatController = require('../controllers/chatController');
const { config } = require('../config/config');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    // Add file type validation if needed
    cb(null, true);
  },
});

/**
 * POST /api/chat
 * Handle chat request with optional audio file
 */
router.post('/chat', upload.single('audio'), ChatController.handleChat);

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', ChatController.healthCheck);

module.exports = router;
