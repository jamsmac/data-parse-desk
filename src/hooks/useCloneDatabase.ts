/**
 * Хук для клонирования базы данных
 * Использует React Query для управления состоянием и кэширования
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DatabaseAPI } from '@/api/databaseAPI';
import { Database } from '@/types/database';
import { toast } from 'sonner';

interface CloneDatabaseOptions {
  newName?: string;
  includeData?: boolean;
  includeRelations?: boolean;
}

interface CloneDatabaseResult {
  success: boolean;
  database: Database;
  rowsCopied: number;
  totalRows: number;
}

export function useCloneDatabase() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    CloneDatabaseResult,
    Error,
    { databaseId: string } & CloneDatabaseOptions
  >({
    mutationFn: async ({ databaseId, newName, includeData, includeRelations }) => {
      return await DatabaseAPI.cloneDatabase(
        databaseId,
        newName,
        includeData || false,
        includeRelations || false
      );
    },
    onSuccess: (data) => {
      // Инвалидируем кэш списка баз данных
      queryClient.invalidateQueries({ queryKey: ['databases'] });

      // Добавляем новую БД в кэш
      queryClient.setQueryData(['databases'], (old: Database[] | undefined) => {
        if (!old) return [data.database];
        return [...old, data.database];
      });

      // Показываем уведомление об успехе
      toast.success(
        `База данных клонирована${
          data.rowsCopied > 0 ? `. Скопировано ${data.rowsCopied} записей` : ''
        }`
      );
    },
    onError: (error) => {
      console.error('Clone database error:', error);
      toast.error(
        `Ошибка при клонировании: ${error.message || 'Неизвестная ошибка'}`
      );
    }
  });

  return {
    cloneDatabase: mutation.mutate,
    cloneDatabaseAsync: mutation.mutateAsync,
    isCloning: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset
  };
}

// Хук для отслеживания прогресса клонирования больших БД
export function useCloneProgress(operationId: string | null, enabled: boolean = false) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['clone-progress', operationId],
    queryFn: async () => {
      if (!operationId) throw new Error('No operation ID');
      return await DatabaseAPI.getCloneProgress(operationId);
    },
    enabled: enabled && !!operationId,
    refetchInterval: enabled ? 1000 : false, // Обновляем каждую секунду
    refetchIntervalInBackground: false
  });

  return {
    progress: data?.progress || 0,
    status: data?.status || 'unknown',
    totalRows: data?.totalRows || 0,
    copiedRows: data?.copiedRows || 0,
    error: data?.error || error?.message,
    isLoading,
    refetch
  };
}