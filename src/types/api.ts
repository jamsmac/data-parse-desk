/**
 * API Type Definitions
 * Type-safe definitions for API requests, responses, and errors
 */

import { Database } from './database';

// ============================================================================
// Result Types (Railway-oriented programming pattern)
// ============================================================================

/**
 * Success result wrapper
 */
export interface Success<T> {
  success: true;
  data: T;
}

/**
 * Error result wrapper
 */
export interface Failure<E = ApiError> {
  success: false;
  error: E;
}

/**
 * Result type - either Success or Failure
 * Use this for operations that can fail
 */
export type Result<T, E = ApiError> = Success<T> | Failure<E>;

/**
 * Async result type
 */
export type AsyncResult<T, E = ApiError> = Promise<Result<T, E>>;

// ============================================================================
// API Error Types
// ============================================================================

/**
 * Standard API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status?: number;
  timestamp?: string;
}

/**
 * Supabase specific error
 */
export interface SupabaseError extends ApiError {
  hint?: string;
  details?: string;
}

/**
 * Validation error with field-specific messages
 */
export interface ValidationError extends ApiError {
  code: 'VALIDATION_ERROR';
  fields: Record<string, string[]>;
}

/**
 * Authentication error
 */
export interface AuthError extends ApiError {
  code: 'AUTH_ERROR' | 'INVALID_CREDENTIALS' | 'SESSION_EXPIRED' | 'UNAUTHORIZED';
}

/**
 * Network error
 */
export interface NetworkError extends ApiError {
  code: 'NETWORK_ERROR' | 'TIMEOUT' | 'CONNECTION_FAILED';
  originalError?: Error;
}

// ============================================================================
// Supabase Response Types
// ============================================================================

/**
 * Standard Supabase query response
 */
export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
  count?: number | null;
  status: number;
  statusText: string;
}

/**
 * Paginated Supabase response
 */
export interface PaginatedSupabaseResponse<T> extends SupabaseResponse<T[]> {
  count: number;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ============================================================================
// Sorting Types
// ============================================================================

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface SortConfig {
  field: string;
  direction: SortDirection;
}

// ============================================================================
// Filtering Types
// ============================================================================

/**
 * Filter operators
 */
export type FilterOperator =
  | 'eq'      // Equal
  | 'neq'     // Not equal
  | 'gt'      // Greater than
  | 'gte'     // Greater than or equal
  | 'lt'      // Less than
  | 'lte'     // Less than or equal
  | 'like'    // SQL LIKE
  | 'ilike'   // Case-insensitive LIKE
  | 'in'      // IN array
  | 'contains'
  | 'is'      // IS NULL
  | 'not'     // NOT
  ;

/**
 * Filter condition
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Advanced filter with AND/OR logic
 */
export interface FilterGroup {
  logic: 'and' | 'or';
  conditions: (FilterCondition | FilterGroup)[];
}

/**
 * Filter parameters
 */
export type FilterParams = FilterCondition | FilterGroup;

// ============================================================================
// API Request Types
// ============================================================================

/**
 * Base query parameters
 */
export interface QueryParams {
  select?: string[];
  filter?: FilterParams;
  sort?: SortConfig | SortConfig[];
  pagination?: PaginationParams;
  search?: string;
}

/**
 * Table data query parameters
 */
export interface TableDataQuery extends QueryParams {
  databaseId: string;
  includeDeleted?: boolean;
}

/**
 * Database query parameters
 */
export interface DatabaseQuery extends QueryParams {
  projectId?: string;
  userId?: string;
}

// ============================================================================
// CRUD Operation Types
// ============================================================================

/**
 * Create operation input
 */
export type CreateInput<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;

/**
 * Update operation input (partial)
 */
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'created_at'>>;

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  successful: number;
  failed: number;
  errors: ApiError[];
}

// ============================================================================
// File Upload Types
// ============================================================================

/**
 * File upload progress
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * File upload result
 */
export interface UploadResult {
  url: string;
  path: string;
  size: number;
  mimeType: string;
}

/**
 * File upload parameters
 */
export interface UploadParams {
  file: File;
  bucket: string;
  path?: string;
  onProgress?: (progress: UploadProgress) => void;
}

// ============================================================================
// Export/Import Types
// ============================================================================

/**
 * Export format
 */
export type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

/**
 * Export parameters
 */
export interface ExportParams {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  columns?: string[];
  filter?: FilterParams;
}

/**
 * Import mode
 */
export type ImportMode = 'create' | 'update' | 'upsert';

/**
 * Import parameters
 */
export interface ImportParams {
  file: File;
  mode: ImportMode;
  mapping?: Record<string, string>;
  databaseId: string;
}

/**
 * Import result
 */
export interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{
    row: number;
    error: string;
  }>;
}

// ============================================================================
// AI/Edge Function Types
// ============================================================================

/**
 * AI schema generation request
 */
export interface AISchemaRequest {
  description: string;
  provider?: 'claude' | 'openai' | 'gemini';
  model?: string;
}

/**
 * AI schema generation response
 */
export interface AISchemaResponse {
  schema: Database.TableSchema[];
  confidence: number;
  suggestions: string[];
}

/**
 * AI data parsing request
 */
export interface AIParseRequest {
  text: string;
  image?: string;
  expectedColumns?: string[];
}

/**
 * AI data parsing response
 */
export interface AIParseResponse {
  data: Record<string, unknown>[];
  columns: string[];
  confidence: number;
}

// ============================================================================
// Webhook Types
// ============================================================================

/**
 * Webhook event type
 */
export type WebhookEvent =
  | 'row.created'
  | 'row.updated'
  | 'row.deleted'
  | 'database.created'
  | 'database.updated'
  | 'database.deleted'
  ;

/**
 * Webhook payload
 */
export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Webhook subscription
 */
export interface WebhookSubscription {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret?: string;
  active: boolean;
}

// ============================================================================
// Stripe/Payment Types
// ============================================================================

/**
 * Payment intent request
 */
export interface CreatePaymentIntentRequest {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

/**
 * Payment intent response
 */
export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'past_due'
  | 'trialing'
  | 'unpaid'
  ;

/**
 * Subscription info
 */
export interface SubscriptionInfo {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: {
    id: string;
    name: string;
    amount: number;
    interval: 'month' | 'year';
  };
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if result is successful
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success === true;
}

/**
 * Check if result is failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.success === false;
}

/**
 * Check if error is ValidationError
 */
export function isValidationError(error: ApiError): error is ValidationError {
  return error.code === 'VALIDATION_ERROR' && 'fields' in error;
}

/**
 * Check if error is AuthError
 */
export function isAuthError(error: ApiError): error is AuthError {
  return ['AUTH_ERROR', 'INVALID_CREDENTIALS', 'SESSION_EXPIRED', 'UNAUTHORIZED'].includes(error.code);
}

/**
 * Check if error is NetworkError
 */
export function isNetworkError(error: ApiError): error is NetworkError {
  return ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_FAILED'].includes(error.code);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create success result
 */
export function success<T>(data: T): Success<T> {
  return { success: true, data };
}

/**
 * Create failure result
 */
export function failure<E = ApiError>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Create API error
 */
export function createApiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiError {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };
}
