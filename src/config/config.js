/**
 * Application Configuration
 * Centralized configuration management for the SmartEduBuddy backend
 */

require('dotenv').config();

const config = {
  app: {
    name: 'SmartEduBuddy Backend',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'),
  },

  api: {
    gemini: {
      model: process.env.GEMINI_MODEL || 'gemini-3.6-flash', // gemini-2.5-flash was sunset for new users as of Aug 2026
      apiKey: process.env.AI_API_KEY,
      timeout: 30000,
    },
    googleTTS: {
      lang: 'en',
      slow: false,
      host: 'https://translate.google.com',
    },
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  upload: {
    maxFileSize: 50 * 1024 * 1024,
    maxFiles: 1,
    memoryStorage: true,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },

  ai: {
    responseLength: 'short',
    targetAudience: 'children aged 8-12',
    systemPrompt: 'You are a friendly educational robot for kids aged 8-12. Answer in 2 short sentences simply:',
  },
};

const validateConfig = () => {
  if (!config.api.gemini.apiKey) {
    throw new Error('AI_API_KEY is not set in environment variables');
  }
};

module.exports = { config, validateConfig };