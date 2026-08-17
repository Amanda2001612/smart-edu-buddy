/**
 * AI Service
 * Handles all interactions with Google Gemini AI API
 */

const { GoogleGenAI } = require('@google/genai');
const { config } = require('../config/config');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/messages');
const Logger = require('../utils/logger');

const logger = new Logger('AIService');

// Single shared client instance
const ai = new GoogleGenAI({ apiKey: config.api.gemini.apiKey });

class AIService {
  /**
   * Get AI response from Gemini API
   * @param {string} userQuestion - The user's question
   * @returns {Promise<string>} - The AI response
   */
  static async getAIResponse(userQuestion) {
    try {
      if (!userQuestion || typeof userQuestion !== 'string') {
        throw new AppError(
          ERROR_MESSAGES.INVALID_INPUT,
          HTTP_STATUS.BAD_REQUEST,
          { field: 'userQuestion', value: userQuestion }
        );
      }

      if (!config.api.gemini.apiKey) {
        throw new AppError(
          ERROR_MESSAGES.API_KEY_MISSING,
          HTTP_STATUS.SERVER_ERROR
        );
      }

      const prompt = `${config.ai.systemPrompt} ${userQuestion}`;

      const response = await ai.models.generateContent({
        model: config.api.gemini.model, // e.g. 'gemini-2.5-flash'
        contents: prompt,
      });

      const rawText = response?.text;

      if (!rawText) {
        throw new AppError(
          ERROR_MESSAGES.AI_REQUEST_FAILED,
          HTTP_STATUS.SERVER_ERROR
        );
      }

      // Clean up asterisks and format response
      const answerText = rawText.replace(/\*/g, '');

      logger.info('AI Response Generated', { userQuestion, responseLength: answerText.length });

      return answerText;
    } catch (error) {
      logger.error('AI Service Error', {
        message: error.message,
        statusCode: error.statusCode,
        apiError: error.response?.data,
        apiStatus: error.status || error.response?.status,
      });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        ERROR_MESSAGES.AI_REQUEST_FAILED,
        HTTP_STATUS.SERVER_ERROR,
        { originalError: error.message }
      );
    }
  }
}

module.exports = AIService;