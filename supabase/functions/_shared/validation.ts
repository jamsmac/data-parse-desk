/**
 * Input Validation Utilities for Edge Functions
 *
 * Provides type-safe validation for all edge function inputs
 */

/**
 * Validate UUID format
 */
export function validateUUID(value: unknown, fieldName: string = 'UUID'): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new Error(`${fieldName} must be a valid UUID`);
  }

  return value;
}

/**
 * Validate string with length constraints
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number; pattern?: RegExp } = {}
): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  const { minLength = 0, maxLength = 10000, pattern } = options;

  if (value.length < minLength) {
    throw new Error(`${fieldName} must be at least ${minLength} characters`);
  }

  if (value.length > maxLength) {
    throw new Error(`${fieldName} must be at most ${maxLength} characters`);
  }

  if (pattern && !pattern.test(value)) {
    throw new Error(`${fieldName} has invalid format`);
  }

  return value;
}

/**
 * Validate number with range constraints
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: { min?: number; max?: number; integer?: boolean } = {}
): number {
  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || isNaN(num)) {
    throw new Error(`${fieldName} must be a number`);
  }

  const { min, max, integer = false } = options;

  if (integer && !Number.isInteger(num)) {
    throw new Error(`${fieldName} must be an integer`);
  }

  if (min !== undefined && num < min) {
    throw new Error(`${fieldName} must be at least ${min}`);
  }

  if (max !== undefined && num > max) {
    throw new Error(`${fieldName} must be at most ${max}`);
  }

  return num;
}

/**
 * Validate boolean
 */
export function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true') return true;
    if (lower === 'false') return false;
  }

  throw new Error(`${fieldName} must be a boolean`);
}

/**
 * Validate enum value
 */
export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  allowedValues: readonly T[]
): T {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  if (!allowedValues.includes(value as T)) {
    throw new Error(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }

  return value as T;
}

/**
 * Validate array with element validation
 */
export function validateArray<T>(
  value: unknown,
  fieldName: string,
  elementValidator: (val: unknown, index: number) => T,
  options: { minLength?: number; maxLength?: number } = {}
): T[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array`);
  }

  const { minLength = 0, maxLength = 1000 } = options;

  if (value.length < minLength) {
    throw new Error(`${fieldName} must have at least ${minLength} elements`);
  }

  if (value.length > maxLength) {
    throw new Error(`${fieldName} must have at most ${maxLength} elements`);
  }

  return value.map((elem, index) => {
    try {
      return elementValidator(elem, index);
    } catch (error) {
      throw new Error(
        `${fieldName}[${index}]: ${error instanceof Error ? error.message : 'Invalid element'}`
      );
    }
  });
}

/**
 * Validate object with shape validation
 */
export function validateObject<T extends Record<string, unknown>>(
  value: unknown,
  fieldName: string,
  shapeValidator: (obj: any) => T
): T {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object`);
  }

  try {
    return shapeValidator(value);
  } catch (error) {
    throw new Error(
      `${fieldName}: ${error instanceof Error ? error.message : 'Invalid object'}`
    );
  }
}

/**
 * Validate optional value
 */
export function validateOptional<T>(
  value: unknown,
  validator: (val: unknown) => T
): T | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  return validator(value);
}

/**
 * Validate pagination parameters
 */
export interface PaginationParams {
  page: number;
  page_size: number;
  offset: number;
}

export function validatePagination(params: {
  page?: unknown;
  page_size?: unknown;
}): PaginationParams {
  const page = validateOptional(params.page, (val) =>
    validateNumber(val, 'page', { min: 1, integer: true })
  ) || 1;

  const page_size = validateOptional(params.page_size, (val) =>
    validateNumber(val, 'page_size', { min: 1, max: 1000, integer: true })
  ) || 100;

  const offset = (page - 1) * page_size;

  return { page, page_size, offset };
}

/**
 * Validate filter condition
 */
export interface ValidatedFilter {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: string | number | boolean | null | Array<string | number>;
}

export function validateFilter(filter: unknown): ValidatedFilter {
  return validateObject(filter, 'filter', (obj) => {
    const column = validateString(obj.column, 'filter.column', {
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z_][a-zA-Z0-9_.]*$/,
    });

    const operator = validateEnum(
      obj.operator,
      'filter.operator',
      ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is'] as const
    );

    let value: ValidatedFilter['value'];
    if (obj.value === null || obj.value === undefined) {
      value = null;
    } else if (Array.isArray(obj.value)) {
      value = validateArray(obj.value, 'filter.value', (val) => {
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return val;
        throw new Error('Array elements must be strings or numbers');
      });
    } else if (typeof obj.value === 'string' || typeof obj.value === 'number' || typeof obj.value === 'boolean') {
      value = obj.value;
    } else {
      throw new Error('filter.value must be string, number, boolean, null, or array');
    }

    return { column, operator, value };
  });
}

/**
 * Validate sort configuration
 */
export interface ValidatedSort {
  column: string;
  direction: 'ASC' | 'DESC';
}

export function validateSort(sort: unknown): ValidatedSort {
  return validateObject(sort, 'sort', (obj) => {
    const column = validateString(obj.column, 'sort.column', {
      minLength: 1,
      maxLength: 100,
      pattern: /^[a-zA-Z_][a-zA-Z0-9_.]*$/,
    });

    const direction = validateEnum(obj.direction, 'sort.direction', ['ASC', 'DESC', 'asc', 'desc'] as const);

    return {
      column,
      direction: direction.toUpperCase() as 'ASC' | 'DESC',
    };
  });
}

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const name = filename.replace(/\.\./g, '').replace(/[/\\]/g, '');

  // Validate characters
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(name)) {
    throw new Error('Filename contains invalid characters');
  }

  // Limit length
  if (name.length > 255) {
    throw new Error('Filename too long');
  }

  return name;
}

/**
 * Validate email format
 */
export function validateEmail(value: unknown, fieldName: string = 'email'): string {
  const email = validateString(value, fieldName, { minLength: 3, maxLength: 255 });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`${fieldName} must be a valid email address`);
  }

  return email.toLowerCase();
}

/**
 * Validate URL format
 */
export function validateURL(value: unknown, fieldName: string = 'URL'): string {
  const url = validateString(value, fieldName);

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('URL must use HTTP or HTTPS protocol');
    }
    return url;
  } catch {
    throw new Error(`${fieldName} must be a valid URL`);
  }
}

/**
 * Validate JSON string
 */
export function validateJSON<T = unknown>(value: unknown, fieldName: string = 'JSON'): T {
  const jsonStr = validateString(value, fieldName);

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`${fieldName} must be valid JSON`);
  }
}
