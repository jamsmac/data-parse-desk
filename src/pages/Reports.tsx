import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ReportBuilder } from '@/components/reports/ReportBuilder';
import { ReportTemplate } from '@/components/reports/ReportTemplate';
import { PDFExporter, ExportConfig } from '@/components/reports/PDFExporter';
import { ScheduledReports } from '@/components/reports/ScheduledReports';
import {
  ReportTemplate as ReportTemplateType,
  ScheduledReport,
  ReportConfig,
} from '@/types/reports';
import { ChartConfig } from '@/types/charts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('templates');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplateType | null>(null);
  const [templates, setTemplates] = useState<ReportTemplateType[]>([]);
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedTemplates = localStorage.getItem('report-templates');
    const savedSchedules = localStorage.getItem('report-schedules');
    
    if (savedTemplates) {
      try {
        setTemplates(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Failed to parse templates:', e);
      }
    }
    
    if (savedSchedules) {
      try {
        setSchedules(JSON.parse(savedSchedules));
      } catch (e) {
        console.error('Failed to parse schedules:', e);
      }
    }
  }, []);

  // Save to localStorage whenever templates change
  useEffect(() => {
    localStorage.setItem('report-templates', JSON.stringify(templates));
  }, [templates]);

  // Save to localStorage whenever schedules change
  useEffect(() => {
    localStorage.setItem('report-schedules', JSON.stringify(schedules));
  }, [schedules]);

  // Mock charts - в реальном приложении это будет из API
  const mockCharts: ChartConfig[] = [
    {
      id: '1',
      name: 'Продажи по месяцам',
      type: 'line',
      databaseId: 'db-1',
      yAxis: [{ columnId: '1', columnName: 'sales', aggregation: 'sum' }],
    },
    {
      id: '2',
      name: 'Распределение по категориям',
      type: 'pie',
      databaseId: 'db-1',
      yAxis: [{ columnId: '2', columnName: 'revenue', aggregation: 'sum' }],
    },
  ];

  // Mock report for export demo
  const mockReport: ReportConfig = {
    id: 'report-1',
    name: 'Ежемесячный отчет',
    data: [],
    generatedAt: new Date().toISOString(),
    format: 'pdf',
  };

  const handleSaveTemplate = (template: ReportTemplateType) => {
    const existingIndex = templates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      const updatedTemplates = [...templates];
      updatedTemplates[existingIndex] = template;
      setTemplates(updatedTemplates);
    } else {
      setTemplates([...templates, template]);
    }
    
    toast.success('Шаблон сохранен');
    setEditingTemplate(null);
    setIsBuilderOpen(false);
    setActiveTab('templates');
  };

  const handleUseTemplate = (template: ReportTemplateType) => {
    console.log('Using template:', template);
    // Здесь будет логика генерации отчета
  };

  const handleEditTemplate = (template: ReportTemplateType) => {
    setEditingTemplate(template);
    setIsBuilderOpen(true);
    setActiveTab('builder');
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(t => t.id !== templateId));
    toast.success('Шаблон удален');
  };

  const handleAddSchedule = (schedule: Omit<ScheduledReport, 'id' | 'createdAt'>) => {
    const newSchedule: ScheduledReport = {
      ...schedule,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    setSchedules([...schedules, newSchedule]);
    toast.success('Расписание добавлено');
  };

  const handleUpdateSchedule = (scheduleId: string, updates: Partial<ScheduledReport>) => {
    setSchedules(schedules.map(s => s.id === scheduleId ? { ...s, ...updates } : s));
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    setSchedules(schedules.filter(s => s.id !== scheduleId));
    toast.success('Расписание удалено');
  };

  const handleExport = async (config: ExportConfig) => {
    try {
      const mockData = [{ name: 'Test', value: 100 }];
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: {
          templateId: mockReport.template?.id,
          format: mockReport.format,
          data: { rows: mockData, name: mockReport.name },
        },
      });
      if (error) throw error;
      const blob = new Blob([data]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mockReport.name}.${mockReport.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Отчет экспортирован');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка экспорта');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <main id="main-content" className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Отчеты</h1>
          <p className="text-muted-foreground mt-2">
            Создавайте, планируйте и экспортируйте отчеты
          </p>
        </div>
        {activeTab === 'templates' && !isBuilderOpen && (
          <Button onClick={() => setIsBuilderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Создать шаблон
          </Button>
        )}
      </header>

      <section aria-label="Создание и управление отчетами">
      {isBuilderOpen ? (
        <ReportBuilder
          initialTemplate={editingTemplate || undefined}
          availableCharts={mockCharts}
          onSave={handleSaveTemplate}
          onPreview={(template) => console.log('Preview template:', template)}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="templates">Шаблоны</TabsTrigger>
            <TabsTrigger value="scheduled">Расписание</TabsTrigger>
            <TabsTrigger value="export">Экспорт</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6">
            {templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <ReportTemplate
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onEdit={handleEditTemplate}
                    onDelete={handleDeleteTemplate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Plus className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Нет шаблонов отчетов</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Создайте свой первый шаблон отчета
                </p>
                <Button onClick={() => setIsBuilderOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Создать шаблон
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scheduled" className="mt-6">
            <ScheduledReports
              schedules={schedules}
              templates={templates}
              onAdd={handleAddSchedule}
              onUpdate={handleUpdateSchedule}
              onDelete={handleDeleteSchedule}
            />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <div className="max-w-md mx-auto">
              <PDFExporter report={mockReport} onExport={handleExport} />
            </div>
          </TabsContent>
        </Tabs>
      )}
      </section>

      {/* Stats */}
      {!isBuilderOpen && (
        <section aria-label="Статистика отчетов">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-4 bg-primary/5 rounded-lg border">
            <div className="text-sm text-muted-foreground">Шаблонов</div>
            <div className="text-2xl font-bold mt-1">{templates.length}</div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg border">
            <div className="text-sm text-muted-foreground">Запланировано</div>
            <div className="text-2xl font-bold mt-1">
              {schedules.filter((s) => s.isActive).length}
            </div>
          </div>
          <div className="p-4 bg-primary/5 rounded-lg border">
            <div className="text-sm text-muted-foreground">Всего расписаний</div>
            <div className="text-2xl font-bold mt-1">{schedules.length}</div>
          </div>
        </div>
        </section>
      )}
      </main>
    </div>
  );
}
