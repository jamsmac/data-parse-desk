import { useState } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  LayoutGrid,
  Plus,
  X,
  GripVertical,
  Save,
  Eye,
} from 'lucide-react';
import { ChartConfig } from '@/types/charts';

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config?: any;
  chartConfig?: ChartConfig;
}

export interface DashboardConfig {
  id: string;
  name: string;
  description?: string;
  layout: 'grid' | 'free';
  columns: number;
  widgets: DashboardWidget[];
}

export interface DashboardBuilderProps {
  initialConfig?: Partial<DashboardConfig>;
  availableCharts?: ChartConfig[];
  onSave: (config: DashboardConfig) => void;
  onPreview?: (config: DashboardConfig) => void;
}

const WIDGET_TYPES = [
  { type: 'chart', label: 'График', icon: BarChart3, color: 'bg-blue-100 text-blue-600' },
  { type: 'table', label: 'Таблица', icon: Table2, color: 'bg-green-100 text-green-600' },
  { type: 'metric', label: 'Метрика', icon: LineChart, color: 'bg-purple-100 text-purple-600' },
  { type: 'text', label: 'Текст', icon: LayoutGrid, color: 'bg-orange-100 text-orange-600' },
];

const DEFAULT_SIZES = {
  chart: { width: 6, height: 4 },
  table: { width: 8, height: 6 },
  metric: { width: 3, height: 2 },
  text: { width: 4, height: 2 },
};

export function DashboardBuilder({
  initialConfig,
  availableCharts = [],
  onSave,
  onPreview,
}: DashboardBuilderProps) {
  const [config, setConfig] = useState<DashboardConfig>({
    id: initialConfig?.id || crypto.randomUUID(),
    name: initialConfig?.name || 'Новый дашборд',
    description: initialConfig?.description,
    layout: initialConfig?.layout || 'grid',
    columns: initialConfig?.columns || 12,
    widgets: initialConfig?.widgets || [],
  });

  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const addWidget = (type: DashboardWidget['type']) => {
    const newWidget: DashboardWidget = {
      id: crypto.randomUUID(),
      type,
      title: `${WIDGET_TYPES.find((w) => w.type === type)?.label} ${config.widgets.length + 1}`,
      position: { x: 0, y: config.widgets.length * 4 },
      size: DEFAULT_SIZES[type],
    };

    setConfig((prev) => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));
    setSelectedWidget(newWidget.id);
  };

  const removeWidget = (widgetId: string) => {
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
    }));
    if (selectedWidget === widgetId) {
      setSelectedWidget(null);
    }
  };

  const updateWidget = (widgetId: string, updates: Partial<DashboardWidget>) => {
    setConfig((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)),
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Handle widget repositioning
    const { active, delta } = event;
    if (delta.x !== 0 || delta.y !== 0) {
      const widgetId = active.id as string;
      const widget = config.widgets.find((w) => w.id === widgetId);
      if (widget) {
        updateWidget(widgetId, {
          position: {
            x: Math.max(0, widget.position.x + Math.round(delta.x / 100)),
            y: Math.max(0, widget.position.y + Math.round(delta.y / 100)),
          },
        });
      }
    }
  };

  const selectedWidgetData = config.widgets.find((w) => w.id === selectedWidget);

  const handleSave = () => {
    onSave(config);
  };

  const handlePreview = () => {
    setIsPreview(!isPreview);
    if (onPreview && !isPreview) {
      onPreview(config);
    }
  };

  if (isPreview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{config.name}</h2>
            {config.description && (
              <p className="text-muted-foreground">{config.description}</p>
            )}
          </div>
          <Button onClick={handlePreview} variant="outline">
            <X className="mr-2 h-4 w-4" />
            Закрыть превью
          </Button>
        </div>

        {/* Preview Grid */}
        <div className="grid grid-cols-12 gap-4">
          {config.widgets.map((widget) => (
            <div
              key={widget.id}
              style={{
                gridColumn: `span ${widget.size.width}`,
                gridRow: `span ${widget.size.height}`,
              }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-sm">{widget.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    {WIDGET_TYPES.find((t) => t.type === widget.type)?.label} Preview
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 h-[calc(100vh-200px)]">
      {/* Left Panel - Configuration */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Настройки</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-4">
              {/* Dashboard Settings */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={config.name}
                    onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Название дашборда"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Input
                    value={config.description || ''}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Описание (опционально)"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Макет</Label>
                  <Select
                    value={config.layout}
                    onValueChange={(value: 'grid' | 'free') =>
                      setConfig((prev) => ({ ...prev, layout: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid">Сетка</SelectItem>
                      <SelectItem value="free">Свободный</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Колонки</Label>
                  <Select
                    value={config.columns.toString()}
                    onValueChange={(value) =>
                      setConfig((prev) => ({ ...prev, columns: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6 колонок</SelectItem>
                      <SelectItem value="12">12 колонок</SelectItem>
                      <SelectItem value="16">16 колонок</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Add Widgets */}
              <div className="space-y-2 pt-4 border-t">
                <Label>Добавить виджет</Label>
                <div className="grid grid-cols-2 gap-2">
                  {WIDGET_TYPES.map((widgetType) => (
                    <Button
                      key={widgetType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => addWidget(widgetType.type as DashboardWidget['type'])}
                      className="justify-start"
                    >
                      <widgetType.icon className="mr-2 h-4 w-4" />
                      {widgetType.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Widget List */}
              {config.widgets.length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Виджеты ({config.widgets.length})</Label>
                  <div className="space-y-1">
                    {config.widgets.map((widget) => {
                      const widgetType = WIDGET_TYPES.find((t) => t.type === widget.type);
                      return (
                        <div
                          key={widget.id}
                          className={`flex items-center justify-between p-2 rounded cursor-pointer ${
                            selectedWidget === widget.id
                              ? 'bg-primary/10 border border-primary'
                              : 'bg-secondary hover:bg-secondary/80'
                          }`}
                          onClick={() => setSelectedWidget(widget.id)}
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            {widgetType && (
                              <widgetType.icon className="h-4 w-4" />
                            )}
                            <span className="text-sm">{widget.title}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeWidget(widget.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
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
            <Button onClick={handlePreview} variant="outline" className="w-full">
              <Eye className="mr-2 h-4 w-4" />
              Превью
            </Button>
            <Button onClick={handleSave} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              Сохранить
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Middle Panel - Canvas */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Холст</CardTitle>
          <CardDescription>
            Перетаскивайте виджеты для изменения расположения
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <ScrollArea className="h-[calc(100vh-300px)]">
              {config.widgets.length > 0 ? (
                <div className={`grid grid-cols-${config.columns} gap-4 p-4`}>
                  {config.widgets.map((widget) => {
                    const widgetType = WIDGET_TYPES.find((t) => t.type === widget.type);
                    return (
                      <div
                        key={widget.id}
                        style={{
                          gridColumn: `span ${widget.size.width}`,
                          gridRow: `span ${widget.size.height}`,
                        }}
                        className={`relative group ${
                          selectedWidget === widget.id ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        <Card
                          className="h-full cursor-move hover:shadow-lg transition-shadow"
                          onClick={() => setSelectedWidget(widget.id)}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {widgetType && (
                                  <div className={`p-1 rounded ${widgetType.color}`}>
                                    <widgetType.icon className="h-4 w-4" />
                                  </div>
                                )}
                                <CardTitle className="text-sm">{widget.title}</CardTitle>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {widget.size.width}x{widget.size.height}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">
                              {widgetType?.label}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Plus className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="text-lg font-medium">Дашборд пуст</div>
                    <p className="text-sm text-muted-foreground">
                      Добавьте виджеты из панели слева
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </DndContext>
        </CardContent>
      </Card>

      {/* Right Panel - Widget Properties */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Свойства виджета</CardTitle>
        </CardHeader>
        <CardContent>
          {selectedWidgetData ? (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={selectedWidgetData.title}
                    onChange={(e) =>
                      updateWidget(selectedWidgetData.id, { title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ширина (колонки)</Label>
                  <Input
                    type="number"
                    min="1"
                    max={config.columns}
                    value={selectedWidgetData.size.width}
                    onChange={(e) =>
                      updateWidget(selectedWidgetData.id, {
                        size: {
                          ...selectedWidgetData.size,
                          width: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Высота (строки)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="12"
                    value={selectedWidgetData.size.height}
                    onChange={(e) =>
                      updateWidget(selectedWidgetData.id, {
                        size: {
                          ...selectedWidgetData.size,
                          height: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                  />
                </div>

                {selectedWidgetData.type === 'chart' && availableCharts.length > 0 && (
                  <div className="space-y-2">
                    <Label>График</Label>
                    <Select
                      value={selectedWidgetData.chartConfig?.id}
                      onValueChange={(chartId) => {
                        const chart = availableCharts.find((c) => c.id === chartId);
                        updateWidget(selectedWidgetData.id, { chartConfig: chart });
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
                  onClick={() => removeWidget(selectedWidgetData.id)}
                >
                  <X className="mr-2 h-4 w-4" />
                  Удалить виджет
                </Button>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-[calc(100vh-300px)] flex items-center justify-center text-center">
              <div className="text-sm text-muted-foreground">
                Выберите виджет для редактирования его свойств
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
