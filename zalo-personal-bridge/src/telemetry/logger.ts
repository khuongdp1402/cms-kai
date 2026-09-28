import pino from 'pino';
import { LogRedactor } from '../security/redactor.js';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    log(obj) {
      return LogRedactor.redact(obj);
    },
  },
});
