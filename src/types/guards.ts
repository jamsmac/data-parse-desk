/**
 * Type Guards for Runtime Validation
 * Type-safe runtime checks to validate data at boundaries (API responses, user input, etc.)
 */

import {
  Database,
  TableSchema,
  ColumnType,
  ColumnValue,
  TableRow,
  DatabaseRelation,
  UploadHistory,
  DatabaseStats,
  ValidationError,
  ValidationWarning,
  ChartConfig,
  Workflow,
  UserPermission,
  Comment,
  ActivityLog,
  ParsedFileData,
  FileUploadResult,
} from './database';

import {
  ApiError,
  SupabaseError,
  ValidationError as ApiValidationError,
  AuthError,
  NetworkError,
  Result,
  Success,
  Failure,
  PaginatedResponse,
} from './api';

// ============================================================================
// Primitive Type Guards
// ============================================================================

/**
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if value is a valid Date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Check if value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return isDate(date) && date.toISOString() === value;
}

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a File object
 */
export function isFile(value: unknown): value is File {
  return value instanceof File;
}

// ============================================================================
// Database Type Guards
// ============================================================================

/**
 * Check if value is a valid ColumnType
 */
export function isColumnType(value: unknown): value is ColumnType {
  const validTypes: ColumnType[] = [
    'text',
    'number',
    'date',
    'boolean',
    'select',
    'multi_select',
    'email',
    'url',
    'phone',
    'file',
    'relation',
    'rollup',
    'formula',
    'lookup',
    'button',
    'user',
    'rating',
    'duration',
    'percent',
    'barcode',
    'qr',
  ];
  return isString(value) && validTypes.includes(value as ColumnType);
}

/**
 * Check if value is a valid ColumnValue
 */
export function isColumnValue(value: unknown): value is ColumnValue {
  if (isNullish(value)) return true;
  if (isString(value)) return true;
  if (isNumber(value)) return true;
  if (isBoolean(value)) return true;
  if (isDate(value)) return true;
  if (isFile(value)) return true;

  // Check arrays
  if (isArray(value)) {
    return value.every(item => isString(item) || isNumber(item) || isFile(item));
  }

  return false;
}

/**
 * Check if object is a valid Database
 */
export function isDatabase(value: unknown): value is Database {
  if (!isObject(value)) return false;

  const db = value as Record<string, unknown>;

  return (
    isString(db.id) &&
    isString(db.user_id) &&
    isString(db.name) &&
    isString(db.created_at) &&
    isString(db.updated_at) &&
    (isNullish(db.description) || isString(db.description)) &&
    (isNullish(db.icon) || isString(db.icon)) &&
    (isNullish(db.color) || isString(db.color)) &&
    (isNullish(db.tags) || (isArray(db.tags) && db.tags.every(isString))) &&
    (isNullish(db.table_count) || isNumber(db.table_count))
  );
}

/**
 * Check if object is a valid TableSchema
 */
export function isTableSchema(value: unknown): value is TableSchema {
  if (!isObject(value)) return false;

  const schema = value as Record<string, unknown>;

  return (
    isString(schema.id) &&
    isString(schema.database_id) &&
    isString(schema.column_name) &&
    isColumnType(schema.column_type) &&
    isBoolean(schema.is_required) &&
    isNumber(schema.position) &&
    isString(schema.created_at) &&
    isString(schema.updated_at) &&
    (isNullish(schema.default_value) || isColumnValue(schema.default_value))
  );
}

/**
 * Check if object is a valid TableRow
 */
export function isTableRow(value: unknown): value is TableRow {
  if (!isObject(value)) return false;

  const row = value as Record<string, unknown>;

  if (!isString(row.id)) return false;

  // Check all other properties are valid ColumnValues
  for (const key in row) {
    if (key !== 'id' && !isColumnValue(row[key])) {
      return false;
    }
  }

  return true;
}

/**
 * Check if object is a valid DatabaseRelation
 */
export function isDatabaseRelation(value: unknown): value is DatabaseRelation {
  if (!isObject(value)) return false;

  const relation = value as Record<string, unknown>;

  return (
    isString(relation.id) &&
    isString(relation.source_database_id) &&
    isString(relation.target_database_id) &&
    ['one_to_many', 'many_to_one', 'many_to_many'].includes(relation.relation_type as string) &&
    isString(relation.source_column) &&
    isString(relation.target_column) &&
    isString(relation.created_at)
  );
}

/**
 * Check if object is a valid UploadHistory
 */
export function isUploadHistory(value: unknown): value is UploadHistory {
  if (!isObject(value)) return false;

  const upload = value as Record<string, unknown>;

  return (
    isString(upload.id) &&
    isString(upload.database_id) &&
    isString(upload.user_id) &&
    isString(upload.file_name) &&
    isNumber(upload.file_size) &&
    isNumber(upload.rows_imported) &&
    isObject(upload.column_mapping) &&
    ['pending', 'processing', 'completed', 'failed'].includes(upload.status as string) &&
    isString(upload.created_at) &&
    (isNullish(upload.error_message) || isString(upload.error_message)) &&
    (isNullish(upload.completed_at) || isString(upload.completed_at))
  );
}

/**
 * Check if object is a valid DatabaseStats
 */
export function isDatabaseStats(value: unknown): value is DatabaseStats {
  if (!isObject(value)) return false;

  const stats = value as Record<string, unknown>;

  return (
    isNumber(stats.rowCount) &&
    isString(stats.lastUpdated) &&
    isNumber(stats.columnCount)
  );
}

/**
 * Check if object is a valid ValidationError
 */
export function isValidationError(value: unknown): value is ValidationError {
  if (!isObject(value)) return false;

  const error = value as Record<string, unknown>;

  return (
    isNumber(error.row) &&
    isString(error.column) &&
    isColumnValue(error.value) &&
    isString(error.message)
  );
}

/**
 * Check if object is a valid ValidationWarning
 */
export function isValidationWarning(value: unknown): value is ValidationWarning {
  if (!isObject(value)) return false;

  const warning = value as Record<string, unknown>;

  return (
    isNumber(warning.row) &&
    isString(warning.column) &&
    isColumnValue(warning.value) &&
    isString(warning.message)
  );
}

/**
 * Check if object is a valid ChartConfig
 */
export function isChartConfig(value: unknown): value is ChartConfig {
  if (!isObject(value)) return false;

  const config = value as Record<string, unknown>;

  return (
    ['bar', 'line', 'pie', 'scatter', 'area', 'heatmap'].includes(config.type as string) &&
    isString(config.xAxis) &&
    (isString(config.yAxis) || (isArray(config.yAxis) && config.yAxis.every(isString))) &&
    (isNullish(config.groupBy) || isString(config.groupBy)) &&
    (isNullish(config.aggregation) ||
      ['count', 'sum', 'avg', 'min', 'max'].includes(config.aggregation as string))
  );
}

/**
 * Check if object is a valid Workflow
 */
export function isWorkflow(value: unknown): value is Workflow {
  if (!isObject(value)) return false;

  const workflow = value as Record<string, unknown>;

  return (
    isString(workflow.id) &&
    isString(workflow.database_id) &&
    isString(workflow.name) &&
    isObject(workflow.trigger) &&
    isArray(workflow.actions) &&
    isBoolean(workflow.is_active) &&
    isString(workflow.created_at) &&
    isString(workflow.updated_at) &&
    (isNullish(workflow.description) || isString(workflow.description))
  );
}

/**
 * Check if object is a valid UserPermission
 */
export function isUserPermission(value: unknown): value is UserPermission {
  if (!isObject(value)) return false;

  const permission = value as Record<string, unknown>;

  return (
    isString(permission.user_id) &&
    isString(permission.database_id) &&
    ['owner', 'editor', 'viewer'].includes(permission.role as string) &&
    isString(permission.granted_at)
  );
}

/**
 * Check if object is a valid Comment
 */
export function isComment(value: unknown): value is Comment {
  if (!isObject(value)) return false;

  const comment = value as Record<string, unknown>;

  return (
    isString(comment.id) &&
    isString(comment.database_id) &&
    isString(comment.row_id) &&
    isString(comment.user_id) &&
    isString(comment.content) &&
    isString(comment.created_at) &&
    isString(comment.updated_at)
  );
}

/**
 * Check if object is a valid ActivityLog
 */
export function isActivityLog(value: unknown): value is ActivityLog {
  if (!isObject(value)) return false;

  const log = value as Record<string, unknown>;

  return (
    isString(log.id) &&
    isString(log.database_id) &&
    isString(log.user_id) &&
    ['create', 'update', 'delete', 'import'].includes(log.action as string) &&
    ['database', 'row', 'column'].includes(log.entity_type as string) &&
    isString(log.entity_id) &&
    isString(log.created_at) &&
    (isNullish(log.changes) || isObject(log.changes))
  );
}

/**
 * Check if object is a valid ParsedFileData
 */
export function isParsedFileData(value: unknown): value is ParsedFileData {
  if (!isObject(value)) return false;

  const parsed = value as Record<string, unknown>;

  return (
    isArray(parsed.headers) &&
    parsed.headers.every(isString) &&
    isArray(parsed.rows) &&
    parsed.rows.every(isObject) &&
    isNumber(parsed.totalRows)
  );
}

/**
 * Check if object is a valid FileUploadResult
 */
export function isFileUploadResult(value: unknown): value is FileUploadResult {
  if (!isObject(value)) return false;

  const result = value as Record<string, unknown>;

  return (
    isBoolean(result.success) &&
    isString(result.fileName) &&
    isNumber(result.rowsImported) &&
    (isNullish(result.errors) || (isArray(result.errors) && result.errors.every(isValidationError))) &&
    (isNullish(result.warnings) || (isArray(result.warnings) && result.warnings.every(isValidationWarning)))
  );
}

// ============================================================================
// API Type Guards
// ============================================================================

/**
 * Check if object is a valid ApiError
 */
export function isApiError(value: unknown): value is ApiError {
  if (!isObject(value)) return false;

  const error = value as Record<string, unknown>;

  return (
    isString(error.code) &&
    isString(error.message) &&
    (isNullish(error.details) || isObject(error.details)) &&
    (isNullish(error.status) || isNumber(error.status)) &&
    (isNullish(error.timestamp) || isString(error.timestamp))
  );
}

/**
 * Check if error is a SupabaseError
 */
export function isSupabaseError(value: unknown): value is SupabaseError {
  if (!isApiError(value)) return false;

  const error = value as Record<string, unknown>;

  return (isNullish(error.hint) || isString(error.hint)) && (isNullish(error.details) || isString(error.details));
}

/**
 * Check if error is an ApiValidationError
 */
export function isApiValidationError(value: unknown): value is ApiValidationError {
  if (!isApiError(value)) return false;

  const error = value as Record<string, unknown>;

  return error.code === 'VALIDATION_ERROR' && isObject(error.fields);
}

/**
 * Check if error is an AuthError
 */
export function isAuthError(value: unknown): value is AuthError {
  if (!isApiError(value)) return false;

  const error = value as Record<string, unknown>;

  return ['AUTH_ERROR', 'INVALID_CREDENTIALS', 'SESSION_EXPIRED', 'UNAUTHORIZED'].includes(error.code as string);
}

/**
 * Check if error is a NetworkError
 */
export function isNetworkError(value: unknown): value is NetworkError {
  if (!isApiError(value)) return false;

  const error = value as Record<string, unknown>;

  return ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_FAILED'].includes(error.code as string);
}

/**
 * Check if result is a Success
 */
export function isSuccess<T, E>(result: unknown): result is Success<T> {
  return isObject(result) && (result as Record<string, unknown>).success === true && 'data' in result;
}

/**
 * Check if result is a Failure
 */
export function isFailure<T, E>(result: unknown): result is Failure<E> {
  return isObject(result) && (result as Record<string, unknown>).success === false && 'error' in result;
}

/**
 * Check if result is a Result type
 */
export function isResult<T, E>(value: unknown): value is Result<T, E> {
  return isSuccess(value) || isFailure(value);
}

/**
 * Check if response is a PaginatedResponse
 */
export function isPaginatedResponse<T>(value: unknown): value is PaginatedResponse<T> {
  if (!isObject(value)) return false;

  const response = value as Record<string, unknown>;

  return (
    isArray(response.data) &&
    isObject(response.meta) &&
    isNumber((response.meta as Record<string, unknown>).currentPage) &&
    isNumber((response.meta as Record<string, unknown>).totalPages) &&
    isNumber((response.meta as Record<string, unknown>).totalItems) &&
    isNumber((response.meta as Record<string, unknown>).itemsPerPage) &&
    isBoolean((response.meta as Record<string, unknown>).hasNextPage) &&
    isBoolean((response.meta as Record<string, unknown>).hasPrevPage)
  );
}

// ============================================================================
// Array Type Guards
// ============================================================================

/**
 * Check if array contains only valid Databases
 */
export function isDatabaseArray(value: unknown): value is Database[] {
  return isArray(value) && value.every(isDatabase);
}

/**
 * Check if array contains only valid TableSchemas
 */
export function isTableSchemaArray(value: unknown): value is TableSchema[] {
  return isArray(value) && value.every(isTableSchema);
}

/**
 * Check if array contains only valid TableRows
 */
export function isTableRowArray(value: unknown): value is TableRow[] {
  return isArray(value) && value.every(isTableRow);
}

/**
 * Check if array contains only strings
 */
export function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

/**
 * Check if array contains only numbers
 */
export function isNumberArray(value: unknown): value is number[] {
  return isArray(value) && value.every(isNumber);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Validate URL format
 */
export function isValidUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate phone number (basic check)
 */
export function isValidPhone(value: unknown): value is string {
  if (!isString(value)) return false;
  const phoneRegex = /^\+?[\d\s()-]{10,}$/;
  return phoneRegex.test(value);
}

/**
 * Validate UUID format
 */
export function isValidUUID(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Validate positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return isNumber(value) && value > 0 && Number.isInteger(value);
}

/**
 * Validate non-negative integer
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return isNumber(value) && value >= 0 && Number.isInteger(value);
}

/**
 * Validate percentage (0-100)
 */
export function isPercentage(value: unknown): value is number {
  return isNumber(value) && value >= 0 && value <= 100;
}

/**
 * Validate rating (1-5)
 */
export function isRating(value: unknown): value is number {
  return isNumber(value) && value >= 1 && value <= 5;
}

/**
 * Check if string is not empty
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

/**
 * Check if array is not empty
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return isArray(value) && value.length > 0;
}

// ============================================================================
// Column Type Specific Validators
// ============================================================================

/**
 * Validate value for a specific column type
 */
export function isValidValueForColumnType(value: ColumnValue, columnType: ColumnType): boolean {
  if (isNullish(value)) return true; // null/undefined is valid for all types

  switch (columnType) {
    case 'text':
      return isString(value);

    case 'number':
    case 'rating':
    case 'percent':
      return isNumber(value);

    case 'date':
      return isDate(value) || isISODateString(value);

    case 'boolean':
      return isBoolean(value);

    case 'email':
      return isValidEmail(value);

    case 'url':
      return isValidUrl(value);

    case 'phone':
      return isValidPhone(value);

    case 'select':
      return isString(value);

    case 'multi_select':
      return isStringArray(value);

    case 'file':
      return isFile(value) || (isArray(value) && value.every(isFile));

    case 'user':
      return isString(value) && isValidUUID(value);

    case 'duration':
      return isString(value) && /^\d{2}:\d{2}(:\d{2})?$/.test(value);

    case 'barcode':
    case 'qr':
      return isString(value);

    case 'relation':
      return isString(value) || isStringArray(value);

    case 'rollup':
    case 'formula':
    case 'lookup':
      return true; // Computed values, accept any type

    case 'button':
      return true; // Buttons don't have values

    default:
      return false;
  }
}

// ============================================================================
// Safe Parsing Utilities
// ============================================================================

/**
 * Safely parse JSON with type guard
 */
export function safeParse<T>(
  json: string,
  guard: (value: unknown) => value is T
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(json);
    if (guard(parsed)) {
      return { success: true, data: parsed };
    }
    return { success: false, error: 'Parsed data does not match expected type' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown parsing error' };
  }
}

/**
 * Safely parse number
 */
export function parseNumber(value: unknown): number | null {
  if (isNumber(value)) return value;
  if (isString(value)) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Safely parse boolean
 */
export function parseBoolean(value: unknown): boolean | null {
  if (isBoolean(value)) return value;
  if (isString(value)) {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (isNumber(value)) return value !== 0;
  return null;
}

/**
 * Safely parse date
 */
export function parseDate(value: unknown): Date | null {
  if (isDate(value)) return value;
  if (isString(value) || isNumber(value)) {
    const date = new Date(value);
    return isDate(date) ? date : null;
  }
  return null;
}

// ============================================================================
// Assertion Helpers (throw on invalid)
// ============================================================================

/**
 * Assert value is defined (not null or undefined)
 */
export function assertDefined<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (isNullish(value)) {
    throw new Error(message || 'Value must be defined');
  }
}

/**
 * Assert value is a string
 */
export function assertString(value: unknown, message?: string): asserts value is string {
  if (!isString(value)) {
    throw new Error(message || `Expected string, got ${typeof value}`);
  }
}

/**
 * Assert value is a number
 */
export function assertNumber(value: unknown, message?: string): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(message || `Expected number, got ${typeof value}`);
  }
}

/**
 * Assert value is an array
 */
export function assertArray(value: unknown, message?: string): asserts value is unknown[] {
  if (!isArray(value)) {
    throw new Error(message || `Expected array, got ${typeof value}`);
  }
}

/**
 * Assert value is an object
 */
export function assertObject(value: unknown, message?: string): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(message || `Expected object, got ${typeof value}`);
  }
}

/**
 * Assert result is success
 */
export function assertSuccess<T, E>(result: Result<T, E>, message?: string): asserts result is Success<T> {
  if (!isSuccess(result)) {
    throw new Error(message || `Expected success result, got failure: ${JSON.stringify(result.error)}`);
  }
}

/**
 * Assert value matches type guard
 */
export function assertType<T>(
  value: unknown,
  guard: (value: unknown) => value is T,
  message?: string
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message || `Value does not match expected type`);
  }
}
