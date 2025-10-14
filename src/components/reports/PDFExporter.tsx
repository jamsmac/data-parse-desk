import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { FileDown, Loader2, CheckCircle2 } from 'lucide-react';
import { ReportConfig } from '@/types/reports';

export interface PDFExporterProps {
  report: ReportConfig;
  onExport: (config: ExportConfig) => Promise<void>;
}

export interface ExportConfig {
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'Letter' | 'Legal';
  includeCharts: boolean;
  includeTables: boolean;
  includeHeader: boolean;
  includeFooter: boolean;
}

export function PDFExporter({ report, onExport }: PDFExporterProps) {
  const [config, setConfig] = useState<ExportConfig>({
    orientation: 'portrait',
    pageSize: 'A4',
    includeCharts: true,
    includeTables: true,
    includeHeader: true,
    includeFooter: true,
  });

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setIsComplete(false);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      await onExport(config);

      clearInterval(interval);
      setProgress(100);
      setIsComplete(true);

      setTimeout(() => {
        setIsExporting(false);
        setIsComplete(false);
        setProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      setIsExporting(false);
      setProgress(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Экспорт в PDF</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ориентация</Label>
            <Select
              value={config.orientation}
              onValueChange={(value: 'portrait' | 'landscape') =>
                setConfig((prev) => ({ ...prev, orientation: value }))
              }
              disabled={isExporting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Портретная</SelectItem>
                <SelectItem value="landscape">Альбомная</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Размер страницы</Label>
            <Select
              value={config.pageSize}
              onValueChange={(value: 'A4' | 'Letter' | 'Legal') =>
                setConfig((prev) => ({ ...prev, pageSize: value }))
              }
              disabled={isExporting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label>Включить графики</Label>
              <Switch
                checked={config.includeCharts}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, includeCharts: checked }))
                }
                disabled={isExporting}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Включить таблицы</Label>
              <Switch
                checked={config.includeTables}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, includeTables: checked }))
                }
                disabled={isExporting}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Колонтитулы (верх)</Label>
              <Switch
                checked={config.includeHeader}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, includeHeader: checked }))
                }
                disabled={isExporting}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Колонтитулы (низ)</Label>
              <Switch
                checked={config.includeFooter}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({ ...prev, includeFooter: checked }))
                }
                disabled={isExporting}
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Экспорт...</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Экспорт...
            </>
          ) : isComplete ? (
            <>
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Завершено
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-5 w-5" />
              Экспортировать в PDF
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-secondary/50 rounded">
          <div>Отчет: {report.name}</div>
          <div>Формат: {config.pageSize} ({config.orientation === 'portrait' ? 'Портрет' : 'Альбом'})</div>
        </div>
      </CardContent>
    </Card>
  );
}
