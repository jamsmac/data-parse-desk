# Руководство по экспорту графиков

Эта документация описывает функциональность экспорта графиков в PNG и SVG форматы в VHData Platform.

## Содержание

- [Обзор](#обзор)
- [Утилита chartExport](#утилита-chartexport)
- [Использование в компонентах](#использование-в-компонентах)
- [API Reference](#api-reference)
- [Примеры использования](#примеры-использования)

## Обзор

VHData Platform предоставляет возможность экспортировать графики и дашборды в следующие форматы:

- **PNG** - растровое изображение высокого качества (с настраиваемым разрешением)
- **SVG** - векторное изображение для масштабирования без потери качества

### Компоненты с поддержкой экспорта

1. **ChartBuilder** - конструктор графиков
2. **DashboardBuilder** - конструктор дашбордов

## Утилита chartExport

### Расположение

`src/utils/chartExport.ts`

### Зависимости

- **html2canvas** - библиотека для рендеринга HTML в canvas

### Установка

```bash
npm install html2canvas
```

## Использование в компонентах

### ChartBuilder

В компоненте ChartBuilder кнопка экспорта доступна в панели предпросмотра графика:

1. Настройте график (оси X и Y)
2. Нажмите кнопку "Экспорт" в правом верхнем углу панели предпросмотра
3. Выберите формат: PNG или SVG
4. Файл автоматически скачается

### DashboardBuilder

В компоненте DashboardBuilder экспорт доступен в режиме превью:

1. Создайте дашборд с виджетами
2. Нажмите кнопку "Превью"
3. В режиме превью нажмите кнопку "Экспорт"
4. Выберите формат: PNG или SVG
5. Файл автоматически скачается

## API Reference

### exportChart

Универсальная функция для экспорта графика в указанный формат.

```typescript
function exportChart(
  element: HTMLElement,
  options: ExportOptions
): Promise<void>

interface ExportOptions {
  fileName?: string;        // Имя файла (по умолчанию: 'chart')
  format: 'png' | 'svg';    // Формат экспорта
  scale?: number;           // Масштаб для PNG (по умолчанию: 2)
  backgroundColor?: string; // Цвет фона (по умолчанию: '#ffffff')
  width?: number;           // Ширина (опционально)
  height?: number;          // Высота (опционально)
}
```

### exportChartToPNG

Экспортирует график в PNG формат.

```typescript
function exportChartToPNG(
  element: HTMLElement,
  options: Omit<ExportOptions, 'format'>
): Promise<void>
```

**Параметры:**
- `element` - HTML элемент графика
- `options` - опции экспорта (без поля format)

**Пример:**

```typescript
await exportChartToPNG(chartRef.current, {
  fileName: 'sales-chart',
  scale: 2,
  backgroundColor: '#ffffff',
});
```

### exportChartToSVG

Экспортирует график в SVG формат.

```typescript
function exportChartToSVG(
  element: HTMLElement,
  options: Omit<ExportOptions, 'format'>
): Promise<void>
```

**Параметры:**
- `element` - HTML элемент графика
- `options` - опции экспорта (без поля format)

**Пример:**

```typescript
await exportChartToSVG(chartRef.current, {
  fileName: 'sales-chart',
  backgroundColor: '#ffffff',
});
```

### copyChartToClipboard

Копирует график в буфер обмена как изображение PNG.

```typescript
function copyChartToClipboard(
  element: HTMLElement,
  options?: Omit<ExportOptions, 'format' | 'fileName'>
): Promise<void>
```

**Пример:**

```typescript
await copyChartToClipboard(chartRef.current, {
  scale: 2,
  backgroundColor: '#ffffff',
});
```

### getChartAsBase64

Получает base64 представление графика.

```typescript
function getChartAsBase64(
  element: HTMLElement,
  options?: Omit<ExportOptions, 'format' | 'fileName'>
): Promise<string>
```

**Пример:**

```typescript
const base64 = await getChartAsBase64(chartRef.current, {
  scale: 2,
  backgroundColor: '#ffffff',
});
console.log(base64); // data:image/png;base64,...
```

### exportMultipleCharts

Экспортирует несколько графиков одновременно.

```typescript
function exportMultipleCharts(
  elements: HTMLElement[],
  options: ExportOptions[]
): Promise<void>
```

**Пример:**

```typescript
await exportMultipleCharts(
  [chart1Ref.current, chart2Ref.current],
  [
    { fileName: 'sales', format: 'png', scale: 2 },
    { fileName: 'revenue', format: 'svg' }
  ]
);
```

## Примеры использования

### Пример 1: Базовый экспорт PNG

```typescript
import { exportChartToPNG } from '@/utils/chartExport';

const handleExport = async () => {
  if (!chartRef.current) return;

  try {
    await exportChartToPNG(chartRef.current, {
      fileName: 'my-chart',
      scale: 2,
      backgroundColor: '#ffffff',
    });
    console.log('Экспорт успешен!');
  } catch (error) {
    console.error('Ошибка экспорта:', error);
  }
};
```

### Пример 2: Экспорт SVG

```typescript
import { exportChartToSVG } from '@/utils/chartExport';

const handleExportSVG = async () => {
  if (!chartRef.current) return;

  try {
    await exportChartToSVG(chartRef.current, {
      fileName: 'vector-chart',
      backgroundColor: '#f0f0f0',
    });
    console.log('SVG экспорт успешен!');
  } catch (error) {
    console.error('Ошибка экспорта:', error);
  }
};
```

### Пример 3: Универсальный экспорт с выбором формата

```typescript
import { exportChart } from '@/utils/chartExport';
import { toast } from 'sonner';

const handleExport = async (format: 'png' | 'svg') => {
  if (!chartRef.current) {
    toast.error('График не найден');
    return;
  }

  try {
    toast.loading(`Экспортируем график в ${format.toUpperCase()}...`);

    await exportChart(chartRef.current, {
      fileName: config.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      format,
      scale: 2,
      backgroundColor: '#ffffff',
    });

    toast.success(`График успешно экспортирован в ${format.toUpperCase()}`);
  } catch (error) {
    toast.error(`Ошибка экспорта: ${error.message}`);
  }
};
```

### Пример 4: Интеграция с компонентом

```typescript
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileImage, Code } from 'lucide-react';
import { exportChart } from '@/utils/chartExport';

function MyChartComponent() {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleExport = async (format: 'png' | 'svg') => {
    if (!chartRef.current) return;

    await exportChart(chartRef.current, {
      fileName: 'my-chart',
      format,
      scale: 2,
    });
  };

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Экспорт
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport('png')}>
            <FileImage className="mr-2 h-4 w-4" />
            Экспорт в PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('svg')}>
            <Code className="mr-2 h-4 w-4" />
            Экспорт в SVG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div ref={chartRef}>
        {/* Ваш график здесь */}
      </div>
    </div>
  );
}
```

## Технические детали

### PNG экспорт

- Использует библиотеку **html2canvas**
- Рендерит HTML элемент в canvas
- Конвертирует canvas в blob (image/png)
- Скачивает файл через временную ссылку

**Параметры качества:**
- `scale: 2` - удваивает разрешение для лучшего качества
- Поддержка CORS для внешних изображений
- Настраиваемый цвет фона

### SVG экспорт

- Извлекает SVG элемент из графика Recharts
- Клонирует SVG для безопасной модификации
- Добавляет фоновый прямоугольник
- Устанавливает корректные размеры и viewBox
- Сериализует в строку с XML declaration
- Скачивает как SVG файл

**Особенности:**
- Сохраняет векторную природу графика
- Можно масштабировать без потери качества
- Меньший размер файла для простых графиков

## Обработка ошибок

Все функции экспорта обрабатывают ошибки и выбрасывают исключения с понятными сообщениями:

```typescript
try {
  await exportChart(element, options);
} catch (error) {
  if (error.message.includes('не найден')) {
    // График не найден
  } else if (error.message.includes('SVG')) {
    // Проблема с SVG элементом
  } else {
    // Другая ошибка
  }
}
```

## Тестирование

Unit тесты находятся в `src/utils/__tests__/chartExport.test.ts`

Запуск тестов:

```bash
npm test -- src/utils/__tests__/chartExport.test.ts
```

Покрытие тестами:
- Экспорт PNG с различными опциями
- Экспорт SVG с различными опциями
- Обработка ошибок
- Копирование в буфер обмена
- Получение base64

## Известные ограничения

1. **html2canvas** может иметь проблемы с некоторыми CSS эффектами
2. Экспорт SVG работает только с графиками, содержащими SVG элементы
3. Копирование в буфер обмена требует HTTPS или localhost
4. Некоторые браузеры могут блокировать автоматическое скачивание

## Поддержка браузеров

- Chrome/Edge: полная поддержка
- Firefox: полная поддержка
- Safari: полная поддержка
- Mobile browsers: ограниченная поддержка копирования в буфер

## Будущие улучшения

- [ ] Экспорт в PDF формат
- [ ] Пакетный экспорт нескольких графиков в ZIP
- [ ] Настройка качества PNG (компрессия)
- [ ] Предпросмотр перед экспортом
- [ ] Настройка размеров экспорта через UI
- [ ] Копирование SVG в буфер обмена
