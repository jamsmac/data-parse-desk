import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: Array<{ name: string; type: string }>;
  selectedCount: number;
  onSave: (column: string, value: any) => Promise<void>;
}

export function BulkEditDialog({
  open,
  onOpenChange,
  columns,
  selectedCount,
  onSave,
}: BulkEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [value, setValue] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedColumn || value === '') {
      return;
    }

    setLoading(true);
    try {
      await onSave(selectedColumn, value);
      onOpenChange(false);
      setSelectedColumn('');
      setValue('');
    } finally {
      setLoading(false);
    }
  };

  const selectedColumnType = columns.find(c => c.name === selectedColumn)?.type || 'text';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Массовое редактирование</DialogTitle>
            <DialogDescription>
              Изменить значение поля для {selectedCount} {selectedCount === 1 ? 'записи' : selectedCount < 5 ? 'записей' : 'записей'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="column">Выберите колонку</Label>
              <Select
                value={selectedColumn}
                onValueChange={setSelectedColumn}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите колонку..." />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((column) => (
                    <SelectItem key={column.name} value={column.name}>
                      {column.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedColumn && (
              <div className="space-y-2">
                <Label htmlFor="value">Новое значение</Label>
                {selectedColumnType === 'boolean' ? (
                  <Select value={value} onValueChange={setValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите значение..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Да</SelectItem>
                      <SelectItem value="false">Нет</SelectItem>
                    </SelectContent>
                  </Select>
                ) : selectedColumnType === 'number' ? (
                  <Input
                    id="value"
                    type="number"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Введите число..."
                    autoFocus
                  />
                ) : selectedColumnType === 'date' ? (
                  <Input
                    id="value"
                    type="date"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <Input
                    id="value"
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="Введите значение..."
                    autoFocus
                  />
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedColumn || value === ''}
            >
              {loading ? 'Сохранение...' : 'Применить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
