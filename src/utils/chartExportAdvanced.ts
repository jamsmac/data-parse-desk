/**
 * Расширенная утилита для экспорта графиков
 * Поддерживает: PNG, JPEG, WebP, SVG форматы
 * Включает: watermark, настройки качества, пользовательские размеры, batch экспорт
 */

import html2canvas, { Options as Html2CanvasOptions } from 'html2canvas';

// Типы для расширенного экспорта
export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'svg';
export type QualityLevel = 'low' | 'medium' | 'high' | 'custom';
export type WatermarkPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export interface WatermarkOptions {
  text?: string;
  imageUrl?: string;
  position?: WatermarkPosition;
  opacity?: number;
  fontSize?: number;
  fontColor?: string;
  fontFamily?: string;
  rotation?: number;
}

export interface AdvancedExportOptions {
  fileName?: string;
  format?: ImageFormat;
  quality?: QualityLevel | number; // 1-3 для QualityLevel или 0-1 для JPEG/WebP
  scale?: number;
  backgroundColor?: string | null;
  width?: number;
  height?: number;
  watermark?: WatermarkOptions;
  preserveAspectRatio?: boolean;
}

export interface BatchExportOptions {
  format?: ImageFormat;
  quality?: QualityLevel | number;
  watermark?: WatermarkOptions;
  zipFileName?: string;
  onProgress?: (current: number, total: number) => void;
}

// Мапинг качества на scale
const QUALITY_SCALE_MAP: Record<QualityLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  custom: 2
};

// Утилита для загрузки zip библиотеки динамически
async function loadJSZip() {
  const JSZip = await import('jszip');
  return JSZip.default;
}

/**
 * Добавляет водяной знак на canvas
 */
function addWatermark(
  canvas: HTMLCanvasElement,
  options: WatermarkOptions
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const {
    text = 'VHData Platform',
    position = 'bottom-right',
    opacity = 0.5,
    fontSize = 16,
    fontColor = '#000000',
    fontFamily = 'Arial',
    rotation = 0
  } = options;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = fontColor;

  // Вычисляем позицию
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  const padding = 20;

  let x = padding;
  let y = padding + textHeight;

  switch (position) {
    case 'top-right':
      x = canvas.width - textWidth - padding;
      y = padding + textHeight;
      break;
    case 'bottom-left':
      x = padding;
      y = canvas.height - padding;
      break;
    case 'bottom-right':
      x = canvas.width - textWidth - padding;
      y = canvas.height - padding;
      break;
    case 'center':
      x = (canvas.width - textWidth) / 2;
      y = canvas.height / 2;
      break;
  }

  // Применяем поворот если нужно
  if (rotation !== 0) {
    ctx.translate(x + textWidth / 2, y - textHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.fillText(text, -textWidth / 2, textHeight / 2);
  } else {
    ctx.fillText(text, x, y);
  }

  ctx.restore();

  // Если есть изображение водяного знака
  if (options.imageUrl) {
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.globalAlpha = opacity;

      const imgWidth = 100;
      const imgHeight = (img.height / img.width) * imgWidth;

      let imgX = padding;
      let imgY = padding;

      switch (position) {
        case 'top-right':
          imgX = canvas.width - imgWidth - padding;
          break;
        case 'bottom-left':
          imgY = canvas.height - imgHeight - padding;
          break;
        case 'bottom-right':
          imgX = canvas.width - imgWidth - padding;
          imgY = canvas.height - imgHeight - padding;
          break;
        case 'center':
          imgX = (canvas.width - imgWidth) / 2;
          imgY = (canvas.height - imgHeight) / 2;
          break;
      }

      ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
      ctx.restore();
    };
    img.src = options.imageUrl;
  }
}

/**
 * Конвертирует canvas в различные форматы изображений
 */
async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: ImageFormat,
  quality: number = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (format === 'svg') {
      reject(new Error('SVG format requires different handling'));
      return;
    }

    const mimeType = format === 'jpeg' ? 'image/jpeg' :
                     format === 'webp' ? 'image/webp' : 'image/png';

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Расширенный экспорт графика с поддержкой всех форматов
 */
export async function exportChartAdvanced(
  element: HTMLElement,
  options: AdvancedExportOptions = {}
): Promise<void> {
  const {
    fileName = 'chart',
    format = 'png',
    quality = 'medium',
    backgroundColor = '#ffffff',
    watermark,
    preserveAspectRatio = true
  } = options;

  // Определяем scale на основе quality
  let scale = options.scale;
  if (!scale && typeof quality === 'string') {
    scale = QUALITY_SCALE_MAP[quality as QualityLevel];
  } else if (!scale) {
    scale = 2;
  }

  // SVG обрабатывается отдельно
  if (format === 'svg') {
    await exportChartToSVGAdvanced(element, options);
    return;
  }

  try {
    // Настройки для html2canvas
    const html2canvasOptions: Html2CanvasOptions = {
      scale,
      backgroundColor,
      logging: false,
      useCORS: true,
      allowTaint: true
    };

    // Добавляем пользовательские размеры если указаны
    if (options.width) {
      html2canvasOptions.width = options.width;
    }
    if (options.height) {
      html2canvasOptions.height = options.height;
    }

    // Рендерим элемент в canvas
    const canvas = await html2canvas(element, html2canvasOptions);

    // Добавляем водяной знак если нужно
    if (watermark) {
      addWatermark(canvas, watermark);
    }

    // Определяем качество для JPEG/WebP
    let compressionQuality = 0.9;
    if (typeof quality === 'number') {
      compressionQuality = Math.max(0, Math.min(1, quality));
    } else if (quality === 'low') {
      compressionQuality = 0.6;
    } else if (quality === 'high') {
      compressionQuality = 1;
    }

    // Конвертируем в нужный формат
    const blob = await canvasToBlob(canvas, format, compressionQuality);

    // Скачиваем файл
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${fileName}.${format}`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting chart:', error);
    throw new Error(`Не удалось экспортировать график: ${error}`);
  }
}

/**
 * Экспорт в SVG с водяным знаком
 */
export async function exportChartToSVGAdvanced(
  element: HTMLElement,
  options: AdvancedExportOptions = {}
): Promise<void> {
  const { fileName = 'chart', watermark } = options;

  const svgElement = element.querySelector('svg');
  if (!svgElement) {
    throw new Error('SVG element not found');
  }

  // Клонируем SVG для модификации
  const svgClone = svgElement.cloneNode(true) as SVGElement;

  // Добавляем водяной знак в SVG
  if (watermark) {
    const text = watermark.text || 'VHData Platform';
    const textElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');

    textElement.setAttribute('x', '95%');
    textElement.setAttribute('y', '95%');
    textElement.setAttribute('text-anchor', 'end');
    textElement.setAttribute('fill', watermark.fontColor || '#000000');
    textElement.setAttribute('opacity', String(watermark.opacity || 0.5));
    textElement.setAttribute('font-size', String(watermark.fontSize || 16));
    textElement.setAttribute('font-family', watermark.fontFamily || 'Arial');

    if (watermark.rotation) {
      const bbox = svgClone.getBBox();
      textElement.setAttribute(
        'transform',
        `rotate(${watermark.rotation} ${bbox.width * 0.95} ${bbox.height * 0.95})`
      );
    }

    textElement.textContent = text;
    svgClone.appendChild(textElement);
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgClone);

  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = `${fileName}.svg`;
  link.href = url;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Batch экспорт нескольких графиков в ZIP архив
 */
export async function batchExportCharts(
  elements: Array<{ element: HTMLElement; name: string }>,
  options: BatchExportOptions = {}
): Promise<void> {
  const {
    format = 'png',
    quality = 'medium',
    watermark,
    zipFileName = 'charts',
    onProgress
  } = options;

  try {
    // Загружаем JSZip динамически
    const JSZip = await loadJSZip();
    const zip = new JSZip();

    const total = elements.length;

    for (let i = 0; i < total; i++) {
      const { element, name } = elements[i];

      // Уведомляем о прогрессе
      if (onProgress) {
        onProgress(i + 1, total);
      }

      // Рендерим в canvas
      const canvas = await html2canvas(element, {
        scale: typeof quality === 'string' ? QUALITY_SCALE_MAP[quality] : 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true
      });

      // Добавляем водяной знак
      if (watermark) {
        addWatermark(canvas, watermark);
      }

      // Конвертируем в blob
      let blob: Blob;
      if (format === 'svg') {
        // Для SVG используем другой подход
        const svgElement = element.querySelector('svg');
        if (svgElement) {
          const serializer = new XMLSerializer();
          const svgString = serializer.serializeToString(svgElement);
          blob = new Blob([svgString], { type: 'image/svg+xml' });
        } else {
          // Если SVG не найден, экспортируем как PNG
          blob = await canvasToBlob(canvas, 'png', 0.9);
        }
      } else {
        const compressionQuality = typeof quality === 'number' ? quality : 0.9;
        blob = await canvasToBlob(canvas, format, compressionQuality);
      }

      // Добавляем в архив
      zip.file(`${name}.${format}`, blob);
    }

    // Генерируем ZIP файл
    const content = await zip.generateAsync({ type: 'blob' });

    // Скачиваем архив
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.download = `${zipFileName}.zip`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error batch exporting charts:', error);
    throw new Error(`Не удалось выполнить batch экспорт: ${error}`);
  }
}

/**
 * Создает превью экспорта перед скачиванием
 */
export async function previewExport(
  element: HTMLElement,
  options: AdvancedExportOptions = {}
): Promise<string> {
  const {
    format = 'png',
    quality = 'medium',
    backgroundColor = '#ffffff',
    watermark
  } = options;

  const scale = typeof quality === 'string' ? QUALITY_SCALE_MAP[quality] : 2;

  try {
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: options.width,
      height: options.height
    });

    if (watermark) {
      addWatermark(canvas, watermark);
    }

    // Возвращаем base64 для превью
    return canvas.toDataURL(`image/${format}`,
      typeof quality === 'number' ? quality : 0.9);
  } catch (error) {
    console.error('Error creating preview:', error);
    throw new Error(`Не удалось создать превью: ${error}`);
  }
}

// Экспорт старых функций для обратной совместимости
export { exportChartToPNG, exportChartToSVG } from './chartExport';