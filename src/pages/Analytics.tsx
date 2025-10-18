import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { ChartBuilder } from '@/components/charts/ChartBuilder';
import { PivotTable } from '@/components/charts/PivotTable';
import { ChartGallery } from '@/components/charts/ChartGallery';
import { DashboardBuilder } from '@/components/charts/DashboardBuilder';
import { SystemStats } from '@/components/analytics/SystemStats';
import { RealtimeStats } from '@/components/analytics/RealtimeStats';
import { ChartConfig } from '@/types/charts';
import { DashboardConfig } from '@/components/charts/DashboardBuilder';
import { ChartTemplate } from '@/components/charts/ChartGallery';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('gallery');
  const [savedCharts, setSavedCharts] = useState<ChartConfig[]>([]);
  const [savedDashboards, setSavedDashboards] = useState<DashboardConfig[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  });
  const [realtimeData, setRealtimeData] = useState<any[]>([]);

  // Mock data - в реальном приложении это будет из API
  const mockColumns = [
    { id: '1', database_id: '1', column_name: 'date', column_type: 'date' as const, is_required: false, position: 0, created_at: '', updated_at: '' },
    { id: '2', database_id: '1', column_name: 'product', column_type: 'text' as const, is_required: false, position: 1, created_at: '', updated_at: '' },
    { id: '3', database_id: '1', column_name: 'sales', column_type: 'number' as const, is_required: false, position: 2, created_at: '', updated_at: '' },
    { id: '4', database_id: '1', column_name: 'quantity', column_type: 'number' as const, is_required: false, position: 3, created_at: '', updated_at: '' },
    { id: '5', database_id: '1', column_name: 'category', column_type: 'select' as const, is_required: false, position: 4, created_at: '', updated_at: '' },
  ];

  const mockData = [
    { date: '2024-01-01', product: 'Product A', sales: 1200, quantity: 50, category: 'Electronics' },
    { date: '2024-01-02', product: 'Product B', sales: 850, quantity: 30, category: 'Clothing' },
    { date: '2024-01-03', product: 'Product C', sales: 1500, quantity: 75, category: 'Electronics' },
    { date: '2024-01-04', product: 'Product A', sales: 950, quantity: 40, category: 'Electronics' },
    { date: '2024-01-05', product: 'Product D', sales: 2100, quantity: 90, category: 'Home' },
  ];

  const handleSaveChart = (chart: ChartConfig) => {
    setSavedCharts((prev) => [...prev, chart]);
    console.log('Chart saved:', chart);
  };

  const handleSaveDashboard = (dashboard: DashboardConfig) => {
    setSavedDashboards((prev) => [...prev, dashboard]);
    console.log('Dashboard saved:', dashboard);
  };

  const handleSelectTemplate = (template: ChartTemplate) => {
    console.log('Template selected:', template);
    setActiveTab('builder');
  };

  const handleExportPivot = (data: any[][]) => {
    try {
      // Convert to CSV
      const csv = data.map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Данные экспортированы');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка экспорта');
    }
  };

  // Setup Realtime subscription for analytics
  useEffect(() => {
    const channel = supabase
      .channel('credit_transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_transactions' }, (payload) => {
        console.log('Realtime update:', payload);
        setRealtimeData(prev => [payload.new, ...prev.slice(0, 99)]);
        toast.info('Новые данные получены');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Аналитика</h1>
          <p className="text-muted-foreground mt-2">
            Создавайте графики, сводные таблицы и дашборды для анализа данных
          </p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd.MM.yyyy')} - {format(dateRange.to, 'dd.MM.yyyy')}
                    </>
                  ) : (
                    format(dateRange.from, 'dd.MM.yyyy')
                  )
                ) : (
                  'Выберите период'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button onClick={() => handleExportPivot(mockData.map(d => Object.values(d)))}>
            <Download className="mr-2 h-4 w-4" />
            Экспорт CSV
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="stats">Статистика</TabsTrigger>
          <TabsTrigger value="gallery">Галерея</TabsTrigger>
          <TabsTrigger value="builder">Конструктор графиков</TabsTrigger>
          <TabsTrigger value="pivot">Сводные таблицы</TabsTrigger>
          <TabsTrigger value="dashboard">Дашборды</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="mt-6">
          <div className="space-y-6">
            <RealtimeStats />
            <SystemStats />
          </div>
        </TabsContent>

        <TabsContent value="gallery" className="mt-6">
          <ChartGallery onSelectTemplate={handleSelectTemplate} />
        </TabsContent>

        <TabsContent value="builder" className="mt-6">
          <ChartBuilder
            databaseId="mock-db-1"
            columns={mockColumns}
            data={mockData}
            onSave={handleSaveChart}
            onCancel={() => setActiveTab('gallery')}
          />
        </TabsContent>

        <TabsContent value="pivot" className="mt-6">
          <PivotTable
            data={mockData}
            columns={mockColumns}
            onExport={handleExportPivot}
          />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardBuilder
            availableCharts={savedCharts}
            onSave={handleSaveDashboard}
            onPreview={(config) => console.log('Preview dashboard:', config)}
          />
        </TabsContent>
      </Tabs>

      {/* Saved Charts Summary */}
      {savedCharts.length > 0 && (
        <div className="mt-8 p-4 bg-secondary/50 rounded-lg">
          <h3 className="font-semibold mb-2">Сохраненные графики ({savedCharts.length})</h3>
          <div className="flex flex-wrap gap-2">
            {savedCharts.map((chart) => (
              <div
                key={chart.id}
                className="px-3 py-1 bg-background rounded-md text-sm border"
              >
                {chart.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
