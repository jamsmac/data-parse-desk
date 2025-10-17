/**
 * Управление шаблонами настроек экспорта
 * Позволяет сохранять и загружать часто используемые конфигурации
 */

import { ImageFormat, QualityLevel, WatermarkOptions } from './chartExportAdvanced';

export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  format: ImageFormat;
  quality: QualityLevel | number;
  scale?: number;
  watermark?: WatermarkOptions;
  customSize?: {
    width: number;
    height: number;
  };
  createdAt: Date;
  updatedAt: Date;
  isDefault?: boolean;
  icon?: string;
  tags?: string[];
}

const STORAGE_KEY = 'vhdata_export_templates';

/**
 * Получение всех сохраненных шаблонов
 */
export function getExportTemplates(): ExportTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return getDefaultTemplates();

    const templates = JSON.parse(stored) as ExportTemplate[];
    // Конвертируем строки дат обратно в объекты Date
    return templates.map(t => ({
      ...t,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt)
    }));
  } catch (error) {
    console.error('Error loading export templates:', error);
    return getDefaultTemplates();
  }
}

/**
 * Сохранение нового шаблона
 */
export function saveExportTemplate(template: Omit<ExportTemplate, 'id' | 'createdAt' | 'updatedAt'>): ExportTemplate {
  const templates = getExportTemplates();

  const newTemplate: ExportTemplate = {
    ...template,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date()
  };

  templates.push(newTemplate);
  saveTemplates(templates);

  return newTemplate;
}

/**
 * Обновление существующего шаблона
 */
export function updateExportTemplate(id: string, updates: Partial<ExportTemplate>): void {
  const templates = getExportTemplates();
  const index = templates.findIndex(t => t.id === id);

  if (index === -1) {
    throw new Error(`Template with id ${id} not found`);
  }

  templates[index] = {
    ...templates[index],
    ...updates,
    id: templates[index].id, // Нельзя менять ID
    createdAt: templates[index].createdAt, // Нельзя менять дату создания
    updatedAt: new Date()
  };

  saveTemplates(templates);
}

/**
 * Удаление шаблона
 */
export function deleteExportTemplate(id: string): void {
  const templates = getExportTemplates();
  const filtered = templates.filter(t => t.id !== id);

  if (filtered.length === templates.length) {
    throw new Error(`Template with id ${id} not found`);
  }

  saveTemplates(filtered);
}

/**
 * Получение шаблона по ID
 */
export function getExportTemplateById(id: string): ExportTemplate | null {
  const templates = getExportTemplates();
  return templates.find(t => t.id === id) || null;
}

/**
 * Получение шаблонов по тегам
 */
export function getExportTemplatesByTags(tags: string[]): ExportTemplate[] {
  const templates = getExportTemplates();
  return templates.filter(t =>
    t.tags && tags.some(tag => t.tags!.includes(tag))
  );
}

/**
 * Сохранение массива шаблонов в localStorage
 */
function saveTemplates(templates: ExportTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Error saving export templates:', error);
  }
}

/**
 * Получение стандартных шаблонов
 */
function getDefaultTemplates(): ExportTemplate[] {
  const now = new Date();

  return [
    {
      id: 'high-quality-png',
      name: 'Высокое качество PNG',
      description: 'Для презентаций и печати',
      format: 'png',
      quality: 'high',
      scale: 3,
      createdAt: now,
      updatedAt: now,
      isDefault: true,
      icon: '🖼️',
      tags: ['презентация', 'печать', 'высокое качество']
    },
    {
      id: 'web-optimized',
      name: 'Оптимизировано для веба',
      description: 'Маленький размер файла для веб-сайтов',
      format: 'webp',
      quality: 0.8,
      scale: 1.5,
      createdAt: now,
      updatedAt: now,
      isDefault: true,
      icon: '🌐',
      tags: ['веб', 'оптимизация', 'быстрая загрузка']
    },
    {
      id: 'social-media',
      name: 'Для социальных сетей',
      description: 'С водяным знаком для соцсетей',
      format: 'jpeg',
      quality: 0.9,
      scale: 2,
      watermark: {
        text: 'VHData Platform',
        position: 'bottom-right',
        opacity: 0.5,
        fontSize: 14
      },
      customSize: {
        width: 1200,
        height: 630
      },
      createdAt: now,
      updatedAt: now,
      isDefault: true,
      icon: '📱',
      tags: ['соцсети', 'instagram', 'facebook', 'twitter']
    },
    {
      id: 'vector-svg',
      name: 'Векторный SVG',
      description: 'Масштабируемая векторная графика',
      format: 'svg',
      quality: 'high',
      createdAt: now,
      updatedAt: now,
      isDefault: true,
      icon: '📐',
      tags: ['вектор', 'масштабируемый', 'редактируемый']
    },
    {
      id: 'report-export',
      name: 'Для отчетов',
      description: 'Стандартный формат для отчетов',
      format: 'png',
      quality: 'medium',
      scale: 2,
      watermark: {
        text: 'Конфиденциально',
        position: 'top-right',
        opacity: 0.3,
        fontSize: 12,
        fontColor: '#ff0000'
      },
      createdAt: now,
      updatedAt: now,
      isDefault: true,
      icon: '📊',
      tags: ['отчет', 'документ', 'конфиденциально']
    }
  ];
}

/**
 * Сброс к стандартным шаблонам
 */
export function resetToDefaultTemplates(): void {
  saveTemplates(getDefaultTemplates());
}

/**
 * Импорт шаблонов из JSON
 */
export function importTemplates(json: string): void {
  try {
    const imported = JSON.parse(json) as ExportTemplate[];
    const existing = getExportTemplates().filter(t => !t.isDefault);

    // Добавляем импортированные шаблоны к существующим пользовательским
    const merged = [...getDefaultTemplates(), ...existing, ...imported.map(t => ({
      ...t,
      id: crypto.randomUUID(), // Генерируем новые ID для избежания конфликтов
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(),
      isDefault: false
    }))];

    saveTemplates(merged);
  } catch (error) {
    console.error('Error importing templates:', error);
    throw new Error('Неверный формат JSON файла');
  }
}

/**
 * Экспорт шаблонов в JSON
 */
export function exportTemplates(includeDefaults = false): string {
  const templates = getExportTemplates();
  const toExport = includeDefaults ? templates : templates.filter(t => !t.isDefault);
  return JSON.stringify(toExport, null, 2);
}

/**
 * Клонирование шаблона
 */
export function cloneTemplate(id: string, newName: string): ExportTemplate {
  const template = getExportTemplateById(id);
  if (!template) {
    throw new Error(`Template with id ${id} not found`);
  }

  return saveExportTemplate({
    ...template,
    name: newName,
    description: `Копия: ${template.description || template.name}`,
    isDefault: false
  });
}

/**
 * Поиск шаблонов по имени
 */
export function searchTemplates(query: string): ExportTemplate[] {
  const templates = getExportTemplates();
  const lowerQuery = query.toLowerCase();

  return templates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description?.toLowerCase().includes(lowerQuery) ||
    t.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}