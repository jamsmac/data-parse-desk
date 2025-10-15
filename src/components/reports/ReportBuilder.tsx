import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  BarChart3,
  Table2,
  Type,
  Image as ImageIcon,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Save,
  Eye,
} from 'lucide-react';
import { ReportTemplate, ReportSection } from '@/types/reports';
import { ChartConfig } from '@/types/charts';

export interface ReportBuilderProps {
  initialTemplate?: Partial<ReportTemplate>;
  availableCharts?: ChartConfig[];
  onSave: (template: ReportTemplate) => void;
  onPreview?: (template: ReportTemplate) => void;
}

const SECTION_TYPES = [
  { type: 'text', label: 'Текст', icon: Type },
  { type: 'chart', label: 'График', icon: BarChart3 },
  { type: 'table', label: 'Таблица', icon: Table2 },
  { type: 'metric', label: 'Метрика', icon: FileText },
  { type: 'image', label: 'Изображение', icon: ImageIcon },
];

const CATEGORIES = [
  { value: 'sales', label: 'Продажи' },
  { value: 'financial', label: 'Финансовый' },
  { value: 'analytics', label: 'Аналитика' },
  { value: 'inventory', label: 'Складской' },
  { value: 'custom', label: 'Пользовательский' },
];

export function ReportBuilder({
  initialTemplate,
  availableCharts = [],
  onSave,
  onPreview,
}: ReportBuilderProps) {
  const [template, setTemplate] = useState<ReportTemplate>({
    id: initialTemplate?.id || crypto.randomUUID(),
    name: initialTemplate?.name || 'Новый отчет',
    description: initialTemplate?.description,
    category: initialTemplate?.category || 'custom',
    sections: initialTemplate?.sections || [],
    createdAt: initialTemplate?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const addSection = (type: ReportSection['type']) => {
    const newSection: ReportSection = {
      id: crypto.randomUUID(),
      type,
      title: `${SECTION_TYPES.find((t) => t.type === type)?.label} ${template.sections.length + 1}`,
      position: template.sections.length,
    };

    setTemplate((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
      updatedAt: new Date().toISOString(),
    }));
    setSelectedSection(newSection.id);
  };

  const removeSection = (sectionId: string) => {
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections
        .filter((s) => s.id !== sectionId)
        .map((s, index) => ({ ...s, position: index })),
      updatedAt: new Date().toISOString(),
    }));
    if (selectedSection === sectionId) {
      setSelectedSection(null);
    }
  };

  const updateSection = (sectionId: string, updates: Partial<ReportSection>) => {
    setTemplate((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const moveSectionUp = (sectionId: string) => {
    const index = template.sections.findIndex((s) => s.id === sectionId);
    if (index > 0) {
      const newSections = [...template.sections];
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
      setTemplate((prev) => ({
        ...prev,
        sections: newSections.map((s, i) => ({ ...s, position: i })),
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const moveSectionDown = (sectionId: string) => {
    const index = template.sections.findIndex((s) => s.id === sectionId);
    if (index < template.sections.length - 1) {
      const newSections = [...template.sections];
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
      setTemplate((prev) => ({
        ...prev,
        sections: newSections.map((s, i) => ({ ...s, position: i })),
        updatedAt: new Date().toISOString(),
      }));
    }
  };

  const selectedSectionData = template.sections.find((s) => s.id === selectedSection);

  const handleSave = () => {
    onSave(template);
  };

  const handlePreview = () => {
    if (onPreview) {
      onPreview(template);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-[calc(100vh-200px)]">
      {/* Left Panel - Configuration */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Настройки отчета</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-4">
              {/* Template Settings */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={template.name}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        name: e.target.value,
                        updatedAt: new Date().toISOString(),
                      }))
                    }
                    placeholder="Название отчета"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    value={template.description || ''}
                    onChange={(e) =>
                      setTemplate((prev) => ({
                        ...prev,
                        description: e.target.value,
                        updatedAt: new Date().toISOString(),
                      }))
                    }
                    placeholder="Описание отчета"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Select
                    value={template.category}
                    onValueChange={(value) =>
                      setTemplate((prev) => ({
                        ...prev,
                        category: value as 'sales' | 'financial' | 'analytics' | 'inventory' | 'custom',
                        updatedAt: new Date().toISOString(),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Add Sections */}
              <div className="space-y-2 pt-4 border-t">
                <Label>Добавить секцию</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SECTION_TYPES.map((sectionType) => (
                    <Button
                      key={sectionType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => addSection(sectionType.type as ReportSection['type'])}
                      className="justify-start"
                    >
                      <sectionType.icon className="mr-2 h-4 w-4" />
                      {sectionType.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Section List */}
              {template.sections.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Секции ({template.sections.length})</Label>
                  <div className="space-y-1">
                    {template.sections.map((section, index) => {
                      const sectionType = SECTION_TYPES.find((t) => t.type === section.type);
                      return (
                        <div
                          key={section.id}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                            selectedSection === section.id
                              ? 'bg-primary/10 border border-primary'
                              : 'bg-secondary hover:bg-secondary/80'
                          }`}
                          onClick={() => setSelectedSection(section.id)}
                        >
                          <div className="flex items-center gap-2">
                            {sectionType && <sectionType.icon className="h-4 w-4" />}
                            <span className="text-sm">{section.title}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSectionUp(section.id);
                              }}
                              disabled={index === 0}
                            >
                              <MoveUp className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                moveSectionDown(section.id);
                              }}
                              disabled={index === template.sections.length - 1}
                            >
                              <MoveDown className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeSection(section.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="space-y-2 mt-4 pt-4 border-t">
            {onPreview && (
              <Button onClick={handlePreview} variant="outline" className="w-full">
                <Eye className="mr-2 h-4 w-4" />
                Превью
              </Button>
            )}
            <Button onClick={handleSave} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Сохранить шаблон
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Middle Panel - Preview */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Предпросмотр</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-300px)]">
            {template.sections.length > 0 ? (
              <div className="space-y-4">
                {template.sections.map((section) => {
                  const sectionType = SECTION_TYPES.find((t) => t.type === section.type);
                  return (
                    <div
                      key={section.id}
                      className={`p-4 border rounded-lg ${
                        selectedSection === section.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedSection(section.id)}
                    >
                      {section.title && (
                        <div className="flex items-center gap-2 mb-2">
                          {sectionType && <sectionType.icon className="h-4 w-4" />}
                          <h4 className="font-semibold">{section.title}</h4>
                        </div>
                      )}
                      {section.content && (
                        <p className="text-sm text-muted-foreground">{section.content}</p>
                      )}
                      {section.type === 'chart' && (
                        <div className="h-32 bg-secondary/50 rounded flex items-center justify-center text-sm text-muted-foreground">
                          График: {section.chartConfig?.name || 'Не выбран'}
                        </div>
                      )}
                      {section.type === 'table' && (
                        <div className="h-24 bg-secondary/50 rounded flex items-center justify-center text-sm text-muted-foreground">
                          Таблица
                        </div>
                      )}
                      {section.type === 'metric' && (
                        <div className="p-4 bg-secondary/50 rounded text-center">
                          <div className="text-2xl font-bold">--</div>
                          <div className="text-xs text-muted-foreground">Метрика</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <Plus className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="text-lg font-medium">Отчет пуст</div>
                  <p className="text-sm text-muted-foreground">
                    Добавьте секции из панели слева
                  </p>
                </div>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Panel - Section Properties */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Свойства секции</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedSectionData ? (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Заголовок</Label>
                  <Input
                    value={selectedSectionData.title || ''}
                    onChange={(e) =>
                      updateSection(selectedSectionData.id, { title: e.target.value })
                    }
                  />
                </div>

                {selectedSectionData.type === 'text' && (
                  <div className="space-y-2">
                    <Label>Содержание</Label>
                    <Textarea
                      value={selectedSectionData.content || ''}
                      onChange={(e) =>
                        updateSection(selectedSectionData.id, { content: e.target.value })
                      }
                      rows={10}
                      placeholder="Введите текст..."
                    />
                  </div>
                )}

                {selectedSectionData.type === 'chart' && availableCharts.length > 0 && (
                  <div className="space-y-2">
                    <Label>График</Label>
                    <Select
                      value={selectedSectionData.chartConfig?.id}
                      onValueChange={(chartId) => {
                        const chart = availableCharts.find((c) => c.id === chartId);
                        updateSection(selectedSectionData.id, { chartConfig: chart });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите график" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCharts.map((chart) => (
                          <SelectItem key={chart.id} value={chart.id}>
                            {chart.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => removeSection(selectedSectionData.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить секцию
                </Button>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[calc(100vh-300px)] flex items-center justify-center text-center">
              <div className="text-sm text-muted-foreground">
                Выберите секцию для редактирования
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
