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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
  onSave: (data: Partial<Project>) => Promise<void>;
}

export const ProjectFormDialog: React.FC<ProjectFormDialogProps> = ({
  open,
  onOpenChange,
  project,
  onSave,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    icon: project?.icon || '📁',
    color: project?.color || '#94A3B8',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Укажите название проекта',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);

      toast({
        title: project ? 'Проект обновлен' : 'Проект создан',
        description: `Проект "${formData.name}" успешно ${
          project ? 'обновлен' : 'создан'
        }`,
      });

      onOpenChange(false);
      setFormData({
        name: '',
        description: '',
        icon: '📁',
        color: '#94A3B8',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: `Не удалось ${project ? 'обновить' : 'создать'} проект`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const commonEmojis = [
    '📁', '📂', '🗂️', '💼', '🏢', '🎯', '⚡', '🚀',
    '📊', '📈', '🛠️', '⚙️', '🎨', '🔥', '⭐', '💡',
  ];

  const commonColors = [
    '#94A3B8', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
    '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {project ? 'Редактировать проект' : 'Создать проект'}
            </DialogTitle>
            <DialogDescription>
              {project
                ? 'Измените параметры проекта'
                : 'Создайте новый проект для организации баз данных'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Название */}
            <div className="space-y-2">
              <Label htmlFor="name">Название *</Label>
              <Input
                id="name"
                placeholder="Мой проект"
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
                placeholder="Краткое описание проекта..."
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
              {loading ? 'Сохранение...' : project ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
