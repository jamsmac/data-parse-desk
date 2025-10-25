/**
 * DataContext - Manages table data operations (CRUD, pagination, filtering)
 * Extracted from DatabaseContext for better separation of concerns
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { api } from '@/api';
import type { ColumnValue } from '@/types/database';
import type { Filter } from '@/components/database/FilterBuilder';
import type { SortConfig } from '@/components/database/SortControls';

/**
 * Row data type
 */
export type RowData = Record<string, ColumnValue>;

/**
 * Table row with metadata
 */
export interface TableRow {
  id: string;
  data: RowData;
  created_at?: string;
  updated_at?: string;
}

/**
 * Data context type
 */
export interface DataContextType {
  // Data state
  rows: TableRow[];
  totalCount: number;
  loading: boolean;

  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // Filters & Sorting
  filters: Filter[];
  sort: SortConfig;
  setFilters: (filters: Filter[]) => void;
  setSort: (sort: SortConfig) => void;

  // Search
  searchQuery: string;
  searchColumns: string[];
  setSearchQuery: (query: string) => void;
  setSearchColumns: (columns: string[]) => void;

  // Operations
  refreshData: () => void;
  addRow: (rowData: RowData) => Promise<void>;
  updateRow: (rowId: string, updates: RowData) => Promise<void>;
  deleteRow: (rowId: string) => Promise<void>;
  duplicateRow: (rowId: string) => Promise<void>;

  // Bulk operations
  bulkDelete: (rowIds: string[]) => Promise<void>;
  bulkUpdate: (rowIds: string[], updates: RowData) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

/**
 * Provider props
 */
interface DataProviderProps {
  databaseId: string;
  children: ReactNode;
}

/**
 * Data Provider - Manages table data state and operations
 */
export function DataProvider({ databaseId, children }: DataProviderProps) {
  const { toast } = useToast();

  // State
  const [rows, setRows] = useState<TableRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filters & Sorting
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sort, setSort] = useState<SortConfig>({ columnId: '', direction: 'asc' });

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumns, setSearchColumns] = useState<string[]>([]);

  // Debounce filters and search
  const debouncedFilters = useDebounce(filters, 500);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Calculated values
  const totalPages = Math.ceil(totalCount / pageSize);

  /**
   * Load data with current filters, pagination, and sorting
   */
  const loadData = useCallback(async () => {
    if (!databaseId) return;

    try {
      setLoading(true);

      const result = await api.databases.row.getRows({
        databaseId,
        page,
        pageSize,
        filters: debouncedFilters,
        sort: sort.columnId ? sort : undefined,
        search: debouncedSearch || undefined,
        searchColumns: searchColumns.length > 0 ? searchColumns : undefined,
      });

      if (result.success) {
        setRows(result.data.rows);
        setTotalCount(result.data.total);
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка загрузки данных',
          description: result.error.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось загрузить данные',
      });
    } finally {
      setLoading(false);
    }
  }, [databaseId, page, pageSize, debouncedFilters, sort, debouncedSearch, searchColumns, toast]);

  /**
   * Refresh data
   */
  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  /**
   * Add new row
   */
  const addRow = useCallback(async (rowData: RowData) => {
    try {
      const result = await api.databases.row.insertRow(databaseId, rowData);

      if (result.success) {
        toast({
          title: 'Запись добавлена',
        });
        refreshData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось добавить запись',
      });
    }
  }, [databaseId, toast, refreshData]);

  /**
   * Update row
   */
  const updateRow = useCallback(async (rowId: string, updates: RowData) => {
    try {
      const result = await api.databases.row.updateRow(rowId, updates);

      if (result.success) {
        toast({
          title: 'Запись обновлена',
        });
        refreshData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить запись',
      });
    }
  }, [toast, refreshData]);

  /**
   * Delete row
   */
  const deleteRow = useCallback(async (rowId: string) => {
    try {
      const result = await api.databases.row.deleteRow(rowId);

      if (result.success) {
        toast({
          title: 'Запись удалена',
        });
        refreshData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить запись',
      });
    }
  }, [toast, refreshData]);

  /**
   * Duplicate row
   */
  const duplicateRow = useCallback(async (rowId: string) => {
    try {
      const result = await api.databases.row.duplicateRow(rowId);

      if (result.success) {
        toast({
          title: 'Запись дублирована',
        });
        refreshData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось дублировать запись',
      });
    }
  }, [toast, refreshData]);

  /**
   * Bulk delete rows
   */
  const bulkDelete = useCallback(async (rowIds: string[]) => {
    try {
      const result = await api.databases.row.bulkDelete(rowIds);

      if (result.success) {
        toast({
          title: 'Записи удалены',
          description: `Удалено записей: ${rowIds.length}`,
        });
        refreshData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить записи',
      });
    }
  }, [toast, refreshData]);

  /**
   * Bulk update rows
   */
  const bulkUpdate = useCallback(async (rowIds: string[], updates: RowData) => {
    try {
      const result = await api.databases.row.bulkUpdate(rowIds, updates);

      if (result.success) {
        toast({
          title: 'Записи обновлены',
          description: `Обновлено записей: ${rowIds.length}`,
        });
        refreshData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить записи',
      });
    }
  }, [toast, refreshData]);

  // Load data when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedFilters, debouncedSearch]);

  const value: DataContextType = {
    rows,
    totalCount,
    loading,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    filters,
    sort,
    setFilters,
    setSort,
    searchQuery,
    searchColumns,
    setSearchQuery,
    setSearchColumns,
    refreshData,
    addRow,
    updateRow,
    deleteRow,
    duplicateRow,
    bulkDelete,
    bulkUpdate,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

/**
 * Hook to use DataContext
 */
export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
}
