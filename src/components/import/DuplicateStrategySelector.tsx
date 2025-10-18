import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

interface DuplicateStrategySelectorProps {
  value: 'skip' | 'update' | 'add_all';
  onChange: (value: 'skip' | 'update' | 'add_all') => void;
  duplicatesFound?: number;
}

export const DuplicateStrategySelector = ({ 
  value, 
  onChange, 
  duplicatesFound = 0 
}: DuplicateStrategySelectorProps) => {
  return (
    <div className="space-y-2">
      <Label>Обработка дубликатов</Label>
      {duplicatesFound > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
          <AlertCircle className="h-4 w-4" />
          <span>Найдено дубликатов: {duplicatesFound}</span>
        </div>
      )}
      <Select value={value} onValueChange={onChange as any}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="skip">
            <div>
              <p className="font-medium">Пропустить дубликаты</p>
              <p className="text-xs text-muted-foreground">Игнорировать повторяющиеся записи</p>
            </div>
          </SelectItem>
          <SelectItem value="update">
            <div>
              <p className="font-medium">Обновить существующие</p>
              <p className="text-xs text-muted-foreground">Заменить данные в существующих записях</p>
            </div>
          </SelectItem>
          <SelectItem value="add_all">
            <div>
              <p className="font-medium">Добавить все</p>
              <p className="text-xs text-muted-foreground">Загрузить все записи, включая дубликаты</p>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
