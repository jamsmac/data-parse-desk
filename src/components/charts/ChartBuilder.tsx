import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
  ScatterChart,
  Line,
  Bar,
  Area,
  Pie,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, X, Grid3x3 } from 'lucide-react';
import { ChartConfig, ChartType, AggregationType, ChartAxis, ChartData } from '@/types/charts';
import { TableSchema } from '@/types/database';
import { HeatmapChart, HeatmapCell } from './HeatmapChart';

export interface ChartBuilderProps {
  databaseId: string;
  columns: TableSchema[];
  data: any[];
  initialConfig?: Partial<ChartConfig>;
  onSave: (config: ChartConfig) => void;
  onCancel: () => void;
}

const CHART_TYPES: { value: ChartType; label: string; icon: any }[] = [
  { value: 'line', label: 'Линейный', icon: LineChartIcon },
  { value: 'bar', label: 'Столбчатый', icon: BarChart3 },
  { value: 'area', label: 'Областной', icon: LineChartIcon },
  { value: 'pie', label: 'Круговой', icon: PieChartIcon },
  { value: 'scatter', label: 'Точечный', icon: BarChart3 },
  { value: 'composed', label: 'Комбинированный', icon: BarChart3 },
  { value: 'heatmap', label: 'Тепловая карта', icon: Grid3x3 },
];

const AGGREGATIONS: { value: AggregationType; label: string }[] = [
  { value: 'none', label: 'Без агрегации' },
  { value: 'sum', label: 'Сумма' },
  { value: 'avg', label: 'Среднее' },
  { value: 'count', label: 'Количество' },
  { value: 'min', label: 'Минимум' },
  { value: 'max', label: 'Максимум' },
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0', '#a4de6c'];

export function ChartBuilder({
  databaseId,
  columns,
  data,
  initialConfig,
  onSave,
  onCancel,
}: ChartBuilderProps) {
  const [config, setConfig] = useState<ChartConfig>({
    id: initialConfig?.id || crypto.randomUUID(),
    name: initialConfig?.name || 'Новый график',
    type: initialConfig?.type || 'bar',
    databaseId,
    xAxis: initialConfig?.xAxis,
    yAxis: initialConfig?.yAxis || [],
    colors: initialConfig?.colors || COLORS,
    showLegend: initialConfig?.showLegend ?? true,
    showGrid: initialConfig?.showGrid ?? true,
    stacked: initialConfig?.stacked ?? false,
  });

  const [activeColumn, setActiveColumn] = useState<TableSchema | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Агрегация данных для графика
  useEffect(() => {
    if (!config.xAxis || config.yAxis.length === 0) {
      setChartData([]);
      return;
    }

    const aggregated = aggregateData(data, config);
    setChartData(aggregated);
  }, [data, config.xAxis, config.yAxis]);

  const aggregateData = (rawData: any[], cfg: ChartConfig): ChartData[] => {
    if (!cfg.xAxis) return [];

    const grouped = new Map<string, any>();

    rawData.forEach((row) => {
      const xValue = row[cfg.xAxis!.columnName] || 'N/A';
      
      if (!grouped.has(xValue)) {
        grouped.set(xValue, { [cfg.xAxis!.columnName]: xValue });
      }

      const group = grouped.get(xValue)!;

      cfg.yAxis.forEach((yAxis) => {
        const value = parseFloat(row[yAxis.columnName]) || 0;
        const key = yAxis.columnName;
        
        if (!group[key]) {
          group[key] = { sum: 0, count: 0, min: Infinity, max: -Infinity, values: [] };
        }

        group[key].sum += value;
        group[key].count += 1;
        group[key].min = Math.min(group[key].min, value);
        group[key].max = Math.max(group[key].max, value);
        group[key].values.push(value);
      });
    });

    return Array.from(grouped.values()).map((group) => {
      const result: any = { [cfg.xAxis!.columnName]: group[cfg.xAxis!.columnName] };

      cfg.yAxis.forEach((yAxis) => {
        const stats = group[yAxis.columnName];
        const agg = yAxis.aggregation || 'sum';

        switch (agg) {
          case 'sum':
            result[yAxis.columnName] = stats.sum;
            break;
          case 'avg':
            result[yAxis.columnName] = stats.sum / stats.count;
            break;
          case 'count':
            result[yAxis.columnName] = stats.count;
            break;
          case 'min':
            result[yAxis.columnName] = stats.min;
            break;
          case 'max':
            result[yAxis.columnName] = stats.max;
            break;
          case 'none':
            result[yAxis.columnName] = stats.values[0];
            break;
        }
      });

      return result;
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const column = columns.find((col) => col.id === event.active.id);
    setActiveColumn(column || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveColumn(null);

    if (!over) return;

    const column = columns.find((col) => col.id === active.id);
    if (!column) return;

    if (over.id === 'x-axis') {
      setConfig((prev) => ({
        ...prev,
        xAxis: {
          columnId: column.id,
          columnName: column.column_name,
        },
      }));
    } else if (over.id === 'y-axis') {
      setConfig((prev) => ({
        ...prev,
        yAxis: [
          ...prev.yAxis,
          {
            columnId: column.id,
            columnName: column.column_name,
            aggregation: 'sum',
          },
        ],
      }));
    }
  };

  const removeYAxis = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      yAxis: prev.yAxis.filter((_, i) => i !== index),
    }));
  };

  const updateYAxisAggregation = (index: number, aggregation: AggregationType) => {
    setConfig((prev) => ({
      ...prev,
      yAxis: prev.yAxis.map((axis, i) =>
        i === index ? { ...axis, aggregation } : axis
      ),
    }));
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          Перетащите колонки на оси для создания графика
        </div>
      );
    }

    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (config.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...commonProps}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={config.xAxis?.columnName} />
              <YAxis />
              <Tooltip />
              {config.showLegend && <Legend />}
              {config.yAxis.map((axis, index) => (
                <Line
                  key={axis.columnId}
                  type="monotone"
                  dataKey={axis.columnName}
                  stroke={config.colors![index % config.colors!.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...commonProps}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={config.xAxis?.columnName} />
              <YAxis />
              <Tooltip />
              {config.showLegend && <Legend />}
              {config.yAxis.map((axis, index) => (
                <Bar
                  key={axis.columnId}
                  dataKey={axis.columnName}
                  fill={config.colors![index % config.colors!.length]}
                  stackId={config.stacked ? 'stack' : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...commonProps}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={config.xAxis?.columnName} />
              <YAxis />
              <Tooltip />
              {config.showLegend && <Legend />}
              {config.yAxis.map((axis, index) => (
                <Area
                  key={axis.columnId}
                  type="monotone"
                  dataKey={axis.columnName}
                  fill={config.colors![index % config.colors!.length]}
                  stroke={config.colors![index % config.colors!.length]}
                  stackId={config.stacked ? 'stack' : undefined}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        const pieData = chartData.map((item) => ({
          name: item[config.xAxis!.columnName],
          value: item[config.yAxis[0]?.columnName] || 0,
        }));

        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={config.colors![index % config.colors!.length]} />
                ))}
              </Pie>
              <Tooltip />
              {config.showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart {...commonProps}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
              <XAxis dataKey={config.xAxis?.columnName} />
              <YAxis />
              <Tooltip />
              {config.showLegend && <Legend />}
              {config.yAxis.map((axis, index) => (
                <Scatter
                  key={axis.columnId}
                  dataKey={axis.columnName}
                  fill={config.colors![index % config.colors!.length]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'heatmap':
        // Convert chart data to heatmap cells format
        const heatmapData: HeatmapCell[] = chartData.flatMap((item) => {
          const xValue = item[config.xAxis!.columnName];
          return config.yAxis.map((axis) => ({
            x: xValue,
            y: axis.columnName,
            value: Number(item[axis.columnName]) || 0,
            label: `${xValue} - ${axis.columnName}: ${item[axis.columnName]}`,
          }));
        });

        return (
          <HeatmapChart
            data={heatmapData}
            title={config.name}
            colorScheme="blue"
            showValues={true}
            showLegend={config.showLegend}
            cellSize={60}
          />
        );

      default:
        return null;
    }
  };

  const isValidConfig = config.name && config.xAxis && config.yAxis.length > 0;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {/* Left Panel - Configuration */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Настройки графика</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label>Название</Label>
                  <Input
                    value={config.name}
                    onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Название графика"
                  />
                </div>

                {/* Chart Type */}
                <div className="space-y-2">
                  <Label>Тип графика</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {CHART_TYPES.map((type) => (
                      <Button
                        key={type.value}
                        variant={config.type === type.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfig((prev) => ({ ...prev, type: type.value }))}
                        className="justify-start"
                      >
                        <type.icon className="mr-2 h-4 w-4" />
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Available Columns */}
                <div className="space-y-2">
                  <Label>Доступные колонки</Label>
                  <div className="space-y-1">
                    {columns.map((column) => (
                      <div
                        key={column.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', column.id);
                        }}
                        className="p-2 bg-secondary rounded cursor-move hover:bg-secondary/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{column.column_name}</span>
                          <Badge variant="outline">{column.column_type}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Легенда</Label>
                    <Switch
                      checked={config.showLegend}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, showLegend: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Сетка</Label>
                    <Switch
                      checked={config.showGrid}
                      onCheckedChange={(checked) =>
                        setConfig((prev) => ({ ...prev, showGrid: checked }))
                      }
                    />
                  </div>
                  {['bar', 'area'].includes(config.type) && (
                    <div className="flex items-center justify-between">
                      <Label>Стековый</Label>
                      <Switch
                        checked={config.stacked}
                        onCheckedChange={(checked) =>
                          setConfig((prev) => ({ ...prev, stacked: checked }))
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <Button onClick={onCancel} variant="outline" className="flex-1">
                Отмена
              </Button>
              <Button
                onClick={() => onSave(config)}
                disabled={!isValidConfig}
                className="flex-1"
              >
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Middle Panel - Axes Configuration */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Оси</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* X Axis Drop Zone */}
            <div
              id="x-axis"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const columnId = e.dataTransfer.getData('text/plain');
                const column = columns.find((col) => col.id === columnId);
                if (column) {
                  setConfig((prev) => ({
                    ...prev,
                    xAxis: { columnId: column.id, columnName: column.column_name },
                  }));
                }
              }}
              className="border-2 border-dashed rounded-lg p-4 min-h-[100px] hover:border-primary transition-colors"
            >
              <Label className="text-xs text-muted-foreground mb-2 block">Ось X</Label>
              {config.xAxis ? (
                <div className="bg-primary/10 p-2 rounded flex items-center justify-between">
                  <span className="font-medium">{config.xAxis.columnName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfig((prev) => ({ ...prev, xAxis: undefined }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Перетащите колонку сюда
                </div>
              )}
            </div>

            {/* Y Axis Drop Zone */}
            <div
              id="y-axis"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const columnId = e.dataTransfer.getData('text/plain');
                const column = columns.find((col) => col.id === columnId);
                if (column && !config.yAxis.find((a) => a.columnId === column.id)) {
                  setConfig((prev) => ({
                    ...prev,
                    yAxis: [
                      ...prev.yAxis,
                      { columnId: column.id, columnName: column.column_name, aggregation: 'sum' },
                    ],
                  }));
                }
              }}
              className="border-2 border-dashed rounded-lg p-4 min-h-[200px] hover:border-primary transition-colors"
            >
              <Label className="text-xs text-muted-foreground mb-2 block">Ось Y</Label>
              {config.yAxis.length > 0 ? (
                <div className="space-y-2">
                  {config.yAxis.map((axis, index) => (
                    <div key={axis.columnId} className="bg-primary/10 p-2 rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{axis.columnName}</span>
                        <Button variant="ghost" size="sm" onClick={() => removeYAxis(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Select
                        value={axis.aggregation || 'sum'}
                        onValueChange={(value) =>
                          updateYAxisAggregation(index, value as AggregationType)
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AGGREGATIONS.map((agg) => (
                            <SelectItem key={agg.value} value={agg.value}>
                              {agg.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Перетащите колонки сюда
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Chart Preview */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Предпросмотр</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[calc(100vh-300px)]">{renderChart()}</div>
          </CardContent>
        </Card>
      </div>

      <DragOverlay>
        {activeColumn && (
          <div className="bg-primary text-primary-foreground p-2 rounded shadow-lg">
            {activeColumn.column_name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
