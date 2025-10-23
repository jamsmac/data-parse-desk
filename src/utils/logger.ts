/**
 * Logger utility for development and production environments
 *
 * Usage:
 * ```typescript
 * import { logger } from '@/utils/logger';
 *
 * logger.log('Debug info');
 * logger.warn('Warning message');
 * logger.error('Error message');
 * ```
 */

const isDevelopment = import.meta.env.DEV;

export const logger = {
  /**
   * Log message (only in development)
   */
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Warning message (always logged)
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },

  /**
   * Error message (always logged)
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /**
   * Info message (only in development)
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Debug message (only in development)
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Table output (only in development)
   */
  table: (data: unknown): void => {
    if (isDevelopment) {
      console.table(data);
    }
  },

  /**
   * Group messages (only in development)
   */
  group: (label: string): void => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * End group (only in development)
   */
  groupEnd: (): void => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },
};

export default logger;
