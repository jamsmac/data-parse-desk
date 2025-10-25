/**
 * Typed Error Classes for Application
 *
 * Provides strongly-typed error classes for better error handling
 * and user-friendly error messages.
 */

/**
 * Base application error
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = 'APP_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 'UNAUTHORIZED', 403);
  }
}

export class SessionExpiredError extends AuthenticationError {
  constructor(message: string = 'Your session has expired. Please login again.') {
    super(message);
    this.code = 'SESSION_EXPIRED';
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  public readonly fields?: Record<string, string>;

  constructor(message: string, fields?: Record<string, string>) {
    super(message, 'VALIDATION_ERROR', 400);
    this.fields = fields;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      fields: this.fields,
    };
  }
}

export class InvalidInputError extends ValidationError {
  constructor(fieldName: string, reason: string) {
    super(`Invalid ${fieldName}: ${reason}`, { [fieldName]: reason });
    this.code = 'INVALID_INPUT';
  }
}

/**
 * Resource errors
 */
export class NotFoundError extends AppError {
  public readonly resourceType?: string;
  public readonly resourceId?: string;

  constructor(
    message: string = 'Resource not found',
    resourceType?: string,
    resourceId?: string
  ) {
    super(message, 'NOT_FOUND', 404);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId,
    };
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 'CONFLICT', 409);
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  public readonly query?: string;
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500);
    this.originalError = originalError;
  }
}

export class QueryExecutionError extends DatabaseError {
  constructor(message: string, query?: string, originalError?: Error) {
    super(message, originalError);
    this.code = 'QUERY_EXECUTION_ERROR';
    this.query = query;
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string = 'Database connection failed', originalError?: Error) {
    super(message, originalError);
    this.code = 'CONNECTION_ERROR';
  }
}

/**
 * Network errors
 */
export class NetworkError extends AppError {
  public readonly url?: string;
  public readonly method?: string;

  constructor(message: string = 'Network request failed', url?: string, method?: string) {
    super(message, 'NETWORK_ERROR', 503);
    this.url = url;
    this.method = method;
  }
}

export class TimeoutError extends NetworkError {
  constructor(message: string = 'Request timed out', url?: string) {
    super(message, url);
    this.code = 'TIMEOUT_ERROR';
    this.statusCode = 408;
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429);
    this.retryAfter = retryAfter;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * File/Storage errors
 */
export class FileError extends AppError {
  public readonly filename?: string;

  constructor(message: string, filename?: string) {
    super(message, 'FILE_ERROR', 400);
    this.filename = filename;
  }
}

export class FileSizeError extends FileError {
  public readonly maxSize: number;
  public readonly actualSize: number;

  constructor(filename: string, maxSize: number, actualSize: number) {
    super(
      `File "${filename}" is too large. Maximum size: ${maxSize} bytes, actual: ${actualSize} bytes`,
      filename
    );
    this.code = 'FILE_SIZE_ERROR';
    this.maxSize = maxSize;
    this.actualSize = actualSize;
  }
}

export class UnsupportedFileTypeError extends FileError {
  public readonly mimeType: string;

  constructor(filename: string, mimeType: string) {
    super(`File type "${mimeType}" is not supported`, filename);
    this.code = 'UNSUPPORTED_FILE_TYPE';
    this.mimeType = mimeType;
  }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends AppError {
  constructor(message: string) {
    super(message, 'BUSINESS_LOGIC_ERROR', 400);
  }
}

export class QuotaExceededError extends BusinessLogicError {
  public readonly quotaType: string;
  public readonly limit: number;
  public readonly current: number;

  constructor(quotaType: string, limit: number, current: number) {
    super(`${quotaType} quota exceeded. Limit: ${limit}, Current: ${current}`);
    this.code = 'QUOTA_EXCEEDED';
    this.quotaType = quotaType;
    this.limit = limit;
    this.current = current;
  }
}

/**
 * Error type guards
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Convert unknown error to AppError
 */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('auth') || error.message.includes('authentication')) {
      return new AuthenticationError(error.message);
    }

    if (error.message.includes('not found')) {
      return new NotFoundError(error.message);
    }

    if (error.message.includes('timeout')) {
      return new TimeoutError(error.message);
    }

    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new NetworkError(error.message);
    }

    return new AppError(error.message, 'UNKNOWN_ERROR', 500, false);
  }

  if (typeof error === 'string') {
    return new AppError(error);
  }

  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR', 500, false);
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  const normalizedError = normalizeError(error);

  // Map of error codes to user-friendly messages
  const friendlyMessages: Record<string, string> = {
    AUTH_ERROR: 'Не удалось войти в систему. Проверьте email и пароль.',
    SESSION_EXPIRED: 'Ваша сессия истекла. Пожалуйста, войдите снова.',
    UNAUTHORIZED: 'У вас нет доступа к этому ресурсу.',
    VALIDATION_ERROR: 'Пожалуйста, проверьте введённые данные.',
    NOT_FOUND: 'Запрашиваемый ресурс не найден.',
    DATABASE_ERROR: 'Ошибка при работе с базой данных.',
    NETWORK_ERROR: 'Ошибка сети. Проверьте подключение к интернету.',
    TIMEOUT_ERROR: 'Запрос занял слишком много времени.',
    RATE_LIMIT_ERROR: 'Слишком много запросов. Пожалуйста, подождите.',
    FILE_SIZE_ERROR: 'Файл слишком большой.',
    UNSUPPORTED_FILE_TYPE: 'Неподдерживаемый тип файла.',
    QUOTA_EXCEEDED: 'Превышена квота.',
  };

  return friendlyMessages[normalizedError.code] || normalizedError.message;
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  const normalizedError = normalizeError(error);

  console.error('[Error]', {
    name: normalizedError.name,
    message: normalizedError.message,
    code: normalizedError.code,
    statusCode: normalizedError.statusCode,
    context,
    stack: normalizedError.stack,
  });

  // In production, send to error tracking service (Sentry, etc.)
  if (process.env.NODE_ENV === 'production' && !normalizedError.isOperational) {
    // window.Sentry?.captureException(normalizedError, { extra: context });
  }
}
