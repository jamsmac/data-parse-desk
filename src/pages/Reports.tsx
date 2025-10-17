import { useState } from 'react';
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

export default function Reports() {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState<ReportTemplateType[]>([]);
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplateType | null>(null);

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
    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? template : t))
      );
      setEditingTemplate(null);
    } else {
      setTemplates((prev) => [...prev, template]);
    }
    setIsBuilderOpen(false);
    setActiveTab('templates');
  };

  const handleUseTemplate = (template: ReportTemplateType) => {
    // Здесь будет логика генерации отчета
  };

  const handleEditTemplate = (template: ReportTemplateType) => {
    setEditingTemplate(template);
    setIsBuilderOpen(true);
    setActiveTab('builder');
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const handleAddSchedule = (schedule: Omit<ScheduledReport, 'id' | 'createdAt'>) => {
    const newSchedule: ScheduledReport = {
      ...schedule,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setSchedules((prev) => [...prev, newSchedule]);
  };

  const handleUpdateSchedule = (scheduleId: string, updates: Partial<ScheduledReport>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, ...updates } : s))
    );
  };

  const handleDeleteSchedule = (scheduleId: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
  };

  const handleExport = async (config: ExportConfig) => {
    // Здесь будет логика экспорта в PDF
    await new Promise((resolve) => setTimeout(resolve, 2000));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
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
      </div>

      {isBuilderOpen ? (
        <ReportBuilder
          initialTemplate={editingTemplate || undefined}
          availableCharts={mockCharts}
          onSave={handleSaveTemplate}
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

      {/* Stats */}
      {!isBuilderOpen && (
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
      )}
    </div>
  );
}
