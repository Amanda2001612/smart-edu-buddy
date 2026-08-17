/**
 * Application Messages and Constants
 */

const STATUS_MESSAGES = {
  SUCCESS: 'Request processed successfully',
  ERROR: 'An error occurred while processing your request',
  INVALID_INPUT: 'Invalid input provided',
  UNAUTHORIZED: 'Unauthorized access',
  NOT_FOUND: 'Resource not found',
  SERVER_ERROR: 'Internal server error',
};

const ERROR_MESSAGES = {
  API_KEY_MISSING: 'API Key is missing in environment variables',
  BRAIN_ERROR: 'Brain error!',
  AUDIO_GENERATION_ERROR: 'Failed to generate audio',
  AI_REQUEST_FAILED: 'Failed to get AI response',
  INVALID_FILE: 'Invalid file provided',
  REQUEST_TIMEOUT: 'Request timeout',
};

const LOG_MESSAGES = {
  SERVER_STARTING: '✅ SmartEduBuddy Brain is running on port',
  REQUEST_RECEIVED: '🎙️ Robot sent a request!',
  CHILD_QUESTION: '👦 Child asked:',
  AI_RESPONSE: '🤖 AI Answer:',
  ERROR_LOG: '❌ Error occurred:',
  API_ERROR: '❌ Google API Error:',
  SYSTEM_ERROR: '❌ System Error:',
};

const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

module.exports = {
  STATUS_MESSAGES,
  ERROR_MESSAGES,
  LOG_MESSAGES,
  HTTP_STATUS,
};
