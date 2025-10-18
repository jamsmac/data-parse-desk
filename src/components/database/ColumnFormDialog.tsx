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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ColumnType } from '@/types/database';

interface ColumnFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column?: any;
  onSave: (data: any) => Promise<void>;
}

const COLUMN_TYPES: { value: ColumnType; label: string }[] = [
  { value: 'text', label: 'Текст' },
  { value: 'number', label: 'Число' },
  { value: 'date', label: 'Дата' },
  { value: 'boolean', label: 'Логическое' },
  { value: 'select', label: 'Выбор' },
  { value: 'multi_select', label: 'Множественный выбор' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'phone', label: 'Телефон' },
  { value: 'file', label: 'Файл' },
];

export function ColumnFormDialog({
  open,
  onOpenChange,
  column,
  onSave,
}: ColumnFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    column_name: column?.column_name || '',
    column_type: column?.column_type || 'text',
    is_required: column?.is_required || false,
  });

  useEffect(() => {
    if (column) {
      setFormData({
        column_name: column.column_name,
        column_type: column.column_type,
        is_required: column.is_required,
      });
    }
  }, [column]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
      setFormData({
        column_name: '',
        column_type: 'text',
        is_required: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {column ? 'Редактировать колонку' : 'Добавить колонку'}
            </DialogTitle>
            <DialogDescription>
              {column
                ? 'Измените параметры колонки'
                : 'Создайте новую колонку в таблице'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="column_name">Название *</Label>
              <Input
                id="column_name"
                placeholder="название_колонки"
                value={formData.column_name}
                onChange={(e) =>
                  setFormData({ ...formData, column_name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="column_type">Тип данных *</Label>
              <Select
                value={formData.column_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, column_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMN_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_required">Обязательное поле</Label>
              <Switch
                id="is_required"
                checked={formData.is_required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_required: checked })
                }
              />
            </div>
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : column ? 'Сохранить' : 'Добавить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
