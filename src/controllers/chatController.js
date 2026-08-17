/**
 * Chat Controller
 * Handles chat-related HTTP requests
 */

const { asyncHandler, formatErrorResponse, AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, LOG_MESSAGES, ERROR_MESSAGES } = require('../constants/messages');
const AIService = require('../services/aiService');
const AudioService = require('../services/audioService');
const Logger = require('../utils/logger');

const logger = new Logger('ChatController');

class ChatController {
  /**
   * Handle chat request
   * POST /api/chat
   */
  static handleChat = asyncHandler(async (req, res, next) => {
    try {
      logger.info(LOG_MESSAGES.REQUEST_RECEIVED);

      // For now, using a static question. In production, this would come from the request
      const userQuestion = req.body?.question || 'What is a black hole?';
      logger.info(LOG_MESSAGES.CHILD_QUESTION, { question: userQuestion });

      // Get AI response
      const answerText = await AIService.getAIResponse(userQuestion);
      logger.info(LOG_MESSAGES.AI_RESPONSE, { answer: answerText });

      // Generate audio URL
      const audioUrl = await AudioService.generateAudioUrl(answerText);

      // Send response
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          text: answerText,
          audioUrl: audioUrl,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      const errorResponse = formatErrorResponse(error, logger);
      return res.status(errorResponse.statusCode).json(errorResponse);
    }
  });

  /**
   * Health check endpoint
   * GET /api/health
   */
  static healthCheck = asyncHandler(async (req, res) => {
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'SmartEduBuddy Brain is alive and running',
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = ChatController;
