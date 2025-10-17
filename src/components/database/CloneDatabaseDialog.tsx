/**
 * Диалог клонирования базы данных
 * Позволяет скопировать БД с опциями копирования данных и связей
 * Поддерживает квоты, версионирование и асинхронное клонирование
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { GlassCard } from '@/components/aurora/layouts/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Copy,
  Database,
  FileStack,
  Link,
  Loader2,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Shield
} from 'lucide-react';
import { Database as DatabaseType } from '@/types/database';
import { DatabaseAPI } from '@/api/databaseAPI';

interface CloneDatabaseDialogProps {
  database: DatabaseType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newDatabase: DatabaseType) => void;
}

export function CloneDatabaseDialog({
  database,
  isOpen,
  onClose,
  onSuccess
}: CloneDatabaseDialogProps) {
  const [newName, setNewName] = useState(`${database.display_name} (Копия)`);
  const [includeData, setIncludeData] = useState(false);
  const [includeRelations, setIncludeRelations] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [forceAsync, setForceAsync] = useState(false);
  const [quotaStatus, setQuotaStatus] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [isAsyncOperation, setIsAsyncOperation] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);

  // Загрузка квот и версий при открытии
  useEffect(() => {
    if (isOpen) {
      handleOpen();
      loadQuotaStatus();
      loadVersions();
    }
  }, [isOpen]);

  // Загрузка статуса квот
  const loadQuotaStatus = async () => {
    try {
      const status = await DatabaseAPI.getUserQuotaStatus();
      setQuotaStatus(status);
    } catch (error) {
      console.error('Error loading quota status:', error);
    }
  };

  // Загрузка версий БД
  const loadVersions = async () => {
    try {
      const versionList = await DatabaseAPI.getDatabaseVersions(database.id);
      setVersions(versionList);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  // Сброс состояния при открытии диалога
  const handleOpen = () => {
    setNewName(`${database.display_name} (Копия)`);
    setIncludeData(false);
    setIncludeRelations(false);
    setProgress(0);
    setProgressMessage('');
    setEstimatedTime(null);
    setForceAsync(false);
    setIsAsyncOperation(false);
    setOperationId(null);
  };

  // Обработчик клонирования
  const handleClone = async () => {
    if (!newName.trim()) {
      toast.error('Введите название для новой базы данных');
      return;
    }

    // Проверка квот
    if (quotaStatus && quotaStatus.available.clones <= 0) {
      toast.error('Достигнут лимит клонирования баз данных');
      return;
    }

    setIsCloning(true);
    setProgress(0);
    setProgressMessage('Инициализация клонирования...');

    try {
      // Определяем, нужно ли асинхронное клонирование
      const shouldUseAsync = forceAsync || (database.row_count && database.row_count > 100000);

      if (shouldUseAsync) {
        setIsAsyncOperation(true);
        setProgressMessage('Планирование асинхронного клонирования...');
      } else {
        setProgress(20);
        setProgressMessage('Создание структуры базы данных...');
      }

      // Вызов расширенного API для клонирования
      const result = await DatabaseAPI.cloneDatabaseAdvanced(
        database.id,
        newName.trim(),
        includeData,
        includeRelations,
        shouldUseAsync
      );

      // Обработка результата в зависимости от типа операции
      if (result.status === 'scheduled') {
        // Асинхронное клонирование запланировано
        setOperationId(result.operationId || null);
        setProgress(100);
        setProgressMessage('Клонирование запланировано');

        toast.info(
          <div className="flex flex-col gap-1">
            <span className="font-medium">Клонирование запланировано</span>
            <span className="text-sm text-muted-foreground">
              {result.estimatedTime && `Примерное время: ${result.estimatedTime}`}
            </span>
            <span className="text-xs text-muted-foreground">
              Вы получите уведомление по завершении
            </span>
          </div>,
          {
            duration: 7000
          }
        );

        // Закрываем диалог
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        // Синхронное клонирование
        if (includeData && result.rowsCopied && result.rowsCopied > 0) {
          setProgress(60);
          setProgressMessage(`Скопировано ${result.rowsCopied} записей`);
        }

        setProgress(100);
        setProgressMessage('Клонирование завершено успешно!');

        // Уведомление об успехе с информацией о версии
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-medium">База данных клонирована</span>
            <span className="text-sm text-muted-foreground">
              {result.versionNumber && `Версия: ${result.versionNumber}`}
            </span>
            <span className="text-sm text-muted-foreground">
              {includeData && result.rowsCopied && result.rowsCopied > 0
                ? `Скопировано ${result.rowsCopied} записей`
                : 'Создана пустая копия структуры'}
            </span>
          </div>,
          {
            duration: 5000
          }
        );

        // Вызов callback при успехе
        if (onSuccess && result.database) {
          onSuccess(result.database);
        }

        // Закрытие диалога через 1.5 секунды
        setTimeout(() => {
          onClose();
        }, 1500);
      }

    } catch (error) {
      console.error('Clone error:', error);
      setProgressMessage('Ошибка при клонировании');

      toast.error(
        <div className="flex flex-col gap-1">
          <span className="font-medium">Ошибка клонирования</span>
          <span className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Неизвестная ошибка'}
          </span>
        </div>
      );

      setIsCloning(false);
    }
  };

  // Расчет примерного размера БД
  const getEstimatedSize = () => {
    if (!database.row_count) return 'Нет данных';

    const rows = database.row_count;
    const avgRowSize = 200; // байт на строку (примерно)
    const totalBytes = rows * avgRowSize;

    if (totalBytes < 1024) return `${totalBytes} Б`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(1)} КБ`;
    if (totalBytes < 1024 * 1024 * 1024) return `${(totalBytes / (1024 * 1024)).toFixed(1)} МБ`;
    return `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} ГБ`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (open) handleOpen();
      else if (!isCloning) onClose();
    }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Copy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Клонирование базы данных</DialogTitle>
              <DialogDescription>
                Создание копии базы данных "{database.display_name}"
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Информация об оригинальной БД */}
          <GlassCard intensity="weak" className="p-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Исходная база данных</span>
                  <Badge variant="outline">{database.system_name}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileStack className="h-4 w-4" />
                    <span>{database.row_count || 0} записей</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>~{getEstimatedSize()}</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Квоты и версии */}
          {quotaStatus && (
            <div className="grid grid-cols-2 gap-4">
              {/* Квоты */}
              <GlassCard intensity="weak" className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Квоты</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Клонов БД:</span>
                    <span className={quotaStatus.available.clones <= 0 ? 'text-red-500' : ''}>
                      {quotaStatus.usage.clones} / {quotaStatus.limits.maxTotalClones}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Доступно:</span>
                    <Badge variant={quotaStatus.available.clones <= 0 ? 'destructive' : 'secondary'} className="h-5 px-1.5 text-xs">
                      {quotaStatus.available.clones}
                    </Badge>
                  </div>
                </div>
              </GlassCard>

              {/* История версий */}
              <GlassCard intensity="weak" className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileStack className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Версии</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Клонов этой БД:</span>
                    <span>{versions.length}</span>
                  </div>
                  {versions.length > 0 && (
                    <div className="text-muted-foreground">
                      Последняя версия: {versions[versions.length - 1]?.versionNumber || 1}
                    </div>
                  )}
                </div>
              </GlassCard>
            </div>
          )}

          {/* Название новой БД */}
          <div className="space-y-2">
            <Label htmlFor="new-name">Название новой базы данных</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Введите название..."
              disabled={isCloning}
              className="bg-background/50"
            />
          </div>

          <Separator />

          {/* Опции клонирования */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Параметры клонирования</h4>

            {/* Копировать данные */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="include-data"
                checked={includeData}
                onCheckedChange={(checked) => setIncludeData(checked as boolean)}
                disabled={isCloning}
              />
              <div className="space-y-1 flex-1">
                <Label
                  htmlFor="include-data"
                  className="text-sm font-normal cursor-pointer"
                >
                  Копировать данные
                </Label>
                <p className="text-xs text-muted-foreground">
                  Все записи будут скопированы в новую базу данных
                  {database.row_count && database.row_count > 1000 && (
                    <span className="text-yellow-600 dark:text-yellow-500">
                      {' '}(может занять время для больших БД)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Копировать связи */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="include-relations"
                checked={includeRelations}
                onCheckedChange={(checked) => setIncludeRelations(checked as boolean)}
                disabled={isCloning || !includeData}
              />
              <div className="space-y-1 flex-1">
                <Label
                  htmlFor="include-relations"
                  className="text-sm font-normal cursor-pointer"
                >
                  Копировать связи
                </Label>
                <p className="text-xs text-muted-foreground">
                  Связи с другими базами данных будут сохранены
                  {!includeData && (
                    <span className="text-muted-foreground/60">
                      {' '}(требуется копирование данных)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Асинхронное клонирование для больших БД */}
            {database.row_count && database.row_count > 100000 && (
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="force-async"
                  checked={forceAsync}
                  onCheckedChange={(checked) => setForceAsync(checked as boolean)}
                  disabled={isCloning}
                />
                <div className="space-y-1 flex-1">
                  <Label
                    htmlFor="force-async"
                    className="text-sm font-normal cursor-pointer"
                  >
                    <Zap className="inline-block mr-1 h-3 w-3 text-yellow-500" />
                    Асинхронное клонирование
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Рекомендуется для больших БД. Операция будет выполнена в фоновом режиме.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Предупреждение для больших БД */}
          {includeData && database.row_count && database.row_count > 10000 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                База данных содержит большое количество записей ({database.row_count.toLocaleString()}).
                Клонирование может занять несколько минут.
              </AlertDescription>
            </Alert>
          )}

          {/* Информация о процессе */}
          {!isCloning && (
            <Alert className="bg-blue-50/10 border-blue-200/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong>Что будет скопировано:</strong>
                <ul className="mt-1 ml-4 space-y-0.5">
                  <li>• Структура таблицы и все колонки</li>
                  <li>• Настройки валидации и значения по умолчанию</li>
                  {includeData && <li>• Все данные из таблицы</li>}
                  {includeRelations && <li>• Связи с другими базами данных</li>}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Прогресс-бар */}
          {isCloning && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  {progress < 100 ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {progressMessage}
                </span>
                <span className="text-muted-foreground">
                  {progress}%
                </span>
              </div>
              {estimatedTime && progress < 100 && (
                <p className="text-xs text-muted-foreground text-center">
                  Примерное время: ~{estimatedTime} сек.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCloning}
          >
            Отмена
          </Button>
          <Button
            onClick={handleClone}
            disabled={isCloning || !newName.trim()}
          >
            {isCloning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Клонирование...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Клонировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}