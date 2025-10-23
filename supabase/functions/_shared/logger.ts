/**
 * Structured Logger for Supabase Edge Functions
 *
 * Provides consistent logging across all edge functions with:
 * - Log levels (debug, info, warn, error)
 * - Structured context (JSON format)
 * - Request tracking
 * - Performance metrics
 * - Production-ready output
 *
 * Usage:
 * ```typescript
 * import { logger } from '../_shared/logger.ts';
 *
 * logger.info('User authenticated', { userId: '123', method: 'email' });
 * logger.error('Database query failed', { error: err.message, query: 'SELECT ...' });
 * ```
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogContext {
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  functionName?: string;
  requestId?: string;
  userId?: string;
  duration?: number;
}

class Logger {
  private functionName: string;
  private requestId?: string;
  private userId?: string;
  private minLevel: LogLevel;

  constructor(functionName: string = 'unknown', minLevel: LogLevel = LogLevel.INFO) {
    this.functionName = functionName;
    this.minLevel = minLevel;
  }

  /**
   * Set request context (call at the start of request handling)
   */
  setRequestContext(requestId?: string, userId?: string) {
    this.requestId = requestId;
    this.userId = userId;
  }

  /**
   * Set minimum log level (use DEBUG for development)
   */
  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatLog(level: string, message: string, context?: LogContext): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      functionName: this.functionName,
    };

    if (this.requestId) entry.requestId = this.requestId;
    if (this.userId) entry.userId = this.userId;
    if (context) entry.context = context;

    return entry;
  }

  private output(entry: LogEntry) {
    // Output as JSON for structured logging (Supabase logs can parse this)
    console.log(JSON.stringify(entry));
  }

  /**
   * Debug level - detailed information for diagnosing problems
   */
  debug(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    this.output(this.formatLog('DEBUG', message, context));
  }

  /**
   * Info level - general informational messages
   */
  info(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.INFO)) return;
    this.output(this.formatLog('INFO', message, context));
  }

  /**
   * Warn level - potentially harmful situations
   */
  warn(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.WARN)) return;
    this.output(this.formatLog('WARN', message, context));
  }

  /**
   * Error level - error events that might still allow the application to continue
   */
  error(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    this.output(this.formatLog('ERROR', message, context));
  }

  /**
   * Track operation duration
   */
  async trackDuration<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = performance.now();

    try {
      this.debug(`Starting: ${operationName}`, context);
      const result = await operation();
      const duration = performance.now() - startTime;

      this.info(`Completed: ${operationName}`, {
        ...context,
        durationMs: Math.round(duration),
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.error(`Failed: ${operationName}`, {
        ...context,
        durationMs: Math.round(duration),
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.functionName, this.minLevel);
    childLogger.requestId = this.requestId;
    childLogger.userId = this.userId;

    // Wrap methods to include additional context
    const originalDebug = childLogger.debug.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);

    childLogger.debug = (msg: string, ctx?: LogContext) =>
      originalDebug(msg, { ...additionalContext, ...ctx });
    childLogger.info = (msg: string, ctx?: LogContext) =>
      originalInfo(msg, { ...additionalContext, ...ctx });
    childLogger.warn = (msg: string, ctx?: LogContext) =>
      originalWarn(msg, { ...additionalContext, ...ctx });
    childLogger.error = (msg: string, ctx?: LogContext) =>
      originalError(msg, { ...additionalContext, ...ctx });

    return childLogger;
  }
}

/**
 * Create a logger instance for an edge function
 * @param functionName - Name of the edge function
 * @param minLevel - Minimum log level (default: INFO)
 */
export function createLogger(
  functionName: string,
  minLevel: LogLevel = LogLevel.INFO
): Logger {
  return new Logger(functionName, minLevel);
}

/**
 * Default logger instance (for backward compatibility)
 */
export const logger = new Logger('default', LogLevel.INFO);

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Extract user ID from Supabase auth
 */
export function extractUserId(req: Request): string | undefined {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return undefined;

    // Parse JWT token (simplified - in production use proper JWT library)
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) return undefined;

    const payload = JSON.parse(atob(parts[1]));
    return payload.sub || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Example usage in an edge function:
 *
 * ```typescript
 * import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 * import { createLogger, generateRequestId, extractUserId } from '../_shared/logger.ts';
 *
 * const logger = createLogger('my-function');
 *
 * serve(async (req) => {
 *   const requestId = generateRequestId();
 *   const userId = extractUserId(req);
 *   logger.setRequestContext(requestId, userId);
 *
 *   logger.info('Request received', { method: req.method, url: req.url });
 *
 *   try {
 *     const result = await logger.trackDuration(
 *       'database-query',
 *       () => supabase.from('users').select('*')
 *     );
 *
 *     logger.info('Request completed successfully');
 *     return new Response(JSON.stringify(result), { status: 200 });
 *   } catch (error) {
 *     logger.error('Request failed', { error: error.message });
 *     return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 });
 *   }
 * });
 * ```
 */
