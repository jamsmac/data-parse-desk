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
import { Info, Link2 } from 'lucide-react';
import { Database, RelationConfig } from '@/types/database';

interface RelationColumnEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databases: Database[];
  currentDatabaseId: string;
  onSave: (config: RelationConfig & { columnName: string }) => void;
  existingConfig?: RelationConfig & { columnName: string };
}

export const RelationColumnEditor: React.FC<RelationColumnEditorProps> = ({
  open,
  onOpenChange,
  databases,
  currentDatabaseId,
  onSave,
  existingConfig,
}) => {
  const [columnName, setColumnName] = useState(existingConfig?.columnName || '');
  const [targetDatabaseId, setTargetDatabaseId] = useState(
    existingConfig?.target_database_id || ''
  );
  const [relationType, setRelationType] = useState<
    'one_to_many' | 'many_to_one' | 'many_to_many'
  >(existingConfig?.relation_type || 'many_to_one');
  const [displayField, setDisplayField] = useState(existingConfig?.display_field || '');

  const availableDatabases = databases.filter((db) => db.id !== currentDatabaseId);

  const handleSave = () => {
    if (!columnName.trim() || !targetDatabaseId) {
      return;
    }

    onSave({
      columnName: columnName.trim(),
      target_database_id: targetDatabaseId,
      relation_type: relationType,
      display_field: displayField || undefined,
    });

    onOpenChange(false);
  };

  const getRelationDescription = (type: string) => {
    switch (type) {
      case 'one_to_many':
        return 'Одна запись в текущей БД → много записей в связанной БД';
      case 'many_to_one':
        return 'Много записей в текущей БД → одна запись в связанной БД';
      case 'many_to_many':
        return 'Много записей в текущей БД ↔ много записей в связанной БД';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5" />
            {existingConfig ? 'Редактировать связь' : 'Создать связь'}
          </DialogTitle>
          <DialogDescription>
            Настройте связь между таблицами для объединения данных
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Column Name */}
          <div className="space-y-2">
            <Label htmlFor="columnName">Название колонки</Label>
            <Input
              id="columnName"
              value={columnName}
              onChange={(e) => setColumnName(e.target.value)}
              placeholder="Например: Клиент, Заказ, Компания"
            />
          </div>

          {/* Target Database */}
          <div className="space-y-2">
            <Label htmlFor="targetDatabase">Связанная база данных</Label>
            <Select value={targetDatabaseId} onValueChange={setTargetDatabaseId}>
              <SelectTrigger id="targetDatabase">
                <SelectValue placeholder="Выберите базу данных" />
              </SelectTrigger>
              <SelectContent>
                {availableDatabases.map((db) => (
                  <SelectItem key={db.id} value={db.id}>
                    <div className="flex items-center gap-2">
                      {db.icon && <span>{db.icon}</span>}
                      <span>{db.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Relation Type */}
          <div className="space-y-2">
            <Label htmlFor="relationType">Тип связи</Label>
            <Select
              value={relationType}
              onValueChange={(value) => setRelationType(value as 'one_to_many' | 'many_to_one' | 'many_to_many')}
            >
              <SelectTrigger id="relationType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="many_to_one">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Многие к одному</span>
                    <span className="text-xs text-muted-foreground">
                      Например: много заказов → один клиент
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="one_to_many">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Один ко многим</span>
                    <span className="text-xs text-muted-foreground">
                      Например: один клиент → много заказов
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="many_to_many">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Многие ко многим</span>
                    <span className="text-xs text-muted-foreground">
                      Например: студенты ↔ курсы
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {getRelationDescription(relationType)}
            </p>
          </div>

          {/* Display Field */}
          <div className="space-y-2">
            <Label htmlFor="displayField">
              Поле для отображения{' '}
              <span className="text-xs text-muted-foreground">(опционально)</span>
            </Label>
            <Input
              id="displayField"
              value={displayField}
              onChange={(e) => setDisplayField(e.target.value)}
              placeholder="Например: name, title, email"
            />
            <p className="text-xs text-muted-foreground">
              Какое поле из связанной таблицы показывать в этой колонке
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Связи позволяют:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Ссылаться на записи из других баз данных</li>
                <li>Отображать данные из связанных таблиц</li>
                <li>Использовать Rollup и Lookup для агрегации данных</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSave}
            disabled={!columnName.trim() || !targetDatabaseId}
          >
            {existingConfig ? 'Обновить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
