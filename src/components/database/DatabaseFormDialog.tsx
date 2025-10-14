import React, { useState } from 'react';
import { Database as DatabaseIcon } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/types/database';

interface DatabaseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  database?: Database;
  onSave: (data: Partial<Database>) => Promise<void>;
}

export const DatabaseFormDialog: React.FC<DatabaseFormDialogProps> = ({
  open,
  onOpenChange,
  database,
  onSave,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: database?.name || '',
    description: database?.description || '',
    icon: database?.icon || '📊',
    color: database?.color || '#6366f1',
    tags: database?.tags?.join(', ') || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Укажите название базы данных',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...formData,
        tags: formData.tags
          ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      });

      toast({
        title: database ? 'База данных обновлена' : 'База данных создана',
        description: `База данных "${formData.name}" успешно ${
          database ? 'обновлена' : 'создана'
        }`,
      });

      onOpenChange(false);
      setFormData({
        name: '',
        description: '',
        icon: '📊',
        color: '#6366f1',
        tags: '',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось ${database ? 'обновить' : 'создать'} базу данных`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const commonEmojis = [
    '📊', '📈', '📉', '💼', '🏢', '🎯', '📝', '🗂️',
    '📁', '💾', '🔍', '⚙️', '🛠️', '📋', '📌', '🎨',
  ];

  const commonColors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {database ? 'Редактировать базу данных' : 'Создать базу данных'}
            </DialogTitle>
            <DialogDescription>
              {database
                ? 'Измените параметры базы данных'
                : 'Создайте новую базу данных для хранения и анализа данных'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Название */}
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                placeholder="Моя база данных"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            {/* Описание */}
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                placeholder="Краткое описание базы данных..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* Иконка */}
            <div className="space-y-2">
              <Label>Иконка</Label>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
                  style={{ backgroundColor: formData.color }}
                >
                  {formData.icon}
                </div>
                <div className="flex flex-wrap gap-2">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`h-8 w-8 rounded hover:bg-muted transition-colors ${
                        formData.icon === emoji ? 'bg-muted' : ''
                      }`}
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Цвет */}
            <div className="space-y-2">
              <Label>Цвет</Label>
              <div className="flex gap-2">
                {commonColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                      formData.color === color
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>

            {/* Теги */}
            <div className="space-y-2">
              <Label htmlFor="tags">Теги</Label>
              <Input
                id="tags"
                placeholder="Тег1, Тег2, Тег3"
                value={formData.tags}
                onChange={(e) =>
                  setFormData({ ...formData, tags: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Разделяйте теги запятыми
              </p>
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
              {loading ? 'Сохранение...' : database ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
