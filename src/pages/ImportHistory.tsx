import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Search, FileText, CheckCircle2, XCircle, Clock, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ImportDetailsDialog } from '@/components/import/ImportDetailsDialog';

export default function ImportHistory() {
  const { projectId, databaseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImport, setSelectedImport] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const { data: imports, isLoading } = useQuery({
    queryKey: ['import-history', databaseId],
    queryFn: async () => {
      if (!databaseId) return [];
      
      const { data, error } = await supabase
        .from('database_files')
        .select('*')
        .eq('database_id', databaseId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!databaseId,
  });

  const filteredImports = imports?.filter(imp =>
    imp.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      pending: 'outline',
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const totalStats = imports ? {
    total: imports.length,
    completed: imports.filter(i => {
      const metadata = i.metadata as any;
      return metadata?.status === 'completed';
    }).length,
    failed: imports.filter(i => {
      const metadata = i.metadata as any;
      return metadata?.status === 'failed';
    }).length,
    totalRows: imports.reduce((sum, i) => sum + (i.rows_imported || 0), 0),
  } : null;

  const handleViewDetails = (importData: any) => {
    setSelectedImport(importData);
    setShowDetailsDialog(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(`/projects/${projectId}/database/${databaseId}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к базе данных
          </Button>

          <h1 className="text-3xl font-bold mb-2">История импортов</h1>
          <p className="text-muted-foreground">
            Просмотр всех импортированных файлов и их статусов
          </p>
        </div>

        {/* Статистика */}
        {totalStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Всего импортов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Успешных
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{totalStats.completed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  С ошибками
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{totalStats.failed}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Всего строк
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.totalRows.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Поиск */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени файла..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Таблица импортов */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Загрузка...</p>
              </div>
            ) : filteredImports && filteredImports.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Статус</TableHead>
                    <TableHead>Файл</TableHead>
                    <TableHead>Размер</TableHead>
                    <TableHead>Строк импортировано</TableHead>
                    <TableHead>Пропущено</TableHead>
                    <TableHead>Дубликатов</TableHead>
                    <TableHead>Режим</TableHead>
                    <TableHead>Дата загрузки</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredImports.map((imp) => (
                    <TableRow key={imp.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon((imp.metadata as any)?.status || 'pending')}
                          {getStatusBadge((imp.metadata as any)?.status || 'pending')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{imp.filename}</span>
                        </div>
                        {imp.file_type && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {imp.file_type.toUpperCase()}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatFileSize(imp.file_size || 0)}</TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {(imp.rows_imported || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {imp.rows_skipped ? (
                          <span className="text-yellow-600">{imp.rows_skipped}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {imp.duplicates_found ? (
                          <span className="text-blue-600">{imp.duplicates_found}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {imp.import_mode === 'data' ? 'Данные' : 'Структура'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {imp.uploaded_at && format(new Date(imp.uploaded_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(imp)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Детали
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  {searchQuery ? 'Ничего не найдено' : 'История импортов пуста'}
                </p>
                {!searchQuery && (
                  <p className="text-sm text-muted-foreground">
                    Загрузите файлы для начала работы
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Dialog */}
        <ImportDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          importData={selectedImport}
        />
      </main>
    </div>
  );
}
