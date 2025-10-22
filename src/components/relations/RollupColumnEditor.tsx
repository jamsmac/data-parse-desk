import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, Info, RefreshCw } from 'lucide-react';
import { RollupConfig, TableSchema } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';

interface RollupColumnEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relationColumns: TableSchema[];
  databaseId: string;
  onSave: (config: RollupConfig & { columnName: string }) => void;
  existingConfig?: RollupConfig & { columnName: string };
}

interface ComputeResult {
  success: boolean;
  rollup_updates: number;
  duration_ms: number;
}

export const RollupColumnEditor: React.FC<RollupColumnEditorProps> = ({
  open,
  onOpenChange,
  relationColumns,
  databaseId,
  onSave,
  existingConfig,
}) => {
  const [columnName, setColumnName] = useState(existingConfig?.columnName || '');
  const [relationColumnId, setRelationColumnId] = useState(
    existingConfig?.relation_column_id || ''
  );
  const [targetColumn, setTargetColumn] = useState(existingConfig?.target_column || '');
  const [aggregation, setAggregation] = useState<
    'count' | 'sum' | 'avg' | 'min' | 'max' | 'median' | 'unique' | 'empty' | 'not_empty'
  >(existingConfig?.aggregation || 'count');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!columnName.trim() || !relationColumnId || !targetColumn) {
      setError('Заполните все обязательные поля');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      onSave({
        columnName: columnName.trim(),
        relationId: relationColumnId,
        relation_column_id: relationColumnId,
        target_column: targetColumn,
        aggregation,
      });

      // Автоматически вычисляем значения rollup после создания
      await handleRecalculate();

      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || 'Ошибка создания Rollup колонки');
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('compute-columns', {
        body: {
          databaseId,
          columnTypes: ['rollup'],
        },
      });

      if (funcError) throw funcError;

      const result = data as ComputeResult;
      setSuccessMessage(
        `Обновлено ${result.rollup_updates} значений за ${Math.round(result.duration_ms)}мс`
      );
    } catch (err: any) {
      setError(err.message || 'Ошибка пересчета Rollup значений');
    } finally {
      setIsRecalculating(false);
    }
  };

  const getAggregationDescription = (agg: string) => {
    switch (agg) {
      case 'count':
        return 'Подсчитать количество связанных записей';
      case 'sum':
        return 'Сумма значений из связанных записей';
      case 'avg':
        return 'Среднее значение из связанных записей';
      case 'min':
        return 'Минимальное значение из связанных записей';
      case 'max':
        return 'Максимальное значение из связанных записей';
      case 'median':
        return 'Медианное значение из связанных записей';
      case 'unique':
        return 'Количество уникальных значений';
      case 'empty':
        return 'Количество пустых значений';
      case 'not_empty':
        return 'Количество непустых значений';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            {existingConfig ? 'Редактировать Rollup' : 'Создать Rollup'}
          </DialogTitle>
          <DialogDescription>
            Агрегируйте данные из связанных записей (сумма, среднее, количество и т.д.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="columnName">Название колонки</Label>
            <Input
              id="columnName"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Например: Всего заказов, Средний чек"
            />
          </div>

          {/* Relation Column */}
          <div className="space-y-2">
            <Label htmlFor="relationColumn">Колонка со связью</Label>
            <Select value={relationColumnId} onValueChange={setRelationColumnId}>
              <SelectTrigger id="relationColumn">
                <SelectValue placeholder="Выберите колонку со связью" />
              </SelectTrigger>
              <SelectContent>
                {relationColumns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.column_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {relationColumns.length === 0 && (
              <p className="text-xs text-orange-600">
                Сначала создайте колонку типа "Связь"
              </p>
            )}
          </div>

          {/* Target Column */}
          <div className="space-y-2">
            <Label htmlFor="targetColumn">Поле для агрегации</Label>
            <Input
              id="targetColumn"
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              placeholder="Например: price, quantity, amount"
            />
            <p className="text-xs text-muted-foreground">
              Поле из связанной таблицы, которое нужно агрегировать
            </p>
          </div>

          {/* Aggregation Type */}
          <div className="space-y-2">
            <Label htmlFor="aggregation">Тип агрегации</Label>
            <Select
              value={aggregation}
              onValueChange={(value: any) => setAggregation(value)}
            >
              <SelectTrigger id="aggregation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="count">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Количество</span>
                    <span className="text-xs text-muted-foreground">
                      Подсчитать записи
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="sum">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Сумма</span>
                    <span className="text-xs text-muted-foreground">
                      Сложить значения
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="avg">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Среднее</span>
                    <span className="text-xs text-muted-foreground">
                      Вычислить среднее
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="min">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Минимум</span>
                    <span className="text-xs text-muted-foreground">
                      Найти минимальное
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="max">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Максимум</span>
                    <span className="text-xs text-muted-foreground">
                      Найти максимальное
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="median">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Медиана</span>
                    <span className="text-xs text-muted-foreground">
                      Найти медианное
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="unique">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Уникальные</span>
                    <span className="text-xs text-muted-foreground">
                      Количество уникальных
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="empty">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Пустые</span>
                    <span className="text-xs text-muted-foreground">
                      Количество пустых
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="not_empty">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Непустые</span>
                    <span className="text-xs text-muted-foreground">
                      Количество непустых
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getAggregationDescription(aggregation)}
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Примеры использования Rollup:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Подсчитать количество заказов у клиента</li>
                <li>Вычислить общую сумму заказов</li>
                <li>Найти средний чек покупателя</li>
                <li>Определить максимальную цену товара</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-2 sm:mr-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
            {isRecalculating ? 'Пересчет...' : 'Пересчитать значения'}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={!columnName.trim() || !relationColumnId || !targetColumn}
            >
              {existingConfig ? 'Обновить' : 'Создать'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
