import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Clock, AlertTriangle, FileText, Calendar, Database } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ImportDetails {
  id: string;
  filename: string;
  file_size: number;
  file_type: string;
  import_mode: string;
  rows_imported: number;
  rows_skipped: number;
  duplicates_found: number;
  uploaded_at: string;
  metadata: {
    status: string;
    error_message?: string;
    warnings?: string[];
    column_mapping?: Record<string, string>;
    import_settings?: any;
  };
}

interface ImportDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importData: ImportDetails | null;
}

export function ImportDetailsDialog({ open, onOpenChange, importData }: ImportDetailsDialogProps) {
  if (!importData) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'processing':
        return <Clock className="h-6 w-6 text-blue-500" />;
      default:
        return <Clock className="h-6 w-6 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const metadata = importData.metadata || {};
  const status = metadata.status || 'pending';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getStatusIcon(status)}
            <span>Детали импорта</span>
          </DialogTitle>
          <DialogDescription>
            Подробная информация об импорте файла {importData.filename}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[600px] pr-4">
          <div className="space-y-6">
            {/* Основная информация */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Основная информация
              </h3>
              <div className="grid grid-cols-2 gap-4 bg-muted/50 rounded-lg p-4">
                <div>
                  <p className="text-sm text-muted-foreground">Имя файла</p>
                  <p className="font-medium">{importData.filename}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Размер</p>
                  <p className="font-medium">{formatFileSize(importData.file_size || 0)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Тип</p>
                  <Badge variant="outline">{importData.file_type?.toUpperCase()}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Режим импорта</p>
                  <Badge variant="secondary">
                    {importData.import_mode === 'data' ? 'Данные' : 'Структура'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Дата загрузки</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(importData.uploaded_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Статус</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={status === 'completed' ? 'default' : status === 'failed' ? 'destructive' : 'secondary'}>
                      {status === 'completed' ? 'Завершён' : status === 'failed' ? 'Ошибка' : status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Статистика импорта */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Database className="h-4 w-4" />
                Статистика импорта
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-muted-foreground mb-1">Импортировано</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {(importData.rows_imported || 0).toLocaleString()}
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-muted-foreground mb-1">Пропущено</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {importData.rows_skipped || 0}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-muted-foreground mb-1">Дубликатов</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importData.duplicates_found || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Соответствие колонок */}
            {metadata.column_mapping && Object.keys(metadata.column_mapping).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Соответствие колонок</h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    {Object.entries(metadata.column_mapping).map(([source, target]) => (
                      <div key={source} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{source}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{target as string}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Предупреждения */}
            {metadata.warnings && metadata.warnings.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    Предупреждения
                  </h3>
                  <div className="space-y-2">
                    {metadata.warnings.map((warning, index) => (
                      <div key={index} className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">{warning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Ошибка */}
            {metadata.error_message && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    Ошибка
                  </h3>
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                      {metadata.error_message}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Настройки импорта */}
            {metadata.import_settings && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">Настройки импорта</h3>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <pre className="text-xs font-mono overflow-auto">
                      {JSON.stringify(metadata.import_settings, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
