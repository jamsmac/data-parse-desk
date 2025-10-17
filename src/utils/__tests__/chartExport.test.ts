/**
 * Unit тесты для утилиты экспорта графиков
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportChartToPNG,
  exportChartToSVG,
  exportChart,
  copyChartToClipboard,
  getChartAsBase64,
} from '../chartExport';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.toBlob = vi.fn((callback) => {
      const blob = new Blob(['fake-image-data'], { type: 'image/png' });
      callback(blob);
    });
    canvas.toDataURL = vi.fn(() => 'data:image/png;base64,fake-base64-data');
    return Promise.resolve(canvas);
  }),
}));

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
global.URL.revokeObjectURL = vi.fn();

// Mock clipboard API and ClipboardItem
global.ClipboardItem = vi.fn((data: Record<string, Blob>) => data) as unknown as typeof ClipboardItem;
Object.assign(navigator, {
  clipboard: {
    write: vi.fn(() => Promise.resolve()),
  },
});

describe('chartExport', () => {
  let mockElement: HTMLElement;
  let mockLink: HTMLAnchorElement;

  beforeEach(() => {
    // Создаем mock элемент
    mockElement = document.createElement('div');
    mockElement.innerHTML = '<svg width="800" height="600"></svg>';
    document.body.appendChild(mockElement);

    // Mock для createElement('a')
    mockLink = document.createElement('a');
    mockLink.click = vi.fn();

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'a') {
        return mockLink;
      }
      return originalCreateElement(tagName);
    });

    vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
      if (node === mockLink) {
        return mockLink;
      }
      return node;
    });

    vi.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => {
      if (node === mockLink) {
        return mockLink;
      }
      return node;
    });
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
    vi.clearAllMocks();
  });

  describe('exportChartToPNG', () => {
    it('должен экспортировать график в PNG формат', async () => {
      await exportChartToPNG(mockElement, {
        fileName: 'test-chart',
        scale: 2,
        backgroundColor: '#ffffff',
      });

      expect(mockLink.download).toBe('test-chart.png');
      expect(mockLink.click).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('должен использовать значения по умолчанию', async () => {
      await exportChartToPNG(mockElement, {});

      expect(mockLink.download).toBe('chart.png');
    });

    it('должен обрабатывать ошибки', async () => {
      // Временно заменяем html2canvas на функцию, которая бросает ошибку
      const html2canvas = await import('html2canvas');
      vi.mocked(html2canvas.default).mockRejectedValueOnce(new Error('Canvas error'));

      const errorElement = document.createElement('div');

      await expect(exportChartToPNG(errorElement, {})).rejects.toThrow(
        'Не удалось экспортировать график в PNG'
      );
    });
  });

  describe('exportChartToSVG', () => {
    it('должен экспортировать график в SVG формат', async () => {
      await exportChartToSVG(mockElement, {
        fileName: 'test-chart',
        backgroundColor: '#ffffff',
      });

      expect(mockLink.download).toBe('test-chart.svg');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('должен добавлять фоновый прямоугольник к SVG', async () => {
      await exportChartToSVG(mockElement, {
        backgroundColor: '#ff0000',
      });

      // Проверяем, что создан blob с SVG данными
      expect(mockLink.href).toBe('blob:fake-url');
    });

    it('должен обрабатывать отсутствие SVG элемента', async () => {
      const noSvgElement = document.createElement('div');
      // Не добавляем SVG элемент

      await expect(exportChartToSVG(noSvgElement, {})).rejects.toThrow(
        'Не удалось экспортировать график в SVG'
      );
    });
  });

  describe('exportChart', () => {
    it('должен вызывать exportChartToPNG для PNG формата', async () => {
      await exportChart(mockElement, {
        fileName: 'test',
        format: 'png',
      });

      expect(mockLink.download).toBe('test.png');
    });

    it('должен вызывать exportChartToSVG для SVG формата', async () => {
      await exportChart(mockElement, {
        fileName: 'test',
        format: 'svg',
      });

      expect(mockLink.download).toBe('test.svg');
    });

    it('должен выбрасывать ошибку для неподдерживаемого формата', async () => {
      await expect(
        exportChart(mockElement, {
          fileName: 'test',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          format: 'pdf' as any,
        })
      ).rejects.toThrow('Неподдерживаемый формат: pdf');
    });
  });

  describe('copyChartToClipboard', () => {
    it('должен копировать график в буфер обмена', async () => {
      await copyChartToClipboard(mockElement, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      expect(navigator.clipboard.write).toHaveBeenCalled();
    });

    it('должен использовать значения по умолчанию', async () => {
      await copyChartToClipboard(mockElement);

      expect(navigator.clipboard.write).toHaveBeenCalled();
    });

    it('должен обрабатывать ошибки', async () => {
      vi.spyOn(navigator.clipboard, 'write').mockRejectedValueOnce(
        new Error('Clipboard error')
      );

      await expect(copyChartToClipboard(mockElement)).rejects.toThrow(
        'Не удалось скопировать график в буфер обмена'
      );
    });
  });

  describe('getChartAsBase64', () => {
    it('должен возвращать base64 представление графика', async () => {
      const base64 = await getChartAsBase64(mockElement, {
        scale: 2,
        backgroundColor: '#ffffff',
      });

      expect(base64).toBe('data:image/png;base64,fake-base64-data');
    });

    it('должен использовать значения по умолчанию', async () => {
      const base64 = await getChartAsBase64(mockElement);

      expect(base64).toBe('data:image/png;base64,fake-base64-data');
    });

    it('должен обрабатывать ошибки', async () => {
      // Временно заменяем html2canvas на функцию, которая бросает ошибку
      const html2canvas = await import('html2canvas');
      vi.mocked(html2canvas.default).mockRejectedValueOnce(new Error('Canvas error'));

      const errorElement = document.createElement('div');

      await expect(getChartAsBase64(errorElement)).rejects.toThrow(
        'Не удалось получить график в base64'
      );
    });
  });
});
