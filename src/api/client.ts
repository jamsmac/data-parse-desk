/**
 * API Client - Centralized Supabase client with interceptors and error handling
 * Provides type-safe API calls with Result types
 */

import { supabase } from '@/integrations/supabase/client';
import type { AsyncResult, ApiError, SupabaseError } from '@/types/api';
import { isSupabaseError } from '@/types/guards';

/**
 * Request configuration
 */
export interface RequestConfig {
  skipErrorLogging?: boolean;
  skipErrorToast?: boolean;
  retries?: number;
  timeout?: number;
}

/**
 * API Client error handler
 */
class ApiClient {
  private errorHandlers: Array<(error: ApiError) => void> = [];
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig> = [];
  private responseInterceptors: Array<(response: unknown) => unknown> = [];

  /**
   * Add error handler (e.g., for toast notifications, Sentry logging)
   */
  addErrorHandler(handler: (error: ApiError) => void): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Add request interceptor (e.g., for auth tokens, logging)
   */
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor (e.g., for data transformation)
   */
  addResponseInterceptor(interceptor: (response: unknown) => unknown): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Handle error with all registered handlers
   */
  private handleError(error: ApiError, config: RequestConfig): void {
    if (config.skipErrorLogging) return;

    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error handler failed:', err);
      }
    });
  }

  /**
   * Convert Supabase error to ApiError
   */
  private convertSupabaseError(error: unknown, context?: string): ApiError {
    if (isSupabaseError(error)) {
      return {
        code: error.code || 'SUPABASE_ERROR',
        message: error.message,
        details: {
          hint: error.hint,
          details: error.details,
        },
        status: error.status,
        timestamp: new Date().toISOString(),
      };
    }

    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        details: { context },
        timestamp: new Date().toISOString(),
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      details: { context, error },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Execute Supabase RPC call with error handling
   */
  async rpc<T>(
    functionName: string,
    params?: Record<string, unknown>,
    config: RequestConfig = {}
  ): AsyncResult<T> {
    try {
      // Apply request interceptors
      let finalConfig = config;
      for (const interceptor of this.requestInterceptors) {
        finalConfig = interceptor(finalConfig);
      }

      const { data, error } = await supabase.rpc(functionName, params);

      if (error) {
        const apiError = this.convertSupabaseError(error, `RPC: ${functionName}`);
        this.handleError(apiError, finalConfig);
        return { success: false, error: apiError };
      }

      // Apply response interceptors
      let finalData = data as T;
      for (const interceptor of this.responseInterceptors) {
        finalData = interceptor(finalData) as T;
      }

      return { success: true, data: finalData };
    } catch (error) {
      const apiError = this.convertSupabaseError(error, `RPC: ${functionName}`);
      this.handleError(apiError, config);
      return { success: false, error: apiError };
    }
  }

  /**
   * Execute Supabase query with error handling
   */
  async query<T>(
    builder: PromiseLike<{ data: T | null; error: unknown }>,
    config: RequestConfig = {}
  ): AsyncResult<T> {
    try {
      // Apply request interceptors
      let finalConfig = config;
      for (const interceptor of this.requestInterceptors) {
        finalConfig = interceptor(finalConfig);
      }

      const { data, error } = await builder;

      if (error) {
        const apiError = this.convertSupabaseError(error, 'Query');
        this.handleError(apiError, finalConfig);
        return { success: false, error: apiError };
      }

      if (data === null) {
        const apiError: ApiError = {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          timestamp: new Date().toISOString(),
        };
        this.handleError(apiError, finalConfig);
        return { success: false, error: apiError };
      }

      // Apply response interceptors
      let finalData = data;
      for (const interceptor of this.responseInterceptors) {
        finalData = interceptor(finalData) as T;
      }

      return { success: true, data: finalData };
    } catch (error) {
      const apiError = this.convertSupabaseError(error, 'Query');
      this.handleError(apiError, config);
      return { success: false, error: apiError };
    }
  }

  /**
   * Execute mutation (insert/update/delete) with error handling
   */
  async mutate<T>(
    builder: PromiseLike<{ data: T | null; error: unknown }>,
    config: RequestConfig = {}
  ): AsyncResult<T> {
    return this.query(builder, config);
  }

  /**
   * Get Supabase client for direct access (use sparingly)
   */
  getClient() {
    return supabase;
  }
}

/**
 * Singleton API client instance
 */
export const apiClient = new ApiClient();

/**
 * Default error handler that logs to console
 */
apiClient.addErrorHandler((error: ApiError) => {
  console.error('[API Error]', {
    code: error.code,
    message: error.message,
    details: error.details,
    timestamp: error.timestamp,
  });

  // Send to Sentry in production
  if (typeof window !== 'undefined' && window.Sentry && import.meta.env.PROD) {
    window.Sentry.captureException(new Error(error.message), {
      contexts: {
        apiError: error,
      },
      level: 'error',
      tags: {
        errorCode: error.code,
      },
    });
  }
});

/**
 * Request interceptor for logging in development
 */
if (import.meta.env.DEV) {
  apiClient.addRequestInterceptor((config: RequestConfig) => {
    console.log('[API Request]', config);
    return config;
  });
}

/**
 * Helper functions for common operations
 */

/**
 * Unwrap Result type - throws on error, returns data on success
 * Use with caution - prefer explicit error handling
 */
export function unwrap<T>(result: AsyncResult<T>): Promise<T> {
  return result.then(r => {
    if (r.success) {
      return r.data;
    }
    throw new Error(r.error.message);
  });
}

/**
 * Map Result data with a transformation function
 */
export function mapResult<T, U>(
  result: AsyncResult<T>,
  mapper: (data: T) => U
): AsyncResult<U> {
  return result.then(r => {
    if (r.success) {
      return { success: true, data: mapper(r.data) };
    }
    return r;
  });
}

/**
 * Chain multiple async operations with Result types
 */
export async function chain<T, U>(
  result: AsyncResult<T>,
  next: (data: T) => AsyncResult<U>
): AsyncResult<U> {
  const r = await result;
  if (r.success) {
    return next(r.data);
  }
  return r;
}
