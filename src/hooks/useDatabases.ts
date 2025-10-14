import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabaseAPI } from '@/api/databaseAPI';
import { Database } from '@/types/database';

export function useDatabases(userId: string) {
  return useQuery({
    queryKey: ['databases', userId],
    queryFn: () => DatabaseAPI.getDatabases(userId),
    enabled: !!userId,
  });
}

export function useDatabase(id: string) {
  return useQuery({
    queryKey: ['database', id],
    queryFn: () => DatabaseAPI.getDatabase(id),
    enabled: !!id,
  });
}

export function useCreateDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      user_id: string;
    }) => DatabaseAPI.createDatabase(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['databases', variables.user_id] });
    },
  });
}

export function useUpdateDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Database> }) =>
      DatabaseAPI.updateDatabase(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['database', data.id] });
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
  });
}

export function useDeleteDatabase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => DatabaseAPI.deleteDatabase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
  });
}

export function useDatabaseStats(databaseId: string) {
  return useQuery({
    queryKey: ['database-stats', databaseId],
    queryFn: () => DatabaseAPI.getDatabaseStats(databaseId),
    enabled: !!databaseId,
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  });
}

export function useTableSchema(databaseId: string) {
  return useQuery({
    queryKey: ['table-schema', databaseId],
    queryFn: () => DatabaseAPI.getTableSchemas(databaseId),
    enabled: !!databaseId,
  });
}
