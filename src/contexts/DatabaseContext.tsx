/**
 * DatabaseContext - Centralized state management for database views
 * Eliminates props drilling by providing shared state and actions
 */

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import type { TableSchema, ColumnConfig, ColumnValue, TableRow } from '@/types/database';
import type { Filter } from '@/components/database/FilterBuilder';
import type { SortConfig } from '@/components/database/SortControls';

// View types for different data visualizations
export type ViewType = 'table' | 'kanban' | 'calendar' | 'gallery';

// Selection state for bulk actions
export interface SelectionState {
  selectedRows: Set<string>;
  isAllSelected: boolean;
}

// Pagination state
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalCount: number;
}

// Database context type definition
interface DatabaseContextType {
  // Data state
  databaseId: string | null;
  projectId: string | null;
  schemas: TableSchema[];
  columns: ColumnConfig[];

  // View state
  viewType: ViewType;
  setViewType: (type: ViewType) => void;

  // Filter & Sort state
  filters: Filter[];
  setFilters: (filters: Filter[]) => void;
  sorting: SortConfig[];
  setSorting: (sorting: SortConfig[]) => void;

  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Selection state
  selection: SelectionState;
  toggleRowSelection: (rowId: string) => void;
  toggleAllRowsSelection: () => void;
  clearSelection: () => void;

  // Pagination state
  pagination: PaginationState;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotalCount: (count: number) => void;

  // Actions
  actions: {
    onRowEdit: (rowId: string, data: Partial<TableRow>) => Promise<void>;
    onRowDelete: (rowId: string) => Promise<void>;
    onBulkDelete: (rowIds: string[]) => Promise<void>;
    onCellEdit: (rowId: string, columnId: string, value: ColumnValue) => Promise<void>;
    onColumnAdd: (column: TableSchema) => Promise<void>;
    onColumnEdit: (columnId: string, updates: Partial<TableSchema>) => Promise<void>;
    onColumnDelete: (columnId: string) => Promise<void>;
    onExport: (format: 'csv' | 'excel' | 'json') => Promise<void>;
  };

  // UI state
  ui: {
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    activePanel: 'comments' | 'ai' | 'insights' | 'activity' | null;
    setActivePanel: (panel: 'comments' | 'ai' | 'insights' | 'activity' | null) => void;
  };
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
  databaseId: string;
  projectId: string;
  initialSchemas?: TableSchema[];
  onRowEdit?: (rowId: string, data: Partial<TableRow>) => Promise<void>;
  onRowDelete?: (rowId: string) => Promise<void>;
  onBulkDelete?: (rowIds: string[]) => Promise<void>;
  onCellEdit?: (rowId: string, columnId: string, value: ColumnValue) => Promise<void>;
  onColumnAdd?: (column: TableSchema) => Promise<void>;
  onColumnEdit?: (columnId: string, updates: Partial<TableSchema>) => Promise<void>;
  onColumnDelete?: (columnId: string) => Promise<void>;
  onExport?: (format: 'csv' | 'excel' | 'json') => Promise<void>;
}

export function DatabaseProvider({
  children,
  databaseId,
  projectId,
  initialSchemas = [],
  onRowEdit = async () => {},
  onRowDelete = async () => {},
  onBulkDelete = async () => {},
  onCellEdit = async () => {},
  onColumnAdd = async () => {},
  onColumnEdit = async () => {},
  onColumnDelete = async () => {},
  onExport = async () => {},
}: DatabaseProviderProps) {
  // View state
  const [viewType, setViewType] = useState<ViewType>('table');
  const [schemas] = useState<TableSchema[]>(initialSchemas);

  // Filter & Sort state
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sorting, setSorting] = useState<SortConfig[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'comments' | 'ai' | 'insights' | 'activity' | null>(null);

  // Selection handlers
  const toggleRowSelection = useCallback((rowId: string) => {
    setSelectedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  const toggleAllRowsSelection = useCallback(() => {
    setIsAllSelected((prev) => !prev);
    if (!isAllSelected) {
      // Select all logic would need row IDs from parent
      // For now, just toggle the flag
    } else {
      setSelectedRows(new Set());
    }
  }, [isAllSelected]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
    setIsAllSelected(false);
  }, []);

  // Derive columns from schemas
  const columns = useMemo(() => {
    return schemas.map((schema) => ({
      id: schema.column_name,
      name: schema.column_name,
      type: schema.data_type,
      visible: true,
      width: 150,
    }));
  }, [schemas]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<DatabaseContextType>(
    () => ({
      // Data state
      databaseId,
      projectId,
      schemas,
      columns,

      // View state
      viewType,
      setViewType,

      // Filter & Sort
      filters,
      setFilters,
      sorting,
      setSorting,

      // Search
      searchQuery,
      setSearchQuery,

      // Selection
      selection: {
        selectedRows,
        isAllSelected,
      },
      toggleRowSelection,
      toggleAllRowsSelection,
      clearSelection,

      // Pagination
      pagination: {
        currentPage,
        pageSize,
        totalCount,
      },
      setCurrentPage,
      setPageSize,
      setTotalCount,

      // Actions
      actions: {
        onRowEdit,
        onRowDelete,
        onBulkDelete,
        onCellEdit,
        onColumnAdd,
        onColumnEdit,
        onColumnDelete,
        onExport,
      },

      // UI state
      ui: {
        isLoading,
        setIsLoading,
        sidebarOpen,
        setSidebarOpen,
        activePanel,
        setActivePanel,
      },
    }),
    [
      databaseId,
      projectId,
      schemas,
      columns,
      viewType,
      filters,
      sorting,
      searchQuery,
      selectedRows,
      isAllSelected,
      currentPage,
      pageSize,
      totalCount,
      isLoading,
      sidebarOpen,
      activePanel,
      toggleRowSelection,
      toggleAllRowsSelection,
      clearSelection,
      onRowEdit,
      onRowDelete,
      onBulkDelete,
      onCellEdit,
      onColumnAdd,
      onColumnEdit,
      onColumnDelete,
      onExport,
    ]
  );

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

/**
 * Hook to use DatabaseContext
 * Throws error if used outside DatabaseProvider
 */
export function useDatabaseContext() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
}

/**
 * Hook to use only database actions
 * Convenient shorthand for accessing actions
 */
export function useDatabaseActions() {
  const { actions } = useDatabaseContext();
  return actions;
}

/**
 * Hook to use only selection state
 * Convenient shorthand for accessing selection
 */
export function useDatabaseSelection() {
  const { selection, toggleRowSelection, toggleAllRowsSelection, clearSelection } = useDatabaseContext();
  return {
    ...selection,
    toggleRowSelection,
    toggleAllRowsSelection,
    clearSelection,
  };
}

/**
 * Hook to use only pagination state
 * Convenient shorthand for accessing pagination
 */
export function useDatabasePagination() {
  const { pagination, setCurrentPage, setPageSize, setTotalCount } = useDatabaseContext();
  return {
    ...pagination,
    setCurrentPage,
    setPageSize,
    setTotalCount,
  };
}

/**
 * Hook to use only UI state
 * Convenient shorthand for accessing UI state
 */
export function useDatabaseUI() {
  const { ui } = useDatabaseContext();
  return ui;
}
