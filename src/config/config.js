/**
 * SmartEduBuddy Configuration
 */

require('dotenv').config();


const config = {

  app: {

    name:
      'SmartEduBuddy Brain',

    version:
      '3.0.0',

    env:
      process.env.NODE_ENV ||
      'development',

    port:
      Number(
        process.env.PORT
      ) || 3000,

    host:
      '0.0.0.0',
  },


  api: {

    gemini: {

      /**
       * IMPORTANT:
       * Project uses AI_API_KEY.
       */
      apiKey:
        process.env.AI_API_KEY,

      /**
       * Primary model.
       */
      model:
        process.env.GEMINI_MODEL ||
        'gemini-3.6-flash',

      /**
       * Fall back automatically
       * if primary model is busy,
       * quota-limited or unavailable.
       */
      fallbackModels: [

        'gemini-3.5-flash',

        'gemini-2.5-flash',
      ],

      timeoutMs:
        60000,
    },


    googleTTS: {

      host:
        'https://translate.google.com',

      slow:
        false,

      timeoutMs:
        20000,
    },
  },


  cors: {

    origin:
      process.env.CORS_ORIGIN ||
      '*',
  },


  child: {

    defaultName:
      'යාලුවා',

    defaultAge:
      10,

    minimumAge:
      8,

    maximumAge:
      12,
  },


  logging: {

    level:
      process.env.LOG_LEVEL ||
      'info',

    format:
      process.env.LOG_FORMAT ||
      'text',
  },


  upload: {

    maxFileSize:
      10 * 1024 * 1024,

    maxFiles:
      1,

    memoryStorage:
      true,
  },
};


/**
 * Validate required settings.
 */
function validateConfig() {

  if (
    !config.api.gemini.apiKey
  ) {

    throw new Error(
      'AI_API_KEY is missing. Add AI_API_KEY to .env or Render Environment.'
    );
  }


  if (
    !config.api.gemini.model
  ) {

    throw new Error(
      'GEMINI_MODEL is missing.'
    );
  }
}


module.exports = {

  config,

  validateConfig,
};