import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Link as LinkIcon, Check, X } from 'lucide-react';
import { Database, TableSchema } from '@/types/database';

interface RelationPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetDatabase: Database;
  targetRecords: Record<string, any>[];
  targetColumns: TableSchema[];
  selectedRecordIds: string[];
  onSelect: (recordIds: string[]) => void;
  multiple?: boolean;
  displayField?: string;
}

export default function RelationPicker({
  open,
  onOpenChange,
  targetDatabase,
  targetRecords,
  targetColumns,
  selectedRecordIds,
  onSelect,
  multiple = false,
  displayField,
}: RelationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedRecordIds);

  // Определяем поле для отображения
  const displayColumnName = useMemo(() => {
    if (displayField) return displayField;
    
    // Ищем первую текстовую колонку
    const textColumn = targetColumns.find(
      (col) => col.column_type === 'text' && col.column_name !== 'id'
    );
    return textColumn?.column_name || 'id';
  }, [displayField, targetColumns]);

  // Фильтруем записи по поисковому запросу
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return targetRecords;

    const query = searchQuery.toLowerCase();
    return targetRecords.filter((record) => {
      return Object.values(record).some((value) =>
        String(value).toLowerCase().includes(query)
      );
    });
  }, [targetRecords, searchQuery]);

  const handleToggleRecord = (recordId: string) => {
    if (multiple) {
      setTempSelectedIds((prev) =>
        prev.includes(recordId)
          ? prev.filter((id) => id !== recordId)
          : [...prev, recordId]
      );
    } else {
      setTempSelectedIds([recordId]);
    }
  };

  const handleSelectAll = () => {
    if (tempSelectedIds.length === filteredRecords.length) {
      setTempSelectedIds([]);
    } else {
      setTempSelectedIds(filteredRecords.map((record) => record.id));
    }
  };

  const handleConfirm = () => {
    onSelect(tempSelectedIds);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedRecordIds);
    onOpenChange(false);
  };

  const getRecordDisplay = (record: Record<string, any>) => {
    return record[displayColumnName] || record.id || 'Без названия';
  };

  const selectedCount = tempSelectedIds.length;
  const totalCount = targetRecords.length;

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Выбрать записи из "{targetDatabase.name}"
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Поиск */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск записей..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {filteredRecords.length} из {totalCount} записей
                {selectedCount > 0 && ` • Выбрано: ${selectedCount}`}
              </span>

              {multiple && filteredRecords.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-7"
                >
                  {tempSelectedIds.length === filteredRecords.length
                    ? 'Снять всё'
                    : 'Выбрать всё'}
                </Button>
              )}
            </div>
          </div>

          {/* Список записей */}
          <ScrollArea className="flex-1 border rounded-lg">
            <div className="p-2 space-y-1">
              {filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery
                    ? 'Записи не найдены'
                    : 'Нет доступных записей'}
                </div>
              ) : (
                filteredRecords.map((record) => {
                  const isSelected = tempSelectedIds.includes(record.id);
                  const displayValue = getRecordDisplay(record);

                  return (
                    <div
                      key={record.id}
                      className={`
                        flex items-center gap-3 p-3 rounded-lg cursor-pointer
                        transition-colors hover:bg-accent
                        ${isSelected ? 'bg-primary/5 border border-primary/20' : 'border border-transparent'}
                      `}
                      onClick={() => handleToggleRecord(record.id)}
                    >
                      {multiple ? (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRecord(record.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <div
                          className={`
                            w-5 h-5 rounded-full border-2 flex items-center justify-center
                            ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}
                          `}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{displayValue}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {targetColumns.slice(0, 3).map((col) => {
                            if (col.column_name === displayColumnName) return null;
                            const value = record[col.column_name];
                            if (!value) return null;

                            return (
                              <span
                                key={col.column_name}
                                className="text-xs text-muted-foreground truncate"
                              >
                                {col.column_name}: {String(value).substring(0, 20)}
                                {String(value).length > 20 && '...'}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {isSelected && (
                        <Badge variant="secondary" className="shrink-0">
                          Выбрано
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Выбранные записи */}
          {selectedCount > 0 && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Выбрано: {selectedCount}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTempSelectedIds([])}
                  className="h-7 text-destructive"
                >
                  <X className="h-3 w-3 mr-1" />
                  Очистить
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tempSelectedIds.slice(0, 5).map((id) => {
                  const record = targetRecords.find((r) => r.id === id);
                  if (!record) return null;

                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/10"
                      onClick={() => handleToggleRecord(id)}
                    >
                      {getRecordDisplay(record)}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  );
                })}
                {selectedCount > 5 && (
                  <Badge variant="outline">+{selectedCount - 5} ещё</Badge>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Отмена
          </Button>
          <Button onClick={handleConfirm} disabled={selectedCount === 0}>
            {multiple ? `Выбрать (${selectedCount})` : 'Выбрать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
