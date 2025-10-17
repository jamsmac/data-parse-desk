/**
 * Диалог для batch экспорта нескольких графиков
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Package, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  batchExportCharts,
  type ImageFormat,
  type QualityLevel,
  type BatchExportOptions,
} from '@/utils/chartExportAdvanced';

export interface ChartItem {
  id: string;
  name: string;
  element: HTMLElement;
  selected?: boolean;
}

interface BatchExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  charts: ChartItem[];
}

export function BatchExportDialog({
  open,
  onOpenChange,
  charts: initialCharts,
}: BatchExportDialogProps) {
  const [charts, setCharts] = useState<ChartItem[]>(
    initialCharts.map(chart => ({ ...chart, selected: true }))
  );
  const [format, setFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState<QualityLevel>('medium');
  const [useWatermark, setUseWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('VHData Platform');
  const [zipFileName, setZipFileName] = useState('charts');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentChart, setCurrentChart] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'preparing' | 'processing' | 'packaging' | 'complete'>('preparing');
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  // Обновляем список графиков при изменении props
  React.useEffect(() => {
    setCharts(initialCharts.map(chart => ({ ...chart, selected: chart.selected ?? true })));
  }, [initialCharts]);

  // Подсчет выбранных графиков
  const selectedCount = charts.filter(c => c.selected).length;
  const totalCount = charts.length;

  // Выбрать/снять все
  const toggleSelectAll = () => {
    const allSelected = charts.every(c => c.selected);
    setCharts(charts.map(c => ({ ...c, selected: !allSelected })));
  };

  // Переключить выбор графика
  const toggleChart = (id: string) => {
    setCharts(charts.map(c =>
      c.id === id ? { ...c, selected: !c.selected } : c
    ));
  };

  // Экспорт выбранных графиков
  const handleExport = async () => {
    const selectedCharts = charts.filter(c => c.selected);

    if (selectedCharts.length === 0) {
      toast.error('Выберите хотя бы один график для экспорта');
      return;
    }

    setIsExporting(true);
    setExportStatus('exporting');
    setExportProgress(0);
    setCurrentStep('preparing');

    try {
      // Шаг 1: Подготовка
      setCurrentStep('preparing');
      setCurrentChart('Подготовка к экспорту...');
      await new Promise(resolve => setTimeout(resolve, 300));

      const elements = selectedCharts.map(chart => ({
        element: chart.element,
        name: chart.name,
      }));

      // Шаг 2: Обработка графиков
      setCurrentStep('processing');

      const options: BatchExportOptions = {
        format,
        quality,
        zipFileName,
        watermark: useWatermark
          ? {
              text: watermarkText,
              position: 'bottom-right',
              opacity: 0.5,
              fontSize: 16,
            }
          : undefined,
        onProgress: (current, total) => {
          const progress = (current / total) * 100;
          setExportProgress(progress);

          // Обновляем текущий график
          if (current > 0 && current <= selectedCharts.length) {
            setCurrentChart(`Обработка: ${selectedCharts[current - 1].name}`);
          }

          // При 90% переходим к упаковке
          if (progress >= 90) {
            setCurrentStep('packaging');
            setCurrentChart('Создание ZIP архива...');
          }
        },
      };

      await batchExportCharts(elements, options);

      // Шаг 3: Завершение
      setCurrentStep('complete');
      setExportStatus('success');
      toast.success(`Экспортировано ${selectedCharts.length} графиков в ${zipFileName}.zip`);

      // Закрываем диалог через 2 секунды после успешного экспорта
      setTimeout(() => {
        onOpenChange(false);
        setExportStatus('idle');
        setExportProgress(0);
        setCurrentChart('');
        setCurrentStep('preparing');
      }, 2000);
    } catch (error) {
      setExportStatus('error');
      toast.error('Ошибка batch экспорта');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Batch экспорт графиков</DialogTitle>
          <DialogDescription>
            Экспортируйте несколько графиков одновременно в ZIP архив
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Выбор графиков */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Графики для экспорта ({selectedCount}/{totalCount})</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {charts.every(c => c.selected) ? 'Снять все' : 'Выбрать все'}
              </Button>
            </div>

            <ScrollArea className="h-48 border rounded-lg p-3">
              <div className="space-y-2">
                {charts.map(chart => (
                  <div
                    key={chart.id}
                    className="flex items-center space-x-2 p-2 hover:bg-muted rounded"
                  >
                    <Checkbox
                      id={chart.id}
                      checked={chart.selected}
                      onCheckedChange={() => toggleChart(chart.id)}
                    />
                    <Label
                      htmlFor={chart.id}
                      className="flex-1 cursor-pointer"
                    >
                      {chart.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Настройки экспорта */}
          <div className="grid grid-cols-2 gap-4">
            {/* Формат */}
            <div className="space-y-2">
              <Label htmlFor="format">Формат</Label>
              <Select
                value={format}
                onValueChange={(v) => setFormat(v as ImageFormat)}
                disabled={isExporting}
              >
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">PNG</SelectItem>
                  <SelectItem value="jpeg">JPEG</SelectItem>
                  <SelectItem value="webp">WebP</SelectItem>
                  <SelectItem value="svg">SVG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Качество */}
            <div className="space-y-2">
              <Label htmlFor="quality">Качество</Label>
              <Select
                value={quality}
                onValueChange={(v) => setQuality(v as QualityLevel)}
                disabled={isExporting}
              >
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкое (1x)</SelectItem>
                  <SelectItem value="medium">Среднее (2x)</SelectItem>
                  <SelectItem value="high">Высокое (3x)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Имя архива */}
            <div className="space-y-2">
              <Label htmlFor="zipFileName">Имя ZIP архива</Label>
              <Input
                id="zipFileName"
                value={zipFileName}
                onChange={(e) => setZipFileName(e.target.value)}
                placeholder="charts"
                disabled={isExporting}
              />
            </div>

            {/* Водяной знак */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="watermark">Водяной знак</Label>
                <Switch
                  id="watermark"
                  checked={useWatermark}
                  onCheckedChange={setUseWatermark}
                  disabled={isExporting}
                />
              </div>
              {useWatermark && (
                <Input
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="Текст водяного знака"
                  disabled={isExporting}
                  className="text-sm"
                />
              )}
            </div>
          </div>

          {/* Прогресс экспорта */}
          {exportStatus !== 'idle' && (
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                {/* Статус текущего шага */}
                <div className="flex items-center gap-3">
                  {exportStatus === 'exporting' && (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {currentStep === 'preparing' && 'Подготовка к экспорту...'}
                          {currentStep === 'processing' && `Обработка графиков (${Math.round(exportProgress)}%)`}
                          {currentStep === 'packaging' && 'Создание архива...'}
                        </div>
                        {currentChart && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {currentChart}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {exportStatus === 'success' && (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-green-500">
                        Экспорт завершен успешно!
                      </span>
                  </>
                )}
                {exportStatus === 'error' && (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="text-sm text-red-500">
                      Ошибка при экспорте
                    </span>
                  </>
                )}
                </div>
              </div>
              <Progress value={exportProgress} className="h-2" />
            </div>
          )}

          {/* Информация */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              Будет создан ZIP архив с {selectedCount} графиками в формате {format.toUpperCase()}.
              Размер архива зависит от качества и количества графиков.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Отмена
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedCount === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Экспортировать ({selectedCount})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}