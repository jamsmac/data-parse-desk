import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Trash2, Plus, Filter as FilterIcon, Sparkles, MessageSquare, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ColumnManager } from '@/components/database/ColumnManager';
import { UploadFileDialog } from '@/components/import/UploadFileDialog';
import { ExportButton } from '@/components/database/ExportButton';
import { PaginationControls } from '@/components/database/PaginationControls';
import { FilterBuilder, type Filter } from '@/components/database/FilterBuilder';
import { SortControls, type SortConfig } from '@/components/database/SortControls';
import { useTableData } from '@/hooks/useTableData';
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';
import { CommentsPanel } from '@/components/collaboration/CommentsPanel';
import { ActivityFeed } from '@/components/collaboration/ActivityFeed';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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
  const [showFilters, setShowFilters] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showCollabPanel, setShowCollabPanel] = useState(false);

  // Pagination, Filters & Sorting state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sort, setSort] = useState<SortConfig>({ column: null, direction: 'asc' });

  // Use new hook for data fetching with filters & sorting
  const { data: tableData, totalCount, loading: dataLoading, refresh } = useTableData({
    databaseId: databaseId || '',
    page,
    pageSize,
    filters,
    sort,
  });

  useEffect(() => {
    loadDatabase();
    loadSchemas();
  }, [databaseId, user]);

  const loadDatabase = async () => {
    if (!databaseId || !user) return;

    try {
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
      const { error } = await supabase.rpc('update_table_row', {
        p_id: rowId,
        p_data: updates,
      });

      if (error) throw error;

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

  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к проекту
          </Button>

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

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIAssistant(true)}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                AI Помощник
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCollabPanel(true)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Активность
              </Button>
              <ExportButton
                data={tableData}
                fileName={database?.name || 'export'}
              />
              <Button variant="outline" size="sm" onClick={() => setIsUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Загрузить файл
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAddRow({})}>
                <Plus className="mr-2 h-4 w-4" />
                Добавить запись
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowClearDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Очистить данные
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить БД
              </Button>
            </div>
          </div>
        </div>

        {/* Column Manager */}
        {databaseId && (
          <ColumnManager
            databaseId={databaseId}
            onSchemasChange={loadSchemas}
          />
        )}

        {/* Filters & Sorting */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                Filters {filters.length > 0 && `(${filters.length})`}
              </Button>
              
              <SortControls
                columns={schemas.map(s => ({ name: s.column_name, type: s.column_type }))}
                sort={sort}
                onChange={setSort}
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
                  onChange={setFilters}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Data Table */}
        <div className="mt-6">
          <DataTable 
            data={tableData.map((row: any) => ({
              id: row.id,
              ...row.data,
              created_at: row.created_at,
              updated_at: row.updated_at,
            }))} 
            headers={schemas.map(s => s.column_name)}
            isGrouped={false}
          />
        </div>

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
            onSuccess={() => {
              setIsUploadDialogOpen(false);
              refresh();
              loadSchemas();
            }}
            databaseId={databaseId}
          />
        )}

        {/* AI Assistant Panel */}
        <AIAssistantPanel
          open={showAIAssistant}
          onOpenChange={setShowAIAssistant}
          databaseId={databaseId}
        />

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
                  <p className="text-sm text-muted-foreground">
                    Выберите запись для просмотра комментариев
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
