import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Plus, Filter as FilterIcon, Sparkles, MessageSquare, History, FileText, Lightbulb, Table, Calendar, Columns, Image } from 'lucide-react';
import { CalendarView } from '@/components/views/CalendarView';
import { KanbanView } from '@/components/views/KanbanView';
import { GalleryView } from '@/components/views/GalleryView';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { CardSkeleton } from '@/components/common/CardSkeleton';
import { KanbanSkeleton } from '@/components/common/KanbanSkeleton';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { EmptyState } from '@/components/common/EmptyState';
import { ColumnManager } from '@/components/database/ColumnManager';
import { UploadFileDialog, ImportSuccessData } from '@/components/import/UploadFileDialog';
import { ImportSuccessScreen } from '@/components/import/ImportSuccessScreen';
import { ExportButton } from '@/components/database/ExportButton';
import { PaginationControls } from '@/components/database/PaginationControls';
import { FilterBuilder, type Filter } from '@/components/database/FilterBuilder';
import { SortControls, type SortConfig } from '@/components/database/SortControls';
import { useTableData } from '@/hooks/useTableData';
import { useViewPreferences } from '@/hooks/useViewPreferences';
import { useComments } from '@/hooks/useComments';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useDebounce } from '@/hooks/useDebounce';
import { UndoRedoToolbar } from '@/components/database/UndoRedoToolbar';
import { TableSearch } from '@/components/database/TableSearch';
import { ActionBar } from '@/components/database/ActionBar';
import { MobileActionBar } from '@/components/database/MobileActionBar';
import { ConversationAIPanel } from '@/components/ai/ConversationAIPanel';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { InsightsPanel } from '@/components/insights/InsightsPanel';
import { CommentsPanel } from '@/components/collaboration/CommentsPanel';
import { ActivityFeed } from '@/components/collaboration/ActivityFeed';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Database, TableSchema } from '@/types/database';

export default function DatabaseView() {
  const { projectId, databaseId } = useParams<{ projectId: string; databaseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [database, setDatabase] = useState<Database | null>(null);
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [importSuccessData, setImportSuccessData] = useState<ImportSuccessData | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showCollabPanel, setShowCollabPanel] = useState(false);
  const [viewType, setViewType] = useState<'table' | 'calendar' | 'kanban' | 'gallery'>('table');

  // Initialize Undo/Redo
  const { addToHistory } = useUndoRedo(databaseId);

  // Load comments for the database (not tied to specific row)
  const {
    comments,
    loading: commentsLoading,
    addComment,
    updateComment,
    deleteComment
  } = useComments(databaseId || '');

  // Load view preferences (filters, sort, pageSize are auto-restored)
  const { 
    preferences, 
    loading: preferencesLoading,
    updateFilters,
    updateSort,
    updatePageSize 
  } = useViewPreferences(databaseId || '');

  // Pagination, Filters & Sorting state - initialize from preferences
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(preferences.pageSize);
  const [filters, setFilters] = useState<Filter[]>(preferences.filters);
  const [sort, setSort] = useState<SortConfig>(preferences.sort);

  // Debounce filters to avoid too many API calls while user is typing
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
  }, [debouncedFilters]);

  // Use new hook for data fetching with filters & sorting
  const { data: tableData, totalCount, loading: dataLoading, refresh } = useTableData({
    databaseId: databaseId || '',
    page,
    pageSize,
    filters: debouncedFilters,
    sort,
    search: searchQuery,
    searchColumns,
  });

  useEffect(() => {
    loadDatabase();
    loadSchemas();
  }, [databaseId, user]);

  const loadDatabase = async () => {
    if (!databaseId || !user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_database', {
        p_id: databaseId,
      });

      if (error) throw error;
      setDatabase(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSchemas = async () => {
    if (!databaseId) return;

    try {
      const { data, error } = await supabase.rpc('get_table_schemas', {
        p_database_id: databaseId,
      });

      if (error) throw error;
      setSchemas((data || []) as any);
    } catch (error: any) {
      console.error('Error loading schemas:', error);
    }
  };

  // Data is now loaded via useTableData hook

  const handleClearData = async () => {
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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleDeleteDatabase = async () => {
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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleAddRow = async (rowData: any) => {
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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleUpdateRow = async (rowId: string, updates: any) => {
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
          const { data: cellMeta, error: metaError } = await supabase
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
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    try {
      const { error } = await supabase.rpc('delete_table_row', {
        p_id: rowId,
      });

      if (error) throw error;

      toast({
        title: 'Запись удалена',
      });

      refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleDuplicateRow = async (rowId: string) => {
    try {
      // Find the row to duplicate
      const row = tableData.find((r: any) => r.id === rowId);
      if (!row) return;

      // Insert a new row with the same data
      await handleAddRow(row.data);

      toast({
        title: 'Запись дублирована',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleInsertRowAbove = async (rowId: string) => {
    try {
      await handleAddRow({});
      toast({
        title: 'Новая строка добавлена выше',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleInsertRowBelow = async (rowId: string) => {
    try {
      await handleAddRow({});
      toast({
        title: 'Новая строка добавлена ниже',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  const handleRowView = (rowId: string) => {
    const row = tableData.find((r: any) => r.id === rowId);
    if (row) {
      // TODO: Open row detail view/modal
      console.log('View row:', row);
      toast({
        title: 'Просмотр записи',
        description: 'Функция просмотра в разработке',
      });
    }
  };

  const handleRowHistory = (rowId: string) => {
    // TODO: Open row history panel
    console.log('Show history for row:', rowId);
    toast({
      title: 'История изменений',
      description: 'Функция истории в разработке',
    });
  };

  // Bulk operations
  const handleBulkDelete = async (rowIds: string[]) => {
    try {
      for (const rowId of rowIds) {
        await supabase.rpc('delete_table_row', { p_id: rowId });
      }
      refresh();
    } catch (error: any) {
      throw new Error('Не удалось удалить записи');
    }
  };

  const handleBulkDuplicate = async (rowIds: string[]) => {
    try {
      for (const rowId of rowIds) {
        const row = tableData.find((r: any) => r.id === rowId);
        if (row) {
          await handleAddRow(row.data);
        }
      }
      refresh();
    } catch (error: any) {
      throw new Error('Не удалось дублировать записи');
    }
  };

  const handleBulkEdit = async (rowIds: string[], column: string, value: any) => {
    try {
      for (const rowId of rowIds) {
        const row = tableData.find((r: any) => r.id === rowId);
        if (row) {
          const updatedData = {
            ...row.data,
            [column]: value,
          };
          await handleUpdateRow(rowId, updatedData);
        }
      }
      refresh();
    } catch (error: any) {
      throw new Error('Не удалось обновить записи');
    }
  };

  // Helper function for Kanban columns
  const getKanbanColumns = (rows: any[]) => {
    // Find status column
    const statusColumn = schemas.find(col =>
      col.column_type === 'status' ||
      col.column_name.toLowerCase().includes('status')
    );

    if (!statusColumn) {
      // If no status column, create default columns
      return [
        {
          id: 'todo',
          title: 'To Do',
          cards: rows.slice(0, Math.ceil(rows.length / 3)).map(r => ({
            id: r.id,
            title: r.name || r.title || 'Без названия',
            description: r.description,
          })),
        },
        {
          id: 'in-progress',
          title: 'In Progress',
          cards: rows.slice(Math.ceil(rows.length / 3), Math.ceil(rows.length * 2 / 3)).map(r => ({
            id: r.id,
            title: r.name || r.title || 'Без названия',
            description: r.description,
          })),
        },
        {
          id: 'done',
          title: 'Done',
          cards: rows.slice(Math.ceil(rows.length * 2 / 3)).map(r => ({
            id: r.id,
            title: r.name || r.title || 'Без названия',
            description: r.description,
          })),
        },
      ];
    }

    // Get unique statuses
    const statuses = [...new Set(rows.map(r => r[statusColumn.column_name]))].filter(Boolean);

    return statuses.map(status => ({
      id: status,
      title: status,
      cards: rows
        .filter(r => r[statusColumn.column_name] === status)
        .map(r => ({
          id: r.id,
          title: r.name || r.title || 'Без названия',
          description: r.description,
          status: r[statusColumn.column_name],
        })),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Show skeleton during data loading
  const renderViewSkeleton = () => {
    switch (viewType) {
      case 'kanban':
        return <KanbanSkeleton />;
      case 'gallery':
        return <CardSkeleton count={6} />;
      case 'calendar':
        return <CardSkeleton count={9} />;
      default:
        return <TableSkeleton rows={pageSize} columns={schemas.length || 5} />;
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Main content landmark for skip navigation */}
        <main id="main-content">
        {/* Header */}
        <header className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="mb-4"
            aria-label="Назад к проекту"
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Назад к проекту
          </Button>

          <Breadcrumbs
            items={[
              { label: 'Проекты', href: '/' },
              { label: database?.name || 'Загрузка...', href: `/projects/${projectId}` },
              { label: 'Таблица' },
            ]}
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                style={{ backgroundColor: database?.color }}
              >
                {database?.icon}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{database?.name}</h1>
                {database?.description && (
                  <p className="text-muted-foreground">{database.description}</p>
                )}
              </div>
            </div>

            {/* Desktop ActionBar */}
            <ActionBar
              className="hidden md:flex"
              databaseName={database?.name}
              tableData={tableData}
              commentsCount={comments.length}
              onUploadFile={() => setIsUploadDialogOpen(true)}
              onAddRecord={() => handleAddRow({})}
              onAIAssistant={() => setShowAIChat(true)}
              onInsights={() => setShowInsights(true)}
              onImportHistory={() => navigate(`/projects/${projectId}/database/${databaseId}/import-history`)}
              onComments={() => setShowCollabPanel(true)}
              onClearData={() => setShowClearDialog(true)}
              onDeleteDatabase={() => setShowDeleteDialog(true)}
            />

            {/* Mobile ActionBar */}
            <MobileActionBar
              className="md:hidden"
              databaseName={database?.name}
              commentsCount={comments.length}
              onUploadFile={() => setIsUploadDialogOpen(true)}
              onAddRecord={() => handleAddRow({})}
              onAIAssistant={() => setShowAIChat(true)}
              onInsights={() => setShowInsights(true)}
              onImportHistory={() => navigate(`/projects/${projectId}/database/${databaseId}/import-history`)}
              onComments={() => setShowCollabPanel(true)}
              onExport={() => {/* TODO: trigger export */}}
              onClearData={() => setShowClearDialog(true)}
              onDeleteDatabase={() => setShowDeleteDialog(true)}
            />
          </div>
        </header>

        {/* Column Manager */}
        {databaseId && (
          <ColumnManager
            databaseId={databaseId}
            onSchemasChange={loadSchemas}
          />
        )}

        {/* Search & Filters */}
        <section className="mt-6 space-y-4" aria-label="Поиск и фильтрация данных">
          {/* Global Search */}
          <TableSearch
            columns={schemas.map(s => s.column_name)}
            onSearch={(query, cols) => {
              setSearchQuery(query);
              setSearchColumns(cols);
              setPage(1); // Reset pagination on search
            }}
          />

          {/* Filters & Sorting */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Undo/Redo Toolbar */}
              <UndoRedoToolbar databaseId={databaseId} />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                Filters
                {filters.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.length}
                  </Badge>
                )}
              </Button>

              <SortControls
                columns={schemas.map(s => ({ name: s.column_name, type: s.column_type }))}
                sort={sort}
                onChange={(newSort) => {
                  setSort(newSort);
                  updateSort(newSort);
                }}
              />
            </div>

            <PaginationControls
              currentPage={page - 1}
              totalPages={totalPages}
              pageSize={pageSize}
              totalRecords={totalCount}
              onPageChange={(p) => setPage(p + 1)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                updatePageSize(newSize);
                setPage(1);
              }}
            />
          </div>

          <Collapsible open={showFilters}>
            <CollapsibleContent>
              <div className="border rounded-lg p-4">
                <FilterBuilder
                  columns={schemas.map(s => ({ name: s.column_name, type: s.column_type }))}
                  filters={filters}
                  onChange={(newFilters) => {
                    setFilters(newFilters);
                    setPage(1); // Reset to first page when filters change
                  }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>

        {/* View Type Selector */}
        <Tabs value={viewType} onValueChange={(v: any) => setViewType(v)} className="mb-4">
          <TabsList role="tablist" aria-label="Выбор типа отображения данных">
            <TabsTrigger value="table">
              <Table className="h-4 w-4 mr-2" aria-hidden="true" />
              Таблица
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
              Календарь
            </TabsTrigger>
            <TabsTrigger value="kanban">
              <Columns className="h-4 w-4 mr-2" aria-hidden="true" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="gallery">
              <Image className="h-4 w-4 mr-2" aria-hidden="true" />
              Галерея
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Conditional View Rendering */}
        <section className="mt-6" aria-label="Отображение данных">
          {dataLoading ? renderViewSkeleton() :
           !dataLoading && tableData.length === 0 ? (
            <EmptyState
              icon={Upload}
              title="Нет данных"
              description="Загрузите файл или добавьте запись вручную для начала работы"
              action={{
                label: 'Загрузить файл',
                onClick: () => setIsUploadDialogOpen(true),
              }}
            />
          ) : viewType === 'table' && (
            <DataTable
            data={tableData.map((row: any) => ({
              id: row.id,
              ...row.data,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }))}
            headers={schemas.map(s => s.column_name)}
            isGrouped={false}
            databaseId={databaseId}
            onCellUpdate={async (rowId, column, value) => {
              // Find the row
              const row = tableData.find((r: any) => r.id === rowId);
              if (!row) return;

              // Update the row data
              const updatedData = {
                ...row.data,
                [column]: value,
              };

              await handleUpdateRow(rowId, updatedData);
            }}
            columnTypes={schemas.reduce((acc, s) => {
              acc[s.column_name] = s.column_type;
              return acc;
            }, {} as Record<string, string>)}
            onRowView={handleRowView}
            onRowEdit={(rowId) => {
              // TODO: Open edit modal
              const row = tableData.find((r: any) => r.id === rowId);
              if (row) {
                toast({
                  title: 'Редактирование записи',
                  description: 'Дважды кликните на ячейку для редактирования',
                });
              }
            }}
            onRowDuplicate={handleDuplicateRow}
            onRowDelete={handleDeleteRow}
            onRowHistory={handleRowHistory}
            onInsertRowAbove={handleInsertRowAbove}
            onInsertRowBelow={handleInsertRowBelow}
            onBulkDelete={handleBulkDelete}
            onBulkDuplicate={handleBulkDuplicate}
            onBulkEdit={handleBulkEdit}
          />
          )}

          {viewType === 'calendar' && (
            <CalendarView
              data={tableData.map((row: any) => ({
                id: row.id,
                ...row.data,
                created_at: row.created_at,
              }))}
              dateColumn={
                schemas.find(col =>
                  col.column_type === 'date' ||
                  col.column_name.toLowerCase().includes('date') ||
                  col.column_name.toLowerCase().includes('created')
                )?.column_name || 'created_at'
              }
              titleColumn={
                schemas.find(col =>
                  col.column_name.toLowerCase().includes('title') ||
                  col.column_name.toLowerCase().includes('name')
                )?.column_name
              }
              statusColumn={
                schemas.find(col =>
                  col.column_type === 'status' ||
                  col.column_name.toLowerCase().includes('status')
                )?.column_name
              }
              onEventClick={(event) => {
                console.log('Event clicked:', event);
              }}
              onAddEvent={(date) => {
                console.log('Add event on:', date);
              }}
            />
          )}

          {viewType === 'kanban' && (
            <KanbanView
              columns={getKanbanColumns(tableData.map((row: any) => ({
                id: row.id,
                ...row.data,
              })))}
              onCardMove={async (cardId, fromColumnId, toColumnId) => {
                console.log('Card moved:', cardId, 'from', fromColumnId, 'to', toColumnId);

                // Find the status column
                const statusColumn = schemas.find(col =>
                  col.column_type === 'status' ||
                  col.column_name.toLowerCase().includes('status')
                );

                if (statusColumn) {
                  // Find the row
                  const row = tableData.find((r: any) => r.id === cardId);
                  if (row) {
                    const previousStatus = row.data[statusColumn.column_name];

                    // Update the status
                    const updatedData = {
                      ...row.data,
                      [statusColumn.column_name]: toColumnId,
                    };

                    try {
                      await handleUpdateRow(cardId, updatedData);

                      // Show toast with undo button
                      toast({
                        title: 'Статус изменён',
                        description: `"${row.data.name || row.data.title || 'Карточка'}" перемещена в "${toColumnId}"`,
                        action: (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              // Undo: restore previous status
                              const revertData = {
                                ...row.data,
                                [statusColumn.column_name]: previousStatus,
                              };
                              await handleUpdateRow(cardId, revertData);
                              toast({
                                title: 'Отменено',
                                description: 'Статус восстановлен',
                              });
                            }}
                          >
                            Отменить
                          </Button>
                        ),
                      });
                    } catch (error) {
                      console.error('Failed to move card:', error);
                      toast({
                        title: 'Ошибка',
                        description: 'Не удалось переместить карточку',
                        variant: 'destructive',
                      });
                    }
                  }
                }
              }}
              onCardClick={(card) => {
                console.log('Card clicked:', card);
              }}
            />
          )}

          {viewType === 'gallery' && (
            <GalleryView
              items={tableData.map((row: any) => ({
                id: row.id,
                title: row.data?.name || row.data?.title || 'Без названия',
                description: row.data?.description || '',
                imageUrl: row.data?.image || row.data?.photo || row.data?.avatar,
                metadata: {
                  created_at: row.created_at,
                  ...row.data,
                },
              }))}
              onItemClick={(item) => {
                console.log('Item clicked:', item);
              }}
            />
          )}
        </section>

        {/* Clear Data Dialog */}
        <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Очистить все данные?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие удалит все записи из базы данных. Схема колонок сохранится.
                Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearData}>
                Очистить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Database Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить базу данных?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие удалит базу данных "{database?.name}" со всеми данными и схемами.
                Это действие нельзя отменить.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteDatabase} className="bg-destructive">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upload File Dialog */}
        {databaseId && (
          <UploadFileDialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
            onSuccess={async (successData) => {
              console.log('UploadFileDialog onSuccess called - refreshing data...');
              setIsUploadDialogOpen(false);

              // Small delay to ensure DB transaction is committed
              await new Promise(resolve => setTimeout(resolve, 500));

              console.log('Calling refresh() and loadSchemas()...');
              refresh();
              loadSchemas();

              // Show success screen if data import was successful
              if (successData) {
                setImportSuccessData(successData);
                setShowSuccessScreen(true);
              }

              console.log('Refresh triggered successfully');
            }}
            databaseId={databaseId}
          />
        )}

        {/* Import Success Screen */}
        {showSuccessScreen && importSuccessData && database && (
          <Dialog open={showSuccessScreen} onOpenChange={setShowSuccessScreen}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <ImportSuccessScreen
                databaseName={database.name}
                fileName={importSuccessData.fileName}
                recordsImported={importSuccessData.recordsImported}
                columnsDetected={importSuccessData.columnsDetected}
                duration={importSuccessData.duration}
                importedAt={importSuccessData.importedAt}
                onViewData={() => {
                  setShowSuccessScreen(false);
                  setImportSuccessData(null);
                }}
                onImportMore={() => {
                  setShowSuccessScreen(false);
                  setImportSuccessData(null);
                  setIsUploadDialogOpen(true);
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* AI Assistant Panel (Old) */}
        {projectId && (
          <ConversationAIPanel
            open={showAIAssistant}
            onOpenChange={setShowAIAssistant}
            projectId={projectId}
          />
        )}

        {/* AI Chat Panel (New with SSE Streaming) */}
        {projectId && databaseId && (
          <AIChatPanel
            open={showAIChat}
            onOpenChange={setShowAIChat}
            databaseId={databaseId}
            projectId={projectId}
          />
        )}

        {/* Insights Panel */}
        {databaseId && (
          <InsightsPanel
            open={showInsights}
            onOpenChange={setShowInsights}
            databaseId={databaseId}
          />
        )}

        {/* Collaboration Panel */}
        <Sheet open={showCollabPanel} onOpenChange={setShowCollabPanel}>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Активность и комментарии</SheetTitle>
              <SheetDescription>
                История изменений и обсуждения по базе данных
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <Tabs defaultValue="activity">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="activity">
                    <History className="h-4 w-4 mr-2" />
                    Активность
                  </TabsTrigger>
                  <TabsTrigger value="comments">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Комментарии
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="activity" className="mt-4">
                  <ActivityFeed activities={[]} limit={20} />
                </TabsContent>
                <TabsContent value="comments" className="mt-4">
                  {user && databaseId ? (
                    <CommentsPanel
                      comments={comments}
                      currentUser={user}
                      rowId=""
                      databaseId={databaseId}
                      onAddComment={addComment}
                      onUpdateComment={updateComment}
                      onDeleteComment={deleteComment}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Загрузка комментариев...
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
        </main>
      </div>
    </div>
  );
}
