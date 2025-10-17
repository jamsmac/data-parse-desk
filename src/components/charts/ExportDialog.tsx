/**
 * Диалог с расширенными настройками экспорта графиков
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
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Download, FileImage, FileCode, FileType, Package2, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import {
  exportChartAdvanced,
  previewExport,
  type ImageFormat,
  type QualityLevel,
  type WatermarkPosition,
  type AdvancedExportOptions,
} from '@/utils/chartExportAdvanced';
import { ExportTemplateSelector } from './ExportTemplateSelector';
import { ExportTemplate } from '@/utils/exportTemplates';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  element: HTMLElement | null;
  defaultFileName?: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  element,
  defaultFileName = 'chart',
}: ExportDialogProps) {
  // Состояния для настроек
  const [format, setFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState<QualityLevel>('medium');
  const [customQuality, setCustomQuality] = useState<number>(2);
  const [fileName, setFileName] = useState(defaultFileName);
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Настройки размера
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);

  // Настройки водяного знака
  const [useWatermark, setUseWatermark] = useState(false);
  const [watermarkText, setWatermarkText] = useState('VHData Platform');
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
  const [watermarkSize, setWatermarkSize] = useState(16);

  // Настройки фона
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [transparentBackground, setTransparentBackground] = useState(false);

  // Генерация превью
  const handlePreview = async () => {
    if (!element) return;

    setIsLoading(true);
    try {
      const options: AdvancedExportOptions = {
        format,
        quality: quality === 'custom' ? customQuality : quality,
        backgroundColor: transparentBackground ? null : backgroundColor,
        width: useCustomSize ? customWidth : undefined,
        height: useCustomSize ? customHeight : undefined,
        watermark: useWatermark
          ? {
              text: watermarkText,
              position: watermarkPosition,
              opacity: watermarkOpacity,
              fontSize: watermarkSize,
            }
          : undefined,
      };

      const dataUrl = await previewExport(element, options);
      setPreviewUrl(dataUrl);
    } catch (error) {
      toast.error('Ошибка создания превью');
    } finally {
      setIsLoading(false);
    }
  };

  // Применение шаблона
  const handleSelectTemplate = (template: ExportTemplate) => {
    setFormat(template.format);

    if (typeof template.quality === 'string') {
      setQuality(template.quality as QualityLevel);
    } else {
      setQuality('custom');
      setCustomQuality(template.quality * 3);
    }

    if (template.watermark) {
      setUseWatermark(true);
      setWatermarkText(template.watermark.text || 'VHData Platform');
      setWatermarkPosition((template.watermark.position || 'bottom-right') as WatermarkPosition);
      setWatermarkOpacity(template.watermark.opacity || 0.5);
      setWatermarkSize(template.watermark.fontSize || 20);
    } else {
      setUseWatermark(false);
    }

    if (template.customSize) {
      setUseCustomSize(true);
      setCustomWidth(template.customSize.width);
      setCustomHeight(template.customSize.height);
    } else {
      setUseCustomSize(false);
    }

    toast.success(`Шаблон "${template.name}" применен`);
  };

  // Экспорт с выбранными настройками
  const handleExport = async () => {
    if (!element) return;

    setIsLoading(true);
    try {
      const options: AdvancedExportOptions = {
        fileName,
        format,
        quality: quality === 'custom' ? customQuality / 3 : quality,
        scale: quality === 'custom' ? customQuality : undefined,
        backgroundColor: transparentBackground ? null : backgroundColor,
        width: useCustomSize ? customWidth : undefined,
        height: useCustomSize ? customHeight : undefined,
        watermark: useWatermark
          ? {
              text: watermarkText,
              position: watermarkPosition,
              opacity: watermarkOpacity,
              fontSize: watermarkSize,
            }
          : undefined,
      };

      await exportChartAdvanced(element, options);
      toast.success(`График экспортирован в ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Ошибка экспорта графика');
    } finally {
      setIsLoading(false);
    }
  };

  const formatIcons = {
    png: <FileImage className="h-4 w-4" />,
    jpeg: <FileImage className="h-4 w-4" />,
    webp: <FileImage className="h-4 w-4" />,
    svg: <FileCode className="h-4 w-4" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Настройки экспорта</DialogTitle>
          <DialogDescription>
            Настройте параметры экспорта графика
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="templates">
              <Bookmark className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="general">Общие</TabsTrigger>
            <TabsTrigger value="quality">Качество</TabsTrigger>
            <TabsTrigger value="watermark">Водяной знак</TabsTrigger>
            <TabsTrigger value="preview">Превью</TabsTrigger>
          </TabsList>

          {/* Вкладка шаблонов */}
          <TabsContent value="templates" className="space-y-4 mt-4">
            <ExportTemplateSelector
              onSelectTemplate={handleSelectTemplate}
              currentSettings={{
                format,
                quality,
                watermark: useWatermark
                  ? {
                      text: watermarkText,
                      position: watermarkPosition,
                      opacity: watermarkOpacity,
                      fontSize: watermarkSize,
                    }
                  : undefined,
                scale: quality === 'custom' ? customQuality : undefined,
              }}
            />
          </TabsContent>

          <TabsContent value="general" className="space-y-4 mt-4">
            {/* Имя файла */}
            <div className="space-y-2">
              <Label htmlFor="fileName">Имя файла</Label>
              <Input
                id="fileName"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Введите имя файла"
              />
            </div>

            {/* Формат */}
            <div className="space-y-2">
              <Label htmlFor="format">Формат</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ImageFormat)}>
                <SelectTrigger id="format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="png">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      PNG (без потерь)
                    </div>
                  </SelectItem>
                  <SelectItem value="jpeg">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      JPEG (с сжатием)
                    </div>
                  </SelectItem>
                  <SelectItem value="webp">
                    <div className="flex items-center gap-2">
                      <FileImage className="h-4 w-4" />
                      WebP (современный)
                    </div>
                  </SelectItem>
                  <SelectItem value="svg">
                    <div className="flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      SVG (векторный)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Размер */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customSize">Пользовательский размер</Label>
                <Switch
                  id="customSize"
                  checked={useCustomSize}
                  onCheckedChange={setUseCustomSize}
                />
              </div>

              {useCustomSize && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">Ширина (px)</Label>
                    <Input
                      id="width"
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Высота (px)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Фон */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="transparent">Прозрачный фон</Label>
                <Switch
                  id="transparent"
                  checked={transparentBackground}
                  onCheckedChange={setTransparentBackground}
                  disabled={format === 'jpeg'}
                />
              </div>

              {!transparentBackground && (
                <div className="flex items-center gap-2">
                  <Label htmlFor="bgColor">Цвет фона</Label>
                  <Input
                    id="bgColor"
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    placeholder="#ffffff"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="quality" className="space-y-4 mt-4">
            {/* Качество */}
            <div className="space-y-2">
              <Label htmlFor="quality">Уровень качества</Label>
              <Select value={quality} onValueChange={(v) => setQuality(v as QualityLevel)}>
                <SelectTrigger id="quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      Низкое (1x, быстро)
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      Среднее (2x, баланс)
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      Высокое (3x, медленно)
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      Пользовательское
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {quality === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="customQuality">
                  Масштаб: {customQuality}x
                </Label>
                <Slider
                  id="customQuality"
                  value={[customQuality]}
                  onValueChange={([v]) => setCustomQuality(v)}
                  min={1}
                  max={3}
                  step={0.5}
                />
              </div>
            )}

            {(format === 'jpeg' || format === 'webp') && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Для форматов JPEG и WebP качество также влияет на степень сжатия.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="watermark" className="space-y-4 mt-4">
            {/* Водяной знак */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="watermark">Добавить водяной знак</Label>
                <Switch
                  id="watermark"
                  checked={useWatermark}
                  onCheckedChange={setUseWatermark}
                />
              </div>

              {useWatermark && (
                <>
                  {/* Превью водяного знака в реальном времени */}
                  <div className="relative border rounded-lg p-3 bg-muted/10 mb-4">
                    <div className="text-xs text-muted-foreground mb-2 font-medium">Превью водяного знака:</div>
                    <div className="relative w-full h-32 bg-white rounded-lg overflow-hidden shadow-inner">
                      {/* Фоновый паттерн для визуализации */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />

                      {/* Сетка для ориентации */}
                      <svg className="absolute inset-0 w-full h-full opacity-10">
                        <defs>
                          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="gray" strokeWidth="0.5"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                      </svg>

                      {/* Водяной знак */}
                      <div
                        className="absolute text-gray-700 font-medium transition-all duration-300 select-none"
                        style={{
                          opacity: watermarkOpacity,
                          fontSize: `${Math.max(10, watermarkSize / 3)}px`,
                          fontFamily: 'Arial, sans-serif',
                          textShadow: '0 1px 3px rgba(255,255,255,0.9)',
                          ...(watermarkPosition === 'top-left' && { top: '12px', left: '12px' }),
                          ...(watermarkPosition === 'top-right' && { top: '12px', right: '12px' }),
                          ...(watermarkPosition === 'bottom-left' && { bottom: '12px', left: '12px' }),
                          ...(watermarkPosition === 'bottom-right' && { bottom: '12px', right: '12px' }),
                          ...(watermarkPosition === 'center' && {
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                          }),
                        }}
                      >
                        {watermarkText || 'Пример водяного знака'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="watermarkText">Текст</Label>
                    <Input
                      id="watermarkText"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="Введите текст водяного знака"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="watermarkPosition">Позиция</Label>
                    <Select
                      value={watermarkPosition}
                      onValueChange={(v) => setWatermarkPosition(v as WatermarkPosition)}
                    >
                      <SelectTrigger id="watermarkPosition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">Сверху слева</SelectItem>
                        <SelectItem value="top-right">Сверху справа</SelectItem>
                        <SelectItem value="bottom-left">Снизу слева</SelectItem>
                        <SelectItem value="bottom-right">Снизу справа</SelectItem>
                        <SelectItem value="center">По центру</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="watermarkOpacity">
                      Прозрачность: {Math.round(watermarkOpacity * 100)}%
                    </Label>
                    <Slider
                      id="watermarkOpacity"
                      value={[watermarkOpacity]}
                      onValueChange={([v]) => setWatermarkOpacity(v)}
                      min={0.1}
                      max={1}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="watermarkSize">
                      Размер шрифта: {watermarkSize}px
                    </Label>
                    <Slider
                      id="watermarkSize"
                      value={[watermarkSize]}
                      onValueChange={([v]) => setWatermarkSize(v)}
                      min={10}
                      max={48}
                      step={2}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-4">
            <div className="space-y-4">
              <Button
                onClick={handlePreview}
                disabled={isLoading || !element}
                className="w-full"
                variant="outline"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileType className="mr-2 h-4 w-4" />
                )}
                Сгенерировать превью
              </Button>

              {previewUrl && (
                <div className="border rounded-lg p-2 bg-muted/50">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto rounded"
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleExport} disabled={isLoading || !element}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              formatIcons[format]
            )}
            Экспортировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}