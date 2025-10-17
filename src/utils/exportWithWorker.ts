/**
 * Утилита для экспорта графиков с использованием Web Workers
 * Обеспечивает высокую производительность для больших графиков
 */

import { ImageFormat, WatermarkOptions } from './chartExportAdvanced';

interface WorkerExportOptions {
  element: HTMLElement;
  format?: ImageFormat;
  quality?: number;
  scale?: number;
  watermark?: WatermarkOptions;
  onProgress?: (progress: number) => void;
}

/**
 * Проверка, следует ли использовать Web Worker
 * (для больших графиков > 1000x1000 px)
 */
export function shouldUseWorker(width: number, height: number): boolean {
  return width * height > 1000000; // 1 миллион пикселей
}

/**
 * Создание и инициализация Web Worker
 */
function createExportWorker(): Worker {
  return new Worker(
    new URL('../workers/exportWorker.ts', import.meta.url),
    { type: 'module' }
  );
}

/**
 * Экспорт графика с использованием Web Worker
 */
export async function exportWithWorker(options: WorkerExportOptions): Promise<Blob> {
  const { element, format = 'png', quality = 1, scale = 2, watermark, onProgress } = options;

  return new Promise((resolve, reject) => {
    // Создаем worker
    const worker = createExportWorker();

    // Обработка сообщений от worker
    worker.addEventListener('message', (event) => {
      const { type, data, error, progress } = event.data;

      switch (type) {
        case 'SUCCESS':
          worker.terminate();
          resolve(data as Blob);
          break;

        case 'ERROR':
          worker.terminate();
          reject(new Error(error || 'Worker error'));
          break;

        case 'PROGRESS':
          if (onProgress && typeof progress === 'number') {
            onProgress(progress);
          }
          break;
      }
    });

    // Обработка ошибок worker
    worker.addEventListener('error', (error) => {
      worker.terminate();
      reject(error);
    });

    // Получаем изображение из элемента
    getImageDataFromElement(element, scale)
      .then((imageData) => {
        // Отправляем данные в worker
        worker.postMessage({
          type: 'PROCESS_IMAGE',
          data: {
            imageData,
            format,
            quality,
            watermark
          }
        });
      })
      .catch((error) => {
        worker.terminate();
        reject(error);
      });
  });
}

/**
 * Получение ImageData из HTML элемента
 */
async function getImageDataFromElement(
  element: HTMLElement,
  scale: number = 2
): Promise<ImageData> {
  // Динамический импорт html2canvas для уменьшения размера бандла
  const html2canvas = (await import('html2canvas')).default;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null
  });

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Batch экспорт с использованием Web Workers
 * Обрабатывает несколько графиков параллельно
 */
export async function batchExportWithWorkers(
  charts: Array<{ element: HTMLElement; name: string }>,
  options: {
    format?: ImageFormat;
    quality?: number;
    watermark?: WatermarkOptions;
    onProgress?: (current: number, total: number) => void;
    maxConcurrent?: number;
  } = {}
): Promise<Map<string, Blob>> {
  const {
    format = 'png',
    quality = 1,
    watermark,
    onProgress,
    maxConcurrent = 3 // Максимум 3 воркера одновременно
  } = options;

  const results = new Map<string, Blob>();
  const total = charts.length;
  let completed = 0;

  // Функция для обработки одного графика
  const processChart = async (chart: { element: HTMLElement; name: string }) => {
    const { width, height } = chart.element.getBoundingClientRect();

    // Используем воркер только для больших графиков
    if (shouldUseWorker(width, height)) {
      const blob = await exportWithWorker({
        element: chart.element,
        format,
        quality,
        watermark,
        onProgress: (progress) => {
          // Обновляем общий прогресс
          const chartProgress = (completed + progress / 100) / total;
          onProgress?.(chartProgress * 100, 100);
        }
      });
      results.set(chart.name, blob);
    } else {
      // Для маленьких графиков используем обычный экспорт
      const { exportChartAdvanced } = await import('./chartExportAdvanced');
      await exportChartAdvanced(chart.element, {
        format,
        quality,
        watermark,
        fileName: chart.name
      });
      // Создаем заглушку Blob для совместимости
      results.set(chart.name, new Blob());
    }

    completed++;
    onProgress?.(completed, total);
  };

  // Обрабатываем графики пакетами
  const chunks: Array<Array<{ element: HTMLElement; name: string }>> = [];
  for (let i = 0; i < charts.length; i += maxConcurrent) {
    chunks.push(charts.slice(i, i + maxConcurrent));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map(processChart));
  }

  return results;
}

/**
 * Оптимизированный экспорт с автоматическим выбором метода
 */
export async function smartExport(
  element: HTMLElement,
  options: {
    format?: ImageFormat;
    quality?: number;
    watermark?: WatermarkOptions;
    fileName?: string;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<void> {
  const { width, height } = element.getBoundingClientRect();

  // Автоматически выбираем метод экспорта
  if (shouldUseWorker(width, height)) {

    const blob = await exportWithWorker({
      element,
      format: options.format,
      quality: options.quality,
      watermark: options.watermark,
      onProgress: options.onProgress
    });

    // Скачиваем файл
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${options.fileName || 'chart'}.${options.format || 'png'}`;
    a.click();
    URL.revokeObjectURL(url);
  } else {

    const { exportChartAdvanced } = await import('./chartExportAdvanced');
    await exportChartAdvanced(element, options);
  }
}