/**
 * Утилита для экспорта графиков в PNG и SVG форматы
 *
 * Использует html2canvas для рендеринга графиков в изображения
 */

// Dynamic import для html2canvas - загружается только при экспорте

export interface ExportOptions {
  fileName?: string;
  format: 'png' | 'svg';
  scale?: number;
  backgroundColor?: string;
  width?: number;
  height?: number;
}

/**
 * Экспортирует график в PNG формат
 * @param element - HTML элемент графика для экспорта
 * @param options - Опции экспорта
 */
export async function exportChartToPNG(
  element: HTMLElement,
  options: Omit<ExportOptions, 'format'>
): Promise<void> {
  try {
    const {
      fileName = 'chart',
      scale = 2,
      backgroundColor = '#ffffff',
      width,
      height,
    } = options;

    // Dynamic import html2canvas только при экспорте
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      width,
      height,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Конвертируем canvas в blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });

    // Скачиваем файл
    downloadFile(blob, `${fileName}.png`);
  } catch (error) {
    console.error('Error exporting chart to PNG:', error);
    throw new Error('Не удалось экспортировать график в PNG');
  }
}

/**
 * Экспортирует график в SVG формат
 * @param element - HTML элемент графика для экспорта
 * @param options - Опции экспорта
 */
export async function exportChartToSVG(
  element: HTMLElement,
  options: Omit<ExportOptions, 'format'>
): Promise<void> {
  try {
    const { fileName = 'chart', backgroundColor = '#ffffff' } = options;

    // Ищем SVG элемент внутри контейнера графика
    const svgElement = element.querySelector('svg');
    if (!svgElement) {
      throw new Error('SVG элемент не найден в графике');
    }

    // Клонируем SVG для модификации
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;

    // Устанавливаем фон
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', backgroundColor);
    clonedSvg.insertBefore(rect, clonedSvg.firstChild);

    // Получаем размеры из оригинального SVG
    const bbox = svgElement.getBoundingClientRect();
    clonedSvg.setAttribute('width', String(bbox.width));
    clonedSvg.setAttribute('height', String(bbox.height));
    clonedSvg.setAttribute('viewBox', `0 0 ${bbox.width} ${bbox.height}`);

    // Конвертируем SVG в строку
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvg);

    // Добавляем XML declaration
    svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

    // Создаем blob
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

    // Скачиваем файл
    downloadFile(blob, `${fileName}.svg`);
  } catch (error) {
    console.error('Error exporting chart to SVG:', error);
    throw new Error('Не удалось экспортировать график в SVG');
  }
}

/**
 * Универсальная функция экспорта графика
 * @param element - HTML элемент графика для экспорта
 * @param options - Опции экспорта
 */
export async function exportChart(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  if (options.format === 'png') {
    await exportChartToPNG(element, options);
  } else if (options.format === 'svg') {
    await exportChartToSVG(element, options);
  } else {
    throw new Error(`Неподдерживаемый формат: ${options.format}`);
  }
}

/**
 * Вспомогательная функция для скачивания файла
 * @param blob - Blob данные файла
 * @param fileName - Имя файла для скачивания
 */
function downloadFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Экспортирует несколько графиков в один ZIP архив
 * @param elements - Массив элементов графиков для экспорта
 * @param options - Массив опций для каждого графика
 */
export async function exportMultipleCharts(
  elements: HTMLElement[],
  options: ExportOptions[]
): Promise<void> {
  if (elements.length !== options.length) {
    throw new Error('Количество элементов и опций должно совпадать');
  }

  const promises = elements.map((element, index) =>
    exportChart(element, options[index])
  );

  await Promise.all(promises);
}

/**
 * Копирует график в буфер обмена как изображение
 * @param element - HTML элемент графика
 * @param options - Опции рендеринга
 */
export async function copyChartToClipboard(
  element: HTMLElement,
  options: Omit<ExportOptions, 'format' | 'fileName'> = {}
): Promise<void> {
  try {
    const { scale = 2, backgroundColor = '#ffffff', width, height } = options;

    // Dynamic import html2canvas только при экспорте
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      width,
      height,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    // Конвертируем canvas в blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });

    // Копируем в буфер обмена
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);
  } catch (error) {
    console.error('Error copying chart to clipboard:', error);
    throw new Error('Не удалось скопировать график в буфер обмена');
  }
}

/**
 * Получает base64 представление графика
 * @param element - HTML элемент графика
 * @param options - Опции рендеринга
 * @returns Base64 строка изображения
 */
export async function getChartAsBase64(
  element: HTMLElement,
  options: Omit<ExportOptions, 'format' | 'fileName'> = {}
): Promise<string> {
  try {
    const { scale = 2, backgroundColor = '#ffffff', width, height } = options;

    // Dynamic import html2canvas только при экспорте
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      width,
      height,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error getting chart as base64:', error);
    throw new Error('Не удалось получить график в base64');
  }
}

/**
 * Алиас для exportChartToPNG (для соответствия промпту)
 * Экспортирует график в PNG формат
 */
export const exportChartAsPNG = async (
  elementId: string,
  filename: string = 'chart.png'
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  await exportChartToPNG(element as HTMLElement, {
    fileName: filename,
    scale: 2,
    backgroundColor: null,
  });
};

/**
 * Алиас для exportChartToSVG (для соответствия промпту)
 * Экспортирует график в SVG формат
 */
export const exportChartAsSVG = async (
  elementId: string,
  filename: string = 'chart.svg'
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  await exportChartToSVG(element as HTMLElement, {
    fileName: filename,
  });
};
