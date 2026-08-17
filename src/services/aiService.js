/**
 * AI Service
 * Handles all interactions with Google Gemini AI API
 */

const axios = require('axios');
const { config } = require('../config/config');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/messages');
const Logger = require('../utils/logger');

const logger = new Logger('AIService');

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

      const response = await axios.post(
        `${config.api.gemini.baseUrl}/${config.api.gemini.model}:generateContent`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': config.api.gemini.apiKey,
          },
          timeout: config.api.gemini.timeout,
        }
      );

      if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new AppError(
          ERROR_MESSAGES.AI_REQUEST_FAILED,
          HTTP_STATUS.SERVER_ERROR
        );
      }

      // Clean up asterisks and format response
      const answerText = response.data.candidates[0].content.parts[0].text.replace(/\*/g, '');

      logger.info('AI Response Generated', { userQuestion, responseLength: answerText.length });

      return answerText;
    } catch (error) {
      logger.error('AI Service Error', {
        message: error.message,
        statusCode: error.statusCode,
        apiError: error.response?.data,
        apiStatus: error.response?.status,
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
