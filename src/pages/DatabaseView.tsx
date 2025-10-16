import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Upload, Download, Settings, Trash2,
  Table as TableIcon, Filter, SortAsc, MoreVertical, Columns, Link, Calculator,
  FileDown, FileSpreadsheet, MessageSquare
} from 'lucide-react';
import { useDatabase, useTableSchema } from '../hooks/useDatabases';
import { useTableData, useInsertRow, useUpdateRow, useDeleteRow } from '../hooks/useTableData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import type { User } from '@/types/auth';
import ColumnManager from '../components/database/ColumnManager';
import CellEditor from '../components/database/CellEditor';
import FilterBar from '../components/database/FilterBar';
import RelationManager from '../components/relations/RelationManager';
import { FileImportDialog } from '../components/import/FileImportDialog';

import { exportToCSV, exportToExcel } from '../utils/exportData';
import type { TableFilters, TableSorting, TablePagination } from '../types/database';

/**
 * Страница просмотра и редактирования базы данных
 */
export default function DatabaseView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [userId, setUserId] = useState<string | null>(null);
  const { data: database, isLoading: isDatabaseLoading } = useDatabase(id!);
  
  const [filters, setFilters] = useState<TableFilters>({});
  const [sorting, setSorting] = useState<TableSorting>({ column: 'created_at', direction: 'desc' });
  const [pagination, setPagination] = useState<TablePagination>({ page: 1, pageSize: 50 });
  
  // Dialog states
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showRelationManager, setShowRelationManager] = useState(false);
  const [showFileImport, setShowFileImport] = useState(false);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  const [currentFormula, setCurrentFormula] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showCommentsSheet, setShowCommentsSheet] = useState(false);

  const { 
    data: tableData, 
    isLoading: isDataLoading,
    error: dataError 
  } = useTableData(id!, filters, sorting, pagination);
  
  const { data: tableSchema, isLoading: isSchemaLoading } = useTableSchema(id!);

  const insertRow = useInsertRow(id!);
  const updateRow = useUpdateRow(id!);
  const deleteRow = useDeleteRow(id!);


  // Получение текущего пользователя
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted) {
        if (user) {
          setUserId(user.id);
          // Создаем объект User для CommentsPanel
          setCurrentUser({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.avatar_url,
            role: 'editor',
            created_at: user.created_at,
            updated_at: user.created_at,
          });
        } else {
          setUserId('00000000-0000-0000-0000-000000000000');
        }
      }
    };

    getUser();

    return () => {
      isMounted = false;
    };
  }, []);

  // Loading state
  if (!userId || isDatabaseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <TableIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Загрузка базы данных...</p>
        </div>
      </div>
    );
  }

  // Database not found
  if (!database) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>База данных не найдена</CardTitle>
            <CardDescription>Возможно, она была удалена или у вас нет доступа</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к списку
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAddRow = async () => {
    try {
      await insertRow.mutateAsync({ data: {} });
      toast.success('Строка добавлена');
    } catch (error) {
      toast.error('Ошибка добавления строки');
      console.error(error);
    }
  };

  const handleDeleteRow = async (rowId: string) => {
    try {
      await deleteRow.mutateAsync(rowId);
      toast.success('Строка удалена');
    } catch (error) {
      toast.error('Ошибка удаления строки');
      console.error(error);
    }
  };

  const handleSort = (column: string) => {
    setSorting(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  // Экспорт данных
  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      const exportData = tableData?.data || [];
      const visibleColumns = columns.map(col => col.column_name);
      const fileName = `${database.name}_export_${new Date().toISOString().split('T')[0]}`;

      if (format === 'csv') {
        // Преобразуем данные в нужный формат
        const formattedData = exportData.map(row => ({
          ...row,
          _rawData: row,
          _fileName: fileName
        }));
        exportToCSV(formattedData, visibleColumns, `${fileName}.csv`);
        toast.success('Данные экспортированы в CSV');
      } else {
        const formattedData = exportData.map(row => ({
          ...row,
          _rawData: row,
          _fileName: fileName
        }));
        await exportToExcel(formattedData, visibleColumns, `${fileName}.xlsx`);
        toast.success('Данные экспортированы в Excel');
      }
    } catch (error) {
      toast.error('Ошибка экспорта данных');
      console.error(error);
    }
  };

  const totalPages = tableData?.total 
    ? Math.ceil(tableData.total / pagination.pageSize)
    : 1;

  // Используем схему таблицы для получения колонок
  const columns = tableSchema || [];
  
  const handleCellEdit = async (rowId: string, column: string, value: unknown) => {
    try {
      await updateRow.mutateAsync({ 
        rowId, 
        updates: { [column]: value } 
      });
      setEditingCell(null);
      toast.success('Значение обновлено');
    } catch (error) {
      toast.error('Ошибка обновления');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>
              
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                  style={{ backgroundColor: database.color + '20' }}
                >
                  {database.icon}
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{database.name}</h1>
                  {database.description && (
                    <p className="text-sm text-muted-foreground">{database.description}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowColumnManager(true)}
              >
                <Columns className="h-4 w-4" />
                Колонки
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowRelationManager(true)}
              >
                <Link className="h-4 w-4" />
                Связи
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => setShowFileImport(true)}
              >
                <Upload className="h-4 w-4" />
                Импорт
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Экспорт
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Экспорт в CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('excel')}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Экспорт в Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Настройки
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить базу данных
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="space-y-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {tableData?.total || 0} записей
              </Badge>
            </div>

            <Button onClick={handleAddRow} disabled={insertRow.isPending} className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить запись
            </Button>
          </div>
          
          {/* Filter Bar */}
          <FilterBar
            columns={columns}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>

        {/* Tabs: Data & Activity */}
        <Tabs defaultValue="data" className="space-y-4">
          <TabsList>
            <TabsTrigger value="data" className="gap-2">
              <TableIcon className="h-4 w-4" />
              Данные
            </TabsTrigger>
          </TabsList>

          <TabsContent value="data">
            <Card>
          <CardContent className="p-0">
            {isDataLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : dataError ? (
              <div className="p-8 text-center">
                <p className="text-destructive mb-2">Ошибка загрузки данных</p>
                <p className="text-sm text-muted-foreground">{dataError.message}</p>
              </div>
            ) : !tableData?.data || tableData.data.length === 0 ? (
              <div className="p-16 text-center">
                <TableIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Нет данных</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Добавьте первую запись для начала работы
                </p>
                <Button onClick={handleAddRow} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Добавить запись
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      {columns.map((col) => (
                        <TableHead 
                          key={col.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort(col.column_name)}
                        >
                          <div className="flex items-center gap-2">
                            {col.column_name}
                            <Badge variant="outline" className="text-xs">
                              {col.column_type}
                            </Badge>
                            {sorting.column === col.column_name && (
                              <SortAsc 
                                className={`h-4 w-4 ${sorting.direction === 'desc' ? 'rotate-180' : ''}`} 
                              />
                            )}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="w-[80px]">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.data.map((row, index) => {
                      const rowId = row.id ? String(row.id) : String(index);
                      return (
                        <TableRow key={rowId}>
                          <TableCell className="font-medium">
                            {(pagination.page - 1) * pagination.pageSize + index + 1}
                          </TableCell>
                          {columns.map((col) => (
                            <TableCell 
                              key={col.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => row.id && setEditingCell({ rowId: String(row.id), column: col.column_name })}
                            >
                              {editingCell?.rowId === String(row.id) && editingCell?.column === col.column_name ? (
                                <CellEditor
                                  column={col}
                                  value={row[col.column_name] as string | number | boolean | null | undefined}
                                  onSave={(value) => handleCellEdit(String(row.id), col.column_name, value)}
                                  onCancel={() => setEditingCell(null)}
                                />
                              ) : (
                                <>
                                  {row[col.column_name] !== null && row[col.column_name] !== undefined 
                                    ? String(row[col.column_name]) 
                                    : '-'}
                                </>
                              )}
                            </TableCell>
                          ))}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (row.id) {
                                      setSelectedRowId(String(row.id));
                                      setShowCommentsSheet(true);
                                    }
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  Комментарии
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => row.id && handleDeleteRow(String(row.id))}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Удалить
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
            </Card>

            {/* Pagination */}
        {tableData?.data && tableData.data.length > 0 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Страница {pagination.page} из {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Предыдущая
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= totalPages}
              >
                Следующая
              </Button>
            </div>
          </div>
        )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Dialogs */}
      <ColumnManager
        open={showColumnManager}
        onOpenChange={setShowColumnManager}
        databaseId={id!}
        columns={columns}
      />
      
      <RelationManager
        open={showRelationManager}
        onOpenChange={setShowRelationManager}
        databaseId={id!}
      />
      
      <FileImportDialog
        open={showFileImport}
        onOpenChange={setShowFileImport}
        databaseId={id!}
        existingColumns={columns}
        onImportComplete={() => {
          setShowFileImport(false);
          toast.success('Данные импортированы');
        }}
      />
      

      {/* Comments Sheet */}
      <Sheet open={showCommentsSheet} onOpenChange={setShowCommentsSheet}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Комментарии к записи
            </SheetTitle>
            <SheetDescription>
              Обсудите данные и оставьте заметки для команды
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 p-4">
            <p className="text-sm text-muted-foreground">
              Функция комментариев временно недоступна
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
