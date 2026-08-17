/**
 * Audio Service
 * Handles text-to-speech conversion using Google TTS API
 */

const googleTTS = require('google-tts-api');
const { config } = require('../config/config');
const { AppError } = require('../utils/errorHandler');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../constants/messages');
const Logger = require('../utils/logger');

const logger = new Logger('AudioService');

class AudioService {
  /**
   * Generate audio URL from text
   * @param {string} text - The text to convert to audio
   * @returns {Promise<string>} - The audio URL
   */
  static async generateAudioUrl(text) {
    try {
      if (!text || typeof text !== 'string') {
        throw new AppError(
          ERROR_MESSAGES.INVALID_INPUT,
          HTTP_STATUS.BAD_REQUEST,
          { field: 'text', message: 'Text must be a non-empty string' }
        );
      }

      if (text.length > 5000) {
        throw new AppError(
          'Text too long for audio generation',
          HTTP_STATUS.BAD_REQUEST,
          { maxLength: 5000, currentLength: text.length }
        );
      }

      const audioUrl = googleTTS.getAudioUrl(text, {
        lang: config.api.googleTTS.lang,
        slow: config.api.googleTTS.slow,
        host: config.api.googleTTS.host,
      });

      if (!audioUrl) {
        throw new AppError(
          ERROR_MESSAGES.AUDIO_GENERATION_ERROR,
          HTTP_STATUS.SERVER_ERROR
        );
      }

      logger.info('Audio URL Generated', { textLength: text.length });

      return audioUrl;
    } catch (error) {
      logger.error('Audio Service Error', { message: error.message });

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        ERROR_MESSAGES.AUDIO_GENERATION_ERROR,
        HTTP_STATUS.SERVER_ERROR,
        { originalError: error.message }
      );
    }
  }
}

module.exports = AudioService;
