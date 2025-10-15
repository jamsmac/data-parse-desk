import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DatabaseAPI } from '@/api/databaseAPI';
import { TableFilters, TableSorting, TablePagination } from '@/types/database';
import { TableRow } from '@/types/common';

export function useTableData(
  databaseId: string,
  filters?: TableFilters,
  sorting?: TableSorting,
  pagination?: TablePagination
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
    mutationFn: (rowData: TableRow) =>
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
    mutationFn: ({ rowId, updates }: { rowId: string; updates: Partial<TableRow> }) =>
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
    mutationFn: (rows: TableRow[]) =>
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
