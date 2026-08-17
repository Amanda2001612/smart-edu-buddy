/**
 * Logger Utility
 * Centralized logging for the application
 */

const fs = require('fs');
const path = require('path');
const { config } = require('../config/config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const LogLevel = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

class Logger {
  constructor(name = 'App') {
    this.name = name;
    this.level = config.logging.level;
  }

  /**
   * Format log message
   */
  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logObj = {
      timestamp,
      level,
      logger: this.name,
      message,
    };

    if (data) {
      logObj.data = data;
    }

    return config.logging.format === 'json'
      ? JSON.stringify(logObj)
      : `[${timestamp}] [${level}] [${this.name}] ${message} ${data ? JSON.stringify(data) : ''}`;
  }

  /**
   * Write log to file and console
   */
  write(level, message, data = null) {
    const formattedMessage = this.formatMessage(level, message, data);

    // Console output
    console[level.toLowerCase() === 'error' ? 'error' : 'log'](formattedMessage);

    // File output
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, formattedMessage + '\n');
  }

  debug(message, data) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.write(LogLevel.DEBUG, message, data);
    }
  }

  info(message, data) {
    if (this.shouldLog(LogLevel.INFO)) {
      this.write(LogLevel.INFO, message, data);
    }
  }

  warn(message, data) {
    if (this.shouldLog(LogLevel.WARN)) {
      this.write(LogLevel.WARN, message, data);
    }
  }

  error(message, data) {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.write(LogLevel.ERROR, message, data);
    }
  }

  shouldLog(level) {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.level.toUpperCase());
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }
}

module.exports = Logger;
