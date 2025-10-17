# Changelog: Chart Export Feature

## Обзор изменений

Добавлена функциональность экспорта графиков и дашбордов в PNG и SVG форматы.

## Дата: 2025-10-17

## Добавленные файлы

### 1. src/utils/chartExport.ts
Утилита для экспорта графиков с следующими функциями:

- `exportChart(element, options)` - универсальная функция экспорта
- `exportChartToPNG(element, options)` - экспорт в PNG
- `exportChartToSVG(element, options)` - экспорт в SVG
- `copyChartToClipboard(element, options)` - копирование в буфер обмена
- `getChartAsBase64(element, options)` - получение base64 представления
- `exportMultipleCharts(elements, options)` - пакетный экспорт

**Технологии:**
- html2canvas - для рендеринга HTML в PNG
- Native SVG API - для экспорта в SVG

### 2. src/utils/__tests__/chartExport.test.ts
Unit тесты для утилиты экспорта:

- 15 тестов с покрытием всех основных функций
- Моки для html2canvas, URL API, clipboard API
- Проверка обработки ошибок
- Валидация параметров

### 3. docs/CHART_EXPORT_GUIDE.md
Подробная документация:

- API Reference для всех функций
- Примеры использования
- Технические детали PNG и SVG экспорта
- Руководство по интеграции в компоненты
- Известные ограничения и поддержка браузеров

## Обновленные файлы

### 1. src/components/charts/ChartBuilder.tsx

**Изменения:**
- Добавлен useRef hook для получения ссылки на график
- Добавлена функция `handleExport(format)` для обработки экспорта
- Добавлено DropdownMenu с кнопками экспорта PNG и SVG
- Интеграция с toast уведомлениями (sonner)

**UI изменения:**
- Кнопка "Экспорт" в правом верхнем углу панели предпросмотра
- Выпадающее меню с опциями: "Экспорт в PNG" и "Экспорт в SVG"
- Иконки: Download, FileImage, Code

### 2. src/components/charts/DashboardBuilder.tsx

**Изменения:**
- Добавлен useRef hook для получения ссылки на дашборд
- Добавлена функция `handleExport(format)` для обработки экспорта
- Добавлено DropdownMenu с кнопками экспорта в режиме превью
- Интеграция с toast уведомлениями (sonner)

**UI изменения:**
- Кнопка "Экспорт" в режиме превью дашборда
- Выпадающее меню с опциями экспорта
- Ref на контейнер дашборда для корректного рендеринга

### 3. package.json

**Новые зависимости:**
```json
{
  "html2canvas": "^1.4.1"
}
```

## Функциональность

### ChartBuilder
1. Пользователь создает график с помощью конструктора
2. После настройки осей появляется кнопка "Экспорт"
3. Выбор формата: PNG или SVG
4. Автоматическое скачивание файла с именем графика

### DashboardBuilder
1. Пользователь создает дашборд с виджетами
2. Переход в режим превью
3. Кнопка "Экспорт" доступна в режиме превью
4. Выбор формата и скачивание

## Технические особенности

### PNG экспорт
- Использует html2canvas для рендеринга
- Scale factor = 2 для высокого качества
- Настраиваемый цвет фона (по умолчанию: белый)
- Поддержка CORS для внешних ресурсов

### SVG экспорт
- Извлечение SVG из Recharts графиков
- Добавление фонового прямоугольника
- Корректная установка размеров и viewBox
- XML serialization с declaration

### Обработка ошибок
- Try-catch блоки во всех функциях
- Понятные сообщения об ошибках на русском
- Toast уведомления для пользователя
- Console.error для отладки

## Тестирование

### Unit тесты
- Файл: `src/utils/__tests__/chartExport.test.ts`
- Покрытие: 15 тестов
- Все тесты проходят успешно

**Команда запуска:**
```bash
npm test -- src/utils/__tests__/chartExport.test.ts
```

## Совместимость

### TypeScript
- Полная типизация всех функций
- Интерфейсы для ExportOptions
- Нет ошибок type-check

### ESLint
- Нет ошибок в новых файлах
- Соответствие стилю кода проекта

### Браузеры
- Chrome/Edge: полная поддержка
- Firefox: полная поддержка
- Safari: полная поддержка
- Mobile: частичная поддержка

## Известные ограничения

1. html2canvas может иметь проблемы с некоторыми CSS эффектами
2. Экспорт SVG работает только с SVG-содержащими графиками
3. Clipboard API требует HTTPS или localhost
4. Некоторые браузеры блокируют множественные автоматические скачивания

## Будущие улучшения

- [ ] Экспорт в PDF
- [ ] Пакетный экспорт в ZIP
- [ ] Настройка качества PNG
- [ ] Предпросмотр перед экспортом
- [ ] UI для настройки размеров
- [ ] Прогресс-бар для больших графиков

## Использование

### Базовый пример

```typescript
import { exportChart } from '@/utils/chartExport';

const handleExport = async () => {
  await exportChart(chartRef.current, {
    fileName: 'my-chart',
    format: 'png',
    scale: 2,
    backgroundColor: '#ffffff',
  });
};
```

### С обработкой ошибок

```typescript
import { exportChart } from '@/utils/chartExport';
import { toast } from 'sonner';

const handleExport = async (format: 'png' | 'svg') => {
  try {
    toast.loading('Экспортируем график...');
    await exportChart(chartRef.current, {
      fileName: 'chart',
      format,
      scale: 2,
    });
    toast.success('Экспорт успешен!');
  } catch (error) {
    toast.error(`Ошибка: ${error.message}`);
  }
};
```

## Зависимости

- **html2canvas** ^1.4.1 - основная библиотека для PNG экспорта
- **sonner** (уже в проекте) - для toast уведомлений
- **lucide-react** (уже в проекте) - для иконок

## Миграция

Для использования в других компонентах:

1. Импортировать `exportChart` из `@/utils/chartExport`
2. Создать ref для элемента графика
3. Добавить кнопку экспорта с вызовом функции
4. Обработать ошибки и показать уведомления

## Автор

Frontend разработчик VHData Platform

## Версия

VHData v1.1.0 (Phase 1 complete + Chart Export)
