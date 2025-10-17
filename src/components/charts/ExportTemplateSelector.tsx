/**
 * Компонент выбора и управления шаблонами экспорта
 */

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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Save,
  Bookmark,
  BookmarkCheck,
  MoreVertical,
  Copy,
  Edit2,
  Trash2,
  Download,
  Upload,
  Plus,
  Search,
  Star,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  ExportTemplate,
  getExportTemplates,
  saveExportTemplate,
  updateExportTemplate,
  deleteExportTemplate,
  cloneTemplate,
  searchTemplates,
  exportTemplates,
  importTemplates,
} from '@/utils/exportTemplates';
import { ImageFormat, QualityLevel, WatermarkOptions } from '@/utils/chartExportAdvanced';

interface ExportTemplateSelectorProps {
  onSelectTemplate: (template: ExportTemplate) => void;
  currentSettings?: {
    format: ImageFormat;
    quality: QualityLevel | number;
    watermark?: WatermarkOptions;
    scale?: number;
  };
}

export function ExportTemplateSelector({
  onSelectTemplate,
  currentSettings,
}: ExportTemplateSelectorProps) {
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExportTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateTags, setTemplateTags] = useState('');

  // Загрузка шаблонов при монтировании
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = () => {
    setTemplates(getExportTemplates());
  };

  // Фильтрация шаблонов по поиску
  const filteredTemplates = searchQuery
    ? searchTemplates(searchQuery)
    : templates;

  // Сохранение текущих настроек как шаблон
  const handleSaveAsTemplate = () => {
    if (!currentSettings) {
      toast.error('Нет текущих настроек для сохранения');
      return;
    }

    setSaveDialogOpen(true);
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateTags('');
  };

  // Сохранение шаблона
  const handleSaveTemplate = () => {
    if (!templateName) {
      toast.error('Введите название шаблона');
      return;
    }

    if (!currentSettings) return;

    try {
      if (editingTemplate) {
        // Обновление существующего шаблона
        updateExportTemplate(editingTemplate.id, {
          name: templateName,
          description: templateDescription,
          tags: templateTags.split(',').map(t => t.trim()).filter(Boolean),
          ...currentSettings,
        });
        toast.success('Шаблон обновлен');
      } else {
        // Создание нового шаблона
        saveExportTemplate({
          name: templateName,
          description: templateDescription,
          tags: templateTags.split(',').map(t => t.trim()).filter(Boolean),
          ...currentSettings,
        });
        toast.success('Шаблон сохранен');
      }

      loadTemplates();
      setSaveDialogOpen(false);
    } catch (error) {
      toast.error('Ошибка сохранения шаблона');
      console.error(error);
    }
  };

  // Удаление шаблона
  const handleDeleteTemplate = (id: string) => {
    try {
      deleteExportTemplate(id);
      toast.success('Шаблон удален');
      loadTemplates();
    } catch (error) {
      toast.error('Ошибка удаления шаблона');
    }
  };

  // Клонирование шаблона
  const handleCloneTemplate = (id: string, name: string) => {
    try {
      cloneTemplate(id, `${name} (копия)`);
      toast.success('Шаблон скопирован');
      loadTemplates();
    } catch (error) {
      toast.error('Ошибка копирования шаблона');
    }
  };

  // Экспорт шаблонов
  const handleExportTemplates = () => {
    const json = exportTemplates(false);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'export_templates.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Шаблоны экспортированы');
  };

  // Импорт шаблонов
  const handleImportTemplates = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          importTemplates(event.target?.result as string);
          toast.success('Шаблоны импортированы');
          loadTemplates();
        } catch (error) {
          toast.error('Ошибка импорта шаблонов');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Форматирование даты
  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat('ru', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Панель управления */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск шаблонов..."
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAsTemplate}
              disabled={!currentSettings}
            >
              <Save className="mr-2 h-4 w-4" />
              Сохранить как шаблон
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportTemplates}>
                  <Download className="mr-2 h-4 w-4" />
                  Экспортировать шаблоны
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportTemplates}>
                  <Upload className="mr-2 h-4 w-4" />
                  Импортировать шаблоны
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Список шаблонов */}
        <ScrollArea className="h-64">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {template.icon && <span className="text-lg">{template.icon}</span>}
                      <div>
                        <CardTitle className="text-sm font-medium">
                          {template.name}
                          {template.isDefault && (
                            <Star className="inline-block ml-1 h-3 w-3 text-yellow-500" />
                          )}
                        </CardTitle>
                        {template.description && (
                          <CardDescription className="text-xs mt-1">
                            {template.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTemplate(template);
                          }}
                        >
                          <BookmarkCheck className="mr-2 h-4 w-4" />
                          Применить
                        </DropdownMenuItem>
                        {!template.isDefault && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTemplate(template);
                                setTemplateName(template.name);
                                setTemplateDescription(template.description || '');
                                setTemplateTags(template.tags?.join(', ') || '');
                                setSaveDialogOpen(true);
                              }}
                            >
                              <Edit2 className="mr-2 h-4 w-4" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloneTemplate(template.id, template.name);
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Дублировать
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">
                      {template.format.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {typeof template.quality === 'string'
                        ? template.quality
                        : `${Math.round(template.quality * 100)}%`}
                    </Badge>
                    {template.watermark && (
                      <Badge variant="outline" className="text-xs">
                        Водяной знак
                      </Badge>
                    )}
                  </div>
                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDate(template.updatedAt)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Диалог сохранения/редактирования шаблона */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Редактировать шаблон' : 'Сохранить как шаблон'}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? 'Измените параметры шаблона экспорта'
                : 'Сохраните текущие настройки экспорта как шаблон для повторного использования'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Название</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Например: Экспорт для презентации"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateDescription">Описание (опционально)</Label>
              <Textarea
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Опишите назначение этого шаблона"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateTags">Теги (через запятую)</Label>
              <Input
                id="templateTags"
                value={templateTags}
                onChange={(e) => setTemplateTags(e.target.value)}
                placeholder="презентация, отчет, высокое качество"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveTemplate}>
              {editingTemplate ? 'Сохранить изменения' : 'Сохранить шаблон'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}