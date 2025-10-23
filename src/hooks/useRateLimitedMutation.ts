/**
 * Custom React Query hooks with built-in rate limiting
 */

import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { rateLimitedSupabaseCall, RateLimitConfigs } from '@/lib/rateLimit';
import { toast } from 'sonner';

interface RateLimitError extends Error {
  code: string;
  resetTime?: number;
  remaining?: number;
}

function isRateLimitError(error: unknown): error is RateLimitError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as RateLimitError).code === 'RATE_LIMIT_EXCEEDED'
  );
}

/**
 * Enhanced mutation hook with rate limiting
 */
export function useRateLimitedMutation<TData, TError, TVariables, TContext>(
  operation: keyof typeof RateLimitConfigs,
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, TError, TVariables, TContext>
) {
  const { user } = useAuth();

  return useMutation<TData, TError, TVariables, TContext>({
    ...options,
    mutationFn: async (variables: TVariables) => {
      try {
        return await rateLimitedSupabaseCall(
          operation,
          user?.id,
          () => mutationFn(variables)
        );
      } catch (error) {
        if (isRateLimitError(error)) {
          toast.error(`Слишком много запросов`, {
            description: `Попробуйте снова через ${Math.ceil((error.resetTime || 0) / 1000)} секунд`,
          });
        }
        throw error;
      }
    },
    onError: (error, variables, context) => {
      // Handle rate limit errors specially
      if (isRateLimitError(error)) {
        console.warn('Rate limit exceeded:', {
          operation,
          remaining: error.remaining,
          resetTime: error.resetTime,
        });
      }

      // Call original onError if provided
      if (options?.onError) {
        options.onError(error, variables, context);
      }
    },
  });
}

/**
 * Rate-limited database operations
 */
export function useRateLimitedDatabaseMutation<T, TVariables = unknown>(
  operation: 'createDatabase' | 'updateDatabase' | 'deleteDatabase',
  mutationFn: (variables: TVariables) => Promise<T>
) {
  return useRateLimitedMutation(operation, mutationFn, {
    onSuccess: () => {
      toast.success('Операция выполнена успешно');
    },
    onError: (error) => {
      if (!isRateLimitError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        toast.error('Ошибка операции', {
          description: errorMessage,
        });
      }
    },
  });
}

/**
 * Rate-limited data operations
 */
export function useRateLimitedDataMutation<T, TVariables = unknown>(
  operation: 'insertData' | 'bulkOperations',
  mutationFn: (variables: TVariables) => Promise<T>
) {
  return useRateLimitedMutation(operation, mutationFn, {
    onError: (error) => {
      if (!isRateLimitError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        toast.error('Ошибка при работе с данными', {
          description: errorMessage,
        });
      }
    },
  });
}

/**
 * Rate-limited file operations
 */
export function useRateLimitedFileMutation<T, TVariables = unknown>(
  operation: 'fileUpload' | 'fileDownload',
  mutationFn: (variables: TVariables) => Promise<T>
) {
  return useRateLimitedMutation(operation, mutationFn, {
    onError: (error) => {
      if (!isRateLimitError(error)) {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        toast.error('Ошибка при работе с файлом', {
          description: errorMessage,
        });
      }
    },
  });
}

/**
 * Rate-limited authentication operations
 */
export function useRateLimitedAuthMutation<T, TVariables = unknown>(
  operation: 'login' | 'register' | 'passwordReset',
  mutationFn: (variables: TVariables) => Promise<T>
) {
  return useRateLimitedMutation(operation, mutationFn, {
    onError: (error) => {
      if (isRateLimitError(error)) {
        toast.error('Слишком много попыток', {
          description: `В целях безопасности, попробуйте снова через ${Math.ceil(
            (error.resetTime || 0) / 1000
          )} секунд`,
        });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
        toast.error('Ошибка аутентификации', {
          description: errorMessage,
        });
      }
    },
  });
}