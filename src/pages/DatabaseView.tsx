import { useState } from 'react';
import { ArrowLeft, Upload, Trash2, Plus, Filter as FilterIcon, Sparkles, MessageSquare, History, FileText, Lightbulb, Table, Calendar, Columns, Image } from 'lucide-react';
import { CalendarView } from '@/components/views/CalendarView';
import { KanbanView } from '@/components/views/KanbanView';
import { GalleryView } from '@/components/views/GalleryView';
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
import { UploadFileDialog } from '@/components/import/UploadFileDialog';
import { ImportSuccessScreen } from '@/components/import/ImportSuccessScreen';
import { ExportButton } from '@/components/database/ExportButton';
import { PaginationControls } from '@/components/database/PaginationControls';
import { FilterBuilder } from '@/components/database/FilterBuilder';
import { SortControls } from '@/components/database/SortControls';
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
import { DatabaseProvider, useDatabaseContext, type ViewType } from '@/contexts/DatabaseContext';
import { useNavigate } from 'react-router-dom';

function DatabaseViewContent() {
  const navigate = useNavigate();
  const ctx = useDatabaseContext();

  // Destructure all values from context
  const {
    projectId,
    databaseId,
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
  } = ctx;

  // Local state for AI assistant (old version, might be removed)
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Helper function for Kanban columns
  const getKanbanColumns = (rows: Array<{ id: string; [key: string]: unknown }>) => {
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
            title: String(r.name || r.title || 'Без названия'),
            description: r.description ? String(r.description) : undefined,
          })),
        },
        {
          id: 'in-progress',
          title: 'In Progress',
          cards: rows.slice(Math.ceil(rows.length / 3), Math.ceil(rows.length * 2 / 3)).map(r => ({
            id: r.id,
            title: String(r.name || r.title || 'Без названия'),
            description: r.description ? String(r.description) : undefined,
          })),
        },
        {
          id: 'done',
          title: 'Done',
          cards: rows.slice(Math.ceil(rows.length * 2 / 3)).map(r => ({
            id: r.id,
            title: String(r.name || r.title || 'Без названия'),
            description: r.description ? String(r.description) : undefined,
          })),
        },
      ];
    }

    // Get unique statuses
    const statuses = [...new Set(rows.map(r => r[statusColumn.column_name]))].filter(Boolean);

    return statuses.map(status => ({
      id: String(status),
      title: String(status),
      cards: rows
        .filter(r => r[statusColumn.column_name] === status)
        .map(r => ({
          id: r.id,
          title: String(r.name || r.title || 'Без названия'),
          description: r.description ? String(r.description) : undefined,
          status: r[statusColumn.column_name] ? String(r[statusColumn.column_name]) : undefined,
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
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)} className="mb-4">
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
            <DataTable />
          )}

          {viewType === 'calendar' && (
            <CalendarView
              data={tableData.map(row => ({
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
              columns={getKanbanColumns(tableData.map(row => ({
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
                  const row = tableData.find(r => r.id === cardId);
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
              items={tableData.map(row => ({
                id: row.id,
                title: String(row.data?.name || row.data?.title || 'Без названия'),
                description: row.data?.description ? String(row.data.description) : '',
                imageUrl: row.data?.image ? String(row.data.image) : (row.data?.photo ? String(row.data.photo) : (row.data?.avatar ? String(row.data.avatar) : undefined)),
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

              console.log('Calling refreshData() and loadSchemas()...');
              refreshData();
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

// Wrapper component that provides context
export default function DatabaseView() {
  return (
    <DatabaseProvider>
      <DatabaseViewContent />
    </DatabaseProvider>
  );
}
