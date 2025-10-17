/**
 * Web Worker для обработки экспорта больших графиков
 * Выполняет тяжелые операции с canvas в фоновом потоке
 */

interface ExportWorkerMessage {
  type: 'PROCESS_IMAGE' | 'ADD_WATERMARK' | 'CONVERT_FORMAT';
  data: {
    imageData?: ImageData;
    format?: string;
    quality?: number;
    watermark?: {
      text: string;
      position: string;
      opacity: number;
      fontSize: number;
      color: string;
    };
    canvas?: {
      width: number;
      height: number;
    };
  };
}

interface ExportWorkerResponse {
  type: 'SUCCESS' | 'ERROR' | 'PROGRESS';
  data?: Blob | string;
  error?: string;
  progress?: number;
}

// Обработка сообщений от основного потока
self.addEventListener('message', async (event: MessageEvent<ExportWorkerMessage>) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'PROCESS_IMAGE':
        await processImage(data);
        break;

      case 'ADD_WATERMARK':
        await addWatermarkToImage(data);
        break;

      case 'CONVERT_FORMAT':
        await convertImageFormat(data);
        break;

      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const response: ExportWorkerResponse = {
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    self.postMessage(response);
  }
});

/**
 * Обработка изображения с прогрессом
 */
async function processImage(data: any) {
  const { imageData, format, quality } = data;

  // Отправляем прогресс
  self.postMessage({ type: 'PROGRESS', progress: 10 });

  // Создаем OffscreenCanvas для обработки
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  self.postMessage({ type: 'PROGRESS', progress: 30 });

  // Помещаем данные изображения на canvas
  ctx.putImageData(imageData, 0, 0);

  self.postMessage({ type: 'PROGRESS', progress: 60 });

  // Конвертируем в нужный формат
  let blob: Blob;
  switch (format) {
    case 'jpeg':
      blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: quality || 0.9 });
      break;
    case 'webp':
      blob = await canvas.convertToBlob({ type: 'image/webp', quality: quality || 0.9 });
      break;
    default:
      blob = await canvas.convertToBlob({ type: 'image/png' });
  }

  self.postMessage({ type: 'PROGRESS', progress: 90 });

  // Отправляем результат
  const response: ExportWorkerResponse = {
    type: 'SUCCESS',
    data: blob
  };

  self.postMessage({ type: 'PROGRESS', progress: 100 });
  self.postMessage(response);
}

/**
 * Добавление водяного знака на изображение
 */
async function addWatermarkToImage(data: any) {
  const { imageData, watermark } = data;

  if (!watermark) return;

  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Помещаем оригинальное изображение
  ctx.putImageData(imageData, 0, 0);

  // Настройки водяного знака
  ctx.font = `${watermark.fontSize}px Arial`;
  ctx.fillStyle = watermark.color || '#000000';
  ctx.globalAlpha = watermark.opacity || 0.5;

  // Определяем позицию
  const textMetrics = ctx.measureText(watermark.text);
  let x = 0, y = 0;

  switch (watermark.position) {
    case 'top-left':
      x = 20;
      y = watermark.fontSize + 20;
      break;
    case 'top-right':
      x = canvas.width - textMetrics.width - 20;
      y = watermark.fontSize + 20;
      break;
    case 'bottom-left':
      x = 20;
      y = canvas.height - 20;
      break;
    case 'bottom-right':
      x = canvas.width - textMetrics.width - 20;
      y = canvas.height - 20;
      break;
    case 'center':
      x = (canvas.width - textMetrics.width) / 2;
      y = canvas.height / 2;
      break;
  }

  // Рисуем водяной знак
  ctx.fillText(watermark.text, x, y);

  // Получаем новые данные изображения
  const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const response: ExportWorkerResponse = {
    type: 'SUCCESS',
    data: newImageData as any
  };

  self.postMessage(response);
}

/**
 * Конвертация формата изображения
 */
async function convertImageFormat(data: any) {
  const { imageData, format, quality } = data;

  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.putImageData(imageData, 0, 0);

  let mimeType = 'image/png';
  let qualityValue = 1;

  switch (format) {
    case 'jpeg':
      mimeType = 'image/jpeg';
      qualityValue = quality || 0.9;
      break;
    case 'webp':
      mimeType = 'image/webp';
      qualityValue = quality || 0.9;
      break;
  }

  const blob = await canvas.convertToBlob({ type: mimeType, quality: qualityValue });

  const response: ExportWorkerResponse = {
    type: 'SUCCESS',
    data: blob
  };

  self.postMessage(response);
}

// Экспорт для TypeScript
export {};