import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Download, Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/DataTable';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ColumnManager } from '@/components/database/ColumnManager';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Database, TableSchema } from '@/types/database';

export default function DatabaseView() {
  const { databaseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [database, setDatabase] = useState<Database | null>(null);
  const [schemas, setSchemas] = useState<TableSchema[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    loadDatabase();
    loadSchemas();
    loadData();
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

  const loadData = async () => {
    if (!databaseId) return;

    try {
      const { data, error } = await supabase.rpc('get_table_data', {
        p_database_id: databaseId,
        p_limit: 1000,
        p_offset: 0,
      });

      if (error) throw error;
      
      // Преобразуем данные из JSONB в массив объектов
      const normalizedData = (data || []).map((row: any) => ({
        id: row.id,
        ...row.data,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));
      
      setTableData(normalizedData);
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

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

      loadData();
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

      navigate('/dashboard');
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

      loadData();
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

      loadData();
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

      loadData();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к базам данных
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

        {/* Data Table */}
        <div className="mt-6">
          <DataTable 
            data={tableData} 
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
      </div>
    </div>
  );
}
