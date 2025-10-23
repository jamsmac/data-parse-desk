/**
 * DatabaseContext - Centralized state management for database operations
 * Eliminates props drilling from DatabaseView to DataTable and other components
 * Manages all database state, operations, and UI state in one place
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTableData } from '@/hooks/useTableData';
import { useViewPreferences } from '@/hooks/useViewPreferences';
import { useComments } from '@/hooks/useComments';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useDebounce } from '@/hooks/useDebounce';
import type { Database, TableSchema } from '@/types/database';
import type { Filter } from '@/components/database/FilterBuilder';
import type { SortConfig } from '@/components/database/SortControls';
import type { ImportSuccessData } from '@/components/import/UploadFileDialog';

// ============================================
// TYPES
// ============================================

export type ViewType = 'table' | 'calendar' | 'kanban' | 'gallery';

export type CellValue = string | number | boolean | null | Date;
export type RowData = Record<string, CellValue>;

export interface TableRow {
  id: string;
  data: RowData;
  created_at?: string;
  updated_at?: string;
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  database_id?: string;
  row_id?: string;
}

export interface HistoryAction {
  action: 'update' | 'insert' | 'delete';
  tableName: string;
  rowId: string;
  columnName?: string;
  before?: RowData;
  after?: RowData;
}

export interface DatabaseContextType {
  // IDs
  projectId: string | null;
  databaseId: string | null;

  // Database metadata
  database: Database | null;
  schemas: TableSchema[];
  loading: boolean;

  // Table data
  tableData: TableRow[];
  totalCount: number;
  dataLoading: boolean;

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
  updateFilters: (filters: Filter[]) => void;
  updateSort: (sort: SortConfig) => void;
  updatePageSize: (size: number) => void;

  // Search
  searchQuery: string;
  searchColumns: string[];
  setSearchQuery: (query: string) => void;
  setSearchColumns: (columns: string[]) => void;

  // View preferences
  viewType: ViewType;
  setViewType: (type: ViewType) => void;
  preferencesLoading: boolean;

  // Comments
  comments: Comment[];
  commentsLoading: boolean;
  addComment: (content: string, rowId?: string) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;

  // Dialogs
  showClearDialog: boolean;
  showDeleteDialog: boolean;
  isUploadDialogOpen: boolean;
  showSuccessScreen: boolean;
  importSuccessData: ImportSuccessData | null;
  showFilters: boolean;
  showAIChat: boolean;
  showInsights: boolean;
  showCollabPanel: boolean;
  setShowClearDialog: (show: boolean) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setIsUploadDialogOpen: (open: boolean) => void;
  setShowSuccessScreen: (show: boolean) => void;
  setImportSuccessData: (data: ImportSuccessData | null) => void;
  setShowFilters: (show: boolean) => void;
  setShowAIChat: (show: boolean) => void;
  setShowInsights: (show: boolean) => void;
  setShowCollabPanel: (show: boolean) => void;

  // Database operations
  loadDatabase: () => Promise<void>;
  loadSchemas: () => Promise<void>;
  refreshData: () => void;

  // Row operations
  handleAddRow: (rowData: RowData) => Promise<void>;
  handleUpdateRow: (rowId: string, updates: RowData) => Promise<void>;
  handleDeleteRow: (rowId: string) => Promise<void>;
  handleDuplicateRow: (rowId: string) => Promise<void>;
  handleInsertRowAbove: (rowId: string) => Promise<void>;
  handleInsertRowBelow: (rowId: string) => Promise<void>;
  handleRowView: (rowId: string) => void;
  handleRowHistory: (rowId: string) => void;

  // Bulk operations
  handleBulkDelete: (rowIds: string[]) => Promise<void>;
  handleBulkDuplicate: (rowIds: string[]) => Promise<void>;
  handleBulkEdit: (rowIds: string[], column: string, value: CellValue) => Promise<void>;

  // Database actions
  handleClearData: () => Promise<void>;
  handleDeleteDatabase: () => Promise<void>;

  // Undo/Redo
  addToHistory: (action: HistoryAction) => void;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const { projectId, databaseId } = useParams<{ projectId: string; databaseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // ============================================
  // STATE
  // ============================================

  // Database metadata
  const [database, setDatabase] = useState<Database | null>(null);
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [importSuccessData, setImportSuccessData] = useState<ImportSuccessData | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [viewType, setViewType] = useState<ViewType>('table');

  // Initialize Undo/Redo
  const { addToHistory } = useUndoRedo(databaseId);

  // Load comments
  const {
    comments,
    loading: commentsLoading,
    addComment,
    updateComment,
    deleteComment
  } = useComments(databaseId || '');

  // Load view preferences
  const {
    preferences,
    loading: preferencesLoading,
    updateFilters,
    updateSort,
    updatePageSize
  } = useViewPreferences(databaseId || '');

  // Pagination, Filters & Sorting state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(preferences.pageSize);
  const [filters, setFilters] = useState<Filter[]>(preferences.filters);
  const [sort, setSort] = useState<SortConfig>(preferences.sort);

  // Debounce filters
  const debouncedFilters = useDebounce(filters, 500);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchColumns, setSearchColumns] = useState<string[]>([]);

  // Update local state when preferences load
  useEffect(() => {
    if (!preferencesLoading) {
      setPageSize(preferences.pageSize);
      setFilters(preferences.filters);
      setSort(preferences.sort);
    }
  }, [preferencesLoading, preferences]);

  // Save debounced filters to preferences
  useEffect(() => {
    if (!preferencesLoading && debouncedFilters !== preferences.filters) {
      updateFilters(debouncedFilters);
    }
  }, [debouncedFilters, preferencesLoading, preferences.filters, updateFilters]);

  // Use hook for data fetching
  const { data: tableData, totalCount, loading: dataLoading, refresh } = useTableData({
    databaseId: databaseId || '',
    page,
    pageSize,
    filters: debouncedFilters,
    sort,
    search: searchQuery,
    searchColumns,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  const loadDatabase = useCallback(async () => {
    if (!databaseId || !user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_database', {
        p_id: databaseId,
      });

      if (error) throw error;
      setDatabase(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [databaseId, user, toast]);

  const loadSchemas = useCallback(async () => {
    if (!databaseId) return;

    try {
      const { data, error } = await supabase.rpc('get_table_schemas', {
        p_database_id: databaseId,
      });

      if (error) throw error;
      setSchemas((data || []) as TableSchema[]);
    } catch (error) {
      console.error('Error loading schemas:', error);
    }
  }, [databaseId]);

  const refreshData = useCallback(() => {
    refresh();
  }, [refresh]);

  // ============================================
  // ROW OPERATIONS
  // ============================================

  const handleAddRow = useCallback(async (rowData: RowData) => {
    if (!databaseId) return;

    try {
      const { error } = await supabase.rpc('insert_table_row', {
        p_database_id: databaseId,
        p_data: rowData,
      });

      if (error) throw error;

      toast({
        title: 'Запись добавлена',
      });

      refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить запись';
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: errorMessage,
      });
    }
  }, [databaseId, toast, refresh]);

  const handleUpdateRow = useCallback(async (rowId: string, updates: RowData) => {
    try {
      // Get current data before update
      const { data: currentRow } = await supabase
        .from('table_data')
        .select('data')
        .eq('id', rowId)
        .single();

      // Add to undo/redo history BEFORE making changes
      if (currentRow?.data && databaseId) {
        const changedColumns = Object.keys(updates).filter(
          key => JSON.stringify(currentRow.data[key]) !== JSON.stringify(updates[key])
        );

        // Add each changed column to history
        changedColumns.forEach(columnName => {
          addToHistory({
            action: 'update',
            tableName: databaseId,
            rowId,
            columnName,
            before: { [columnName]: currentRow.data[columnName] },
            after: { [columnName]: updates[columnName] },
          });
        });
      }

      // Update the row
      const { error } = await supabase.rpc('update_table_row', {
        p_id: rowId,
        p_data: updates,
      });

      if (error) throw error;

      // Track history for changed columns
      if (currentRow?.data && databaseId) {
        const changedColumns = Object.keys(updates).filter(
          key => JSON.stringify(currentRow.data[key]) !== JSON.stringify(updates[key])
        );

        for (const columnName of changedColumns) {
          // Get or create cell metadata
          const { data: cellMeta } = await supabase
            .from('cell_metadata')
            .select('id')
            .eq('row_id', rowId)
            .eq('column_name', columnName)
            .maybeSingle();

          let metadataId = cellMeta?.id;

          // Create metadata if doesn't exist
          if (!metadataId) {
            const { data: newMeta } = await supabase
              .from('cell_metadata')
              .insert({
                database_id: databaseId,
                row_id: rowId,
                column_name: columnName,
                imported_by: user?.id,
              })
              .select('id')
              .single();

            metadataId = newMeta?.id;
          }

          // Create history record
          if (metadataId) {
            await supabase.from('cell_history').insert({
              cell_metadata_id: metadataId,
              old_value: currentRow.data[columnName],
              new_value: updates[columnName],
              change_type: 'updated',
              changed_by: user?.id,
            });
          }
        }
      }

      toast({
        title: 'Запись обновлена',
      });

      refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось обновить запись';
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: errorMessage,
      });
    }
  }, [databaseId, user, toast, refresh, addToHistory]);

  const handleDeleteRow = useCallback(async (rowId: string) => {
    try {
      const { error } = await supabase.rpc('delete_table_row', {
        p_id: rowId,
      });

      if (error) throw error;

      toast({
        title: 'Запись удалена',
      });

      refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось удалить запись';
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: errorMessage,
      });
    }
  }, [toast, refresh]);

  const handleDuplicateRow = useCallback(async (rowId: string) => {
    try {
      const row = tableData.find(r => r.id === rowId);
      if (!row) return;

      await handleAddRow(row.data);

      toast({
        title: 'Запись дублирована',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось дублировать запись';
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: errorMessage,
      });
    }
  }, [tableData, handleAddRow, toast]);

  const handleInsertRowAbove = useCallback(async (rowId: string) => {
    try {
      await handleAddRow({});
      toast({
        title: 'Новая строка добавлена выше',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить строку';
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: errorMessage,
      });
    }
  }, [handleAddRow, toast]);

  const handleInsertRowBelow = useCallback(async (rowId: string) => {
    try {
      await handleAddRow({});
      toast({
        title: 'Новая строка добавлена ниже',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось добавить строку';
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: errorMessage,
      });
    }
  }, [handleAddRow, toast]);

  const handleRowView = useCallback((rowId: string) => {
    const row = tableData.find(r => r.id === rowId);
    if (row) {
      console.log('View row:', row);
      toast({
        title: 'Просмотр записи',
        description: 'Функция просмотра в разработке',
      });
    }
  }, [tableData, toast]);

  const handleRowHistory = useCallback((rowId: string) => {
    console.log('Show history for row:', rowId);
    toast({
      title: 'История изменений',
      description: 'Функция истории в разработке',
    });
  }, [toast]);

  // ============================================
  // BULK OPERATIONS
  // ============================================

  const handleBulkDelete = useCallback(async (rowIds: string[]) => {
    try {
      for (const rowId of rowIds) {
        await supabase.rpc('delete_table_row', { p_id: rowId });
      }
      refresh();
    } catch (error) {
      throw new Error('Не удалось удалить записи');
    }
  }, [refresh]);

  const handleBulkDuplicate = useCallback(async (rowIds: string[]) => {
    try {
      for (const rowId of rowIds) {
        const row = tableData.find(r => r.id === rowId);
        if (row) {
          await handleAddRow(row.data);
        }
      }
      refresh();
    } catch (error) {
      throw new Error('Не удалось дублировать записи');
    }
  }, [tableData, handleAddRow, refresh]);

  const handleBulkEdit = useCallback(async (rowIds: string[], column: string, value: CellValue) => {
    try {
      for (const rowId of rowIds) {
        const row = tableData.find(r => r.id === rowId);
        if (row) {
          const updatedData = {
            ...row.data,
            [column]: value,
          };
          await handleUpdateRow(rowId, updatedData);
        }
      }
      refresh();
    } catch (error) {
      throw new Error('Не удалось обновить записи');
    }
  }, [tableData, handleUpdateRow, refresh]);

  // ============================================
  // DATABASE ACTIONS
  // ============================================

  const handleClearData = useCallback(async () => {
    if (!databaseId) return;

    try {
      const { error } = await supabase.rpc('clear_database_data', {
        p_database_id: databaseId,
      });

      if (error) throw error;

      toast({
        title: 'Данные очищены',
        description: 'Все записи удалены из базы данных',
      });

      refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось очистить данные';
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: errorMessage,
      });
    }
  }, [databaseId, toast, refresh]);

  const handleDeleteDatabase = useCallback(async () => {
    if (!databaseId) return;

    try {
      const { error } = await supabase.rpc('delete_database', {
        p_id: databaseId,
      });

      if (error) throw error;

      toast({
        title: 'База данных удалена',
        description: 'База данных успешно удалена',
      });

      navigate(`/projects/${projectId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Не удалось удалить базу данных';
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: errorMessage,
      });
    }
  }, [databaseId, projectId, navigate, toast]);

  // ============================================
  // LOAD DATA ON MOUNT
  // ============================================

  useEffect(() => {
    loadDatabase();
    loadSchemas();
  }, [loadDatabase, loadSchemas]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: DatabaseContextType = {
    projectId: projectId || null,
    databaseId: databaseId || null,
    database,
    schemas,
    loading,
    tableData,
    totalCount,
    dataLoading,
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    filters,
    sort,
    setFilters,
    setSort,
    updateFilters,
    updateSort,
    updatePageSize,
    searchQuery,
    searchColumns,
    setSearchQuery,
    setSearchColumns,
    viewType,
    setViewType,
    preferencesLoading,
    comments,
    commentsLoading,
    addComment,
    updateComment,
    deleteComment,
    showClearDialog,
    showDeleteDialog,
    isUploadDialogOpen,
    showSuccessScreen,
    importSuccessData,
    showFilters,
    showAIChat,
    showInsights,
    showCollabPanel,
    setShowClearDialog,
    setShowDeleteDialog,
    setIsUploadDialogOpen,
    setShowSuccessScreen,
    setImportSuccessData,
    setShowFilters,
    setShowAIChat,
    setShowInsights,
    setShowCollabPanel,
    loadDatabase,
    loadSchemas,
    refreshData,
    handleAddRow,
    handleUpdateRow,
    handleDeleteRow,
    handleDuplicateRow,
    handleInsertRowAbove,
    handleInsertRowBelow,
    handleRowView,
    handleRowHistory,
    handleBulkDelete,
    handleBulkDuplicate,
    handleBulkEdit,
    handleClearData,
    handleDeleteDatabase,
    addToHistory,
  };

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
    throw new Error('useDatabaseContext must be used within DatabaseProvider');
  }
  return context;
}
