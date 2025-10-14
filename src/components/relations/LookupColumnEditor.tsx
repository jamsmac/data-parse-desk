import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Link as LinkIcon, ArrowRight } from 'lucide-react';
import { Database, TableSchema } from '@/types/database';

interface LookupColumnEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDatabase: Database;
  currentColumns: TableSchema[];
  databases: Database[];
  allColumns: Record<string, TableSchema[]>; // database_id -> columns
  onSave: (config: LookupConfig) => Promise<void>;
}

interface LookupConfig {
  name: string;
  relationColumnId: string;
  targetColumnId: string;
  description?: string;
}

export default function LookupColumnEditor({
  open,
  onOpenChange,
  currentDatabase,
  currentColumns,
  databases,
  allColumns,
  onSave,
}: LookupColumnEditorProps) {
  const [config, setConfig] = useState<Partial<LookupConfig>>({
    name: '',
    relationColumnId: '',
    targetColumnId: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Получаем relation-колонки текущей базы
  const relationColumns = currentColumns.filter((col) => col.column_type === 'relation');

  // Получаем целевую базу данных на основе выбранной relation-колонки
  const selectedRelation = relationColumns.find((col) => col.id === config.relationColumnId);
  const targetDatabase = selectedRelation
    ? databases.find((db) => db.id === selectedRelation.relation_config?.target_database_id)
    : null;

  // Получаем доступные колонки целевой базы
  const targetColumns = targetDatabase ? (allColumns[targetDatabase.id] || []) : [];

  const handleSave = async () => {
    if (!config.name || !config.relationColumnId || !config.targetColumnId) {
      setError('Заполните все обязательные поля');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave(config as LookupConfig);
      onOpenChange(false);
      // Сброс формы
      setConfig({
        name: '',
        relationColumnId: '',
        targetColumnId: '',
        description: '',
      });
    } catch (err: any) {
      setError(err.message || 'Ошибка создания Lookup колонки');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTargetColumn = targetColumns.find((col) => col.id === config.targetColumnId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Создать Lookup колонку
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Описание */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Lookup</strong> позволяет отображать значение из связанной записи. Например, если у
              вас есть связь с таблицей "Клиенты", вы можете показать имя клиента прямо в текущей
              таблице.
            </p>
          </div>

          {/* Название */}
          <div className="space-y-2">
            <Label htmlFor="lookup-name">
              Название колонки <span className="text-destructive">*</span>
            </Label>
            <Input
              id="lookup-name"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              placeholder="Например: Название компании"
              disabled={isLoading}
            />
          </div>

          {/* Связь */}
          <div className="space-y-2">
            <Label htmlFor="relation-column">
              Через какую связь <span className="text-destructive">*</span>
            </Label>
            <Select
              value={config.relationColumnId}
              onValueChange={(value) =>
                setConfig({ ...config, relationColumnId: value, targetColumnId: '' })
              }
              disabled={isLoading || relationColumns.length === 0}
            >
              <SelectTrigger id="relation-column">
                <SelectValue placeholder="Выберите relation-колонку" />
              </SelectTrigger>
              <SelectContent>
                {relationColumns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      {col.column_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {relationColumns.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Сначала создайте Relation колонку для связи с другой базой данных
              </p>
            )}
          </div>

          {/* Целевая колонка */}
          {selectedRelation && (
            <div className="space-y-2">
              <Label htmlFor="target-column">
                Какое поле отобразить <span className="text-destructive">*</span>
              </Label>
              <Select
                value={config.targetColumnId}
                onValueChange={(value) => setConfig({ ...config, targetColumnId: value })}
                disabled={isLoading || !targetDatabase}
              >
                <SelectTrigger id="target-column">
                  <SelectValue placeholder="Выберите поле из связанной таблицы" />
                </SelectTrigger>
                <SelectContent>
                  {targetColumns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{col.column_type}</span>
                      {col.column_name}
                    </div>
                  </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Визуализация пути */}
          {selectedRelation && selectedTargetColumn && (
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{currentDatabase.name}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{selectedRelation.column_name}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <span className="font-medium">{targetDatabase?.name}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-primary">{selectedTargetColumn.column_name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="lookup-description">Описание (опционально)</Label>
            <Input
              id="lookup-description"
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              placeholder="Краткое описание колонки"
              disabled={isLoading}
            />
          </div>

          {/* Действия */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={isLoading || relationColumns.length === 0}>
              {isLoading ? 'Создание...' : 'Создать Lookup'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
