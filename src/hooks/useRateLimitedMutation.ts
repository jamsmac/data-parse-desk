/**
 * Custom React Query hooks with built-in rate limiting
 */

import { useMutation, UseMutationOptions } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { rateLimitedSupabaseCall, RateLimitConfigs } from '@/lib/rateLimit';
import { toast } from 'sonner';

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
      } catch (error: any) {
        if (error.code === 'RATE_LIMIT_EXCEEDED') {
          toast.error(`Слишком много запросов`, {
            description: `Попробуйте снова через ${Math.ceil(error.resetTime / 1000)} секунд`,
          });
        }
        throw error;
      }
    },
    onError: (error: any, variables, context) => {
      // Handle rate limit errors specially
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
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
export function useRateLimitedDatabaseMutation<T>(
  operation: 'createDatabase' | 'updateDatabase' | 'deleteDatabase',
  mutationFn: (variables: any) => Promise<T>
) {
  return useRateLimitedMutation(operation, mutationFn, {
    onSuccess: () => {
      toast.success('Операция выполнена успешно');
    },
    onError: (error: any) => {
      if (error.code !== 'RATE_LIMIT_EXCEEDED') {
        toast.error('Ошибка операции', {
          description: error.message,
        });
      }
    },
  });
}

/**
 * Rate-limited data operations
 */
export function useRateLimitedDataMutation<T>(
  operation: 'insertData' | 'bulkOperations',
  mutationFn: (variables: any) => Promise<T>
) {
  return useRateLimitedMutation(operation, mutationFn, {
    onError: (error: any) => {
      if (error.code !== 'RATE_LIMIT_EXCEEDED') {
        toast.error('Ошибка при работе с данными', {
          description: error.message,
        });
      }
    },
  });
}

/**
 * Rate-limited file operations
 */
export function useRateLimitedFileMutation<T>(
  operation: 'fileUpload' | 'fileDownload',
  mutationFn: (variables: any) => Promise<T>
) {
  return useRateLimitedMutation(operation, mutationFn, {
    onError: (error: any) => {
      if (error.code !== 'RATE_LIMIT_EXCEEDED') {
        toast.error('Ошибка при работе с файлом', {
          description: error.message,
        });
      }
    },
  });
}

/**
 * Rate-limited authentication operations
 */
export function useRateLimitedAuthMutation<T>(
  operation: 'login' | 'register' | 'passwordReset',
  mutationFn: (variables: any) => Promise<T>
) {
  return useRateLimitedMutation(operation, mutationFn, {
    onError: (error: any) => {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Слишком много попыток', {
          description: `В целях безопасности, попробуйте снова через ${Math.ceil(
            error.resetTime / 1000
          )} секунд`,
        });
      } else {
        toast.error('Ошибка аутентификации', {
          description: error.message,
        });
      }
    },
  });
}