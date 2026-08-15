const fs = require('fs');
const path = require('path');

const levels = ['debug', 'info', 'warn', 'error'];
const levelWeight = Object.fromEntries(levels.map((level, index) => [level, index]));
const configuredLevel = String(process.env.LOG_LEVEL || 'info').toLowerCase();
const minimumLevel = levelWeight[configuredLevel] ?? levelWeight.info;
const sensitiveKeyPattern = /(authorization|token|password|secret|cookie|session|api[_-]?key)/i;
const logFile = process.env.LOG_FILE || path.join(__dirname, '..', 'logs', 'app.log');

function appendToFile(line) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
  fs.appendFile(logFile, `${line}\n`, (error) => {
    if (error) console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: 'Failed to write application log file',
      error: error.message,
      logFile,
    }));
  });
}

function redact(value, depth = 0) {
  if (depth > 4) return '[Truncated]';
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : value.stack,
    };
  }
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => redact(item, depth + 1));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).slice(0, 50).map(([key, item]) => [
      key,
      sensitiveKeyPattern.test(key) ? '[Redacted]' : redact(item, depth + 1),
    ])
  );
}

function write(level, message, meta = {}) {
  if ((levelWeight[level] ?? levelWeight.info) < minimumLevel) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...redact(meta),
  };

  const line = JSON.stringify(entry);
  appendToFile(line);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
  child(defaultMeta = {}) {
    return Object.fromEntries(
      levels.map((level) => [
        level,
        (message, meta = {}) => write(level, message, { ...defaultMeta, ...meta }),
      ])
    );
  },
};

module.exports = logger;
module.exports.logFile = logFile;
