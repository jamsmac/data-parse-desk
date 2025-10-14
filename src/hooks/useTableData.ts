import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabaseAPI } from '@/api/databaseAPI';

export function useTableData(
  databaseId: string,
  filters?: Record<string, any>,
  sorting?: { column: string; direction: 'asc' | 'desc' },
  pagination?: { page: number; pageSize: number }
) {
  return useQuery({
    queryKey: ['table-data', databaseId, filters, sorting, pagination],
    queryFn: () => DatabaseAPI.getTableData(databaseId, filters, sorting, pagination),
    enabled: !!databaseId,
    staleTime: 30000, // 30 секунд
  });
}

export function useInsertRow(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rowData: Record<string, any>) =>
      DatabaseAPI.insertTableRow(databaseId, rowData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['database-stats', databaseId] });
    },
  });
}

export function useUpdateRow(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rowId, updates }: { rowId: string; updates: Record<string, any> }) =>
      DatabaseAPI.updateTableRow(databaseId, rowId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data', databaseId] });
    },
  });
}

export function useDeleteRow(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rowId: string) => DatabaseAPI.deleteTableRow(databaseId, rowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['database-stats', databaseId] });
    },
  });
}

export function useBulkInsert(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rows: Record<string, any>[]) =>
      DatabaseAPI.bulkInsertTableRows(databaseId, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['database-stats', databaseId] });
    },
  });
}

export function useBulkDelete(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rowIds: string[]) =>
      DatabaseAPI.bulkDeleteTableRows(databaseId, rowIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['table-data', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['database-stats', databaseId] });
    },
  });
}
