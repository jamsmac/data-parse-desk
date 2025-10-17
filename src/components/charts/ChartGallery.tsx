import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  Package,
  Search,
  LayoutDashboard,
  Download,
  FileImage,
  FileCode,
} from 'lucide-react';
import { exportChartToPNG, exportChartToSVG } from '@/utils/chartExport';
import { toast } from 'sonner';
import { ChartType } from '@/types/charts';
import type { ComponentType } from 'react';
import { ExportDialog } from './ExportDialog';

export interface ChartTemplate {
  id: string;
  name: string;
  description: string;
  type: ChartType;
  category: 'sales' | 'analytics' | 'financial' | 'inventory' | 'users' | 'custom';
  icon: ComponentType<{ className?: string }>;
  preview: string;
  config: {
    recommendedColumns: {
      xAxis?: string[];
      yAxis?: string[];
    };
  };
}

export interface ChartGalleryProps {
  onSelectTemplate: (template: ChartTemplate) => void;
}

const CHART_TEMPLATES: ChartTemplate[] = [
  {
    id: 'sales-by-month',
    name: 'Продажи по месяцам',
    description: 'Линейный график продаж за период',
    type: 'line',
    category: 'sales',
    icon: TrendingUp,
    preview: '📈',
    config: {
      recommendedColumns: {
        xAxis: ['date', 'month', 'period'],
        yAxis: ['sales', 'revenue', 'amount', 'total'],
      },
    },
  },
  {
    id: 'revenue-breakdown',
    name: 'Разбивка доходов',
    description: 'Столбчатая диаграмма доходов по категориям',
    type: 'bar',
    category: 'financial',
    icon: DollarSign,
    preview: '📊',
    config: {
      recommendedColumns: {
        xAxis: ['category', 'product', 'type'],
        yAxis: ['revenue', 'income', 'amount'],
      },
    },
  },
  {
    id: 'market-share',
    name: 'Доля рынка',
    description: 'Круговая диаграмма распределения долей',
    type: 'pie',
    category: 'analytics',
    icon: PieChart,
    preview: '🥧',
    config: {
      recommendedColumns: {
        xAxis: ['category', 'segment', 'region'],
        yAxis: ['value', 'percentage', 'share'],
      },
    },
  },
  {
    id: 'inventory-levels',
    name: 'Уровни запасов',
    description: 'Столбчатый график остатков на складе',
    type: 'bar',
    category: 'inventory',
    icon: Package,
    preview: '📦',
    config: {
      recommendedColumns: {
        xAxis: ['product', 'sku', 'item'],
        yAxis: ['quantity', 'stock', 'inventory'],
      },
    },
  },
  {
    id: 'user-growth',
    name: 'Рост пользователей',
    description: 'Областной график роста активных пользователей',
    type: 'area',
    category: 'users',
    icon: Users,
    preview: '👥',
    config: {
      recommendedColumns: {
        xAxis: ['date', 'month', 'week'],
        yAxis: ['users', 'active_users', 'registrations'],
      },
    },
  },
  {
    id: 'performance-metrics',
    name: 'Метрики производительности',
    description: 'Комбинированный график KPI',
    type: 'composed',
    category: 'analytics',
    icon: Activity,
    preview: '📉',
    config: {
      recommendedColumns: {
        xAxis: ['date', 'period'],
        yAxis: ['metric1', 'metric2', 'kpi'],
      },
    },
  },
  {
    id: 'sales-comparison',
    name: 'Сравнение продаж',
    description: 'Сравнительная столбчатая диаграмма',
    type: 'bar',
    category: 'sales',
    icon: BarChart3,
    preview: '📊',
    config: {
      recommendedColumns: {
        xAxis: ['product', 'region', 'salesperson'],
        yAxis: ['current_year', 'previous_year', 'target'],
      },
    },
  },
  {
    id: 'trend-analysis',
    name: 'Анализ трендов',
    description: 'Линейный график с множественными метриками',
    type: 'line',
    category: 'analytics',
    icon: LineChart,
    preview: '📈',
    config: {
      recommendedColumns: {
        xAxis: ['date', 'week', 'month'],
        yAxis: ['value1', 'value2', 'value3'],
      },
    },
  },
  {
    id: 'financial-overview',
    name: 'Финансовый обзор',
    description: 'Стековая столбчатая диаграмма доходов и расходов',
    type: 'bar',
    category: 'financial',
    icon: DollarSign,
    preview: '💰',
    config: {
      recommendedColumns: {
        xAxis: ['month', 'quarter', 'period'],
        yAxis: ['income', 'expenses', 'profit'],
      },
    },
  },
  {
    id: 'scatter-correlation',
    name: 'Корреляция данных',
    description: 'Точечная диаграмма для анализа корреляций',
    type: 'scatter',
    category: 'analytics',
    icon: Activity,
    preview: '⚫',
    config: {
      recommendedColumns: {
        xAxis: ['variable1', 'metric1'],
        yAxis: ['variable2', 'metric2'],
      },
    },
  },
];

const CATEGORIES = [
  { value: 'all', label: 'Все', icon: LayoutDashboard },
  { value: 'sales', label: 'Продажи', icon: TrendingUp },
  { value: 'financial', label: 'Финансы', icon: DollarSign },
  { value: 'analytics', label: 'Аналитика', icon: Activity },
  { value: 'inventory', label: 'Склад', icon: Package },
  { value: 'users', label: 'Пользователи', icon: Users },
];

export function ChartGallery({ onSelectTemplate }: ChartGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [selectedChart, setSelectedChart] = useState<{ element: HTMLElement | null; name: string }>({ element: null, name: '' });

  const filteredTemplates = CHART_TEMPLATES.filter((template) => {
    const matchesCategory =
      selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Галерея графиков</h2>
        <p className="text-muted-foreground">
          Выберите готовый шаблон графика для быстрого старта
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск шаблонов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {CATEGORIES.map((category) => (
          <Button
            key={category.value}
            variant={selectedCategory === category.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.value)}
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <category.icon className="h-4 w-4" />
            {category.label}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <ScrollArea className="h-[calc(100vh-400px)]">
        {filteredTemplates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="cursor-pointer hover:border-primary transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3" onClick={() => onSelectTemplate(template)}>
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <template.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                    </div>
                    {/* Export button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        const chartId = `chart-${template.id}`;
                        const element = document.getElementById(chartId);
                        if (element) {
                          setSelectedChart({ element, name: template.name });
                          setExportDialogOpen(true);
                        }
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Preview */}
                    <div
                      id={`chart-${template.id}`}
                      className="h-32 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg flex items-center justify-center"
                    >
                      <span className="text-6xl">{template.preview}</span>
                    </div>

                    {/* Info */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {template.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORIES.find((c) => c.value === template.category)?.label ||
                          template.category}
                      </Badge>
                    </div>

                    {/* Recommended Columns */}
                    <div className="text-xs text-muted-foreground space-y-1">
                      {template.config.recommendedColumns.xAxis && (
                        <div>
                          <span className="font-medium">X:</span>{' '}
                          {template.config.recommendedColumns.xAxis.slice(0, 2).join(', ')}
                        </div>
                      )}
                      {template.config.recommendedColumns.yAxis && (
                        <div>
                          <span className="font-medium">Y:</span>{' '}
                          {template.config.recommendedColumns.yAxis.slice(0, 2).join(', ')}
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTemplate(template);
                      }}
                    >
                      Использовать шаблон
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Шаблоны не найдены</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Попробуйте изменить критерии поиска или категорию
            </p>
          </div>
        )}
      </ScrollArea>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        element={selectedChart.element}
        defaultFileName={selectedChart.name}
      />
    </div>
  );
}
