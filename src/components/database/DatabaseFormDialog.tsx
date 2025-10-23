import React, { useState, useCallback } from 'react';
import { Database as DatabaseIcon, Upload, FileSpreadsheet, X } from 'lucide-react';
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
  onSave: (data: Partial<Database>, file?: File) => Promise<void>;
}

export const DatabaseFormDialog: React.FC<DatabaseFormDialogProps> = ({
  open,
  onOpenChange,
  database,
  onSave,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    name: database?.name || '',
    description: database?.description || '',
    icon: database?.icon || '📊',
    color: database?.color || '#6366f1',
    tags: database?.tags?.join(', ') || '',
  });

  const handleFileChange = useCallback(async (selectedFile: File | null) => {
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      toast({
        title: 'Неподдерживаемый формат',
        description: 'Загрузите CSV или Excel файл',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);

    // Auto-suggest name from filename
    const suggestedName = selectedFile.name
      .replace(/\.(csv|xlsx|xls)$/i, '')
      .replace(/[_-]/g, ' ')
      .trim();

    try {
      // Lazy load fileParser only when needed
      const { parseFile } = await import('@/utils/fileParser');
      const parsed = await parseFile(selectedFile);

      setFormData(prev => ({
        ...prev,
        name: prev.name || suggestedName,
        description: prev.description || `Импортировано из ${selectedFile.name} (${parsed.rowCount} записей)`,
      }));

      toast({
        title: 'Файл загружен',
        description: `Найдено ${parsed.rowCount} записей с ${parsed.headers.length} колонками`,
      });
    } catch (error) {
      console.error('File parsing error:', error);
      toast({
        title: 'Ошибка парсинга',
        description: error instanceof Error ? error.message : 'Не удалось прочитать файл',
        variant: 'destructive',
      });
      setFile(null);
    }
  }, [toast]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  }, [handleFileChange]);

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
      }, file || undefined);

      toast({
        title: database ? 'База данных обновлена' : 'База данных создана',
        description: `База данных "${formData.name}" успешно ${
          database ? 'обновлена' : 'создана'
        }${file ? ' и данные импортированы' : ''}`,
      });

      onOpenChange(false);
      setFormData({
        name: '',
        description: '',
        icon: '📊',
        color: '#6366f1',
        tags: '',
      });
      setFile(null);
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
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6d28d9',
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
            {/* File Upload Zone */}
            {!database && (
              <div
                className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-8 w-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFile(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <p className="mb-1 text-sm font-medium">
                      Перетащите файл или нажмите для выбора
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CSV, XLSX до 50MB
                    </p>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    />
                  </>
                )}
              </div>
            )}

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
                autoFocus
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
