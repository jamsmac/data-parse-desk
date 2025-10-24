/**
 * Утилиты для умного маппинга колонок при импорте данных
 */

import type { TableSchema, ColumnMapping } from '../types/database';

/**
 * Вычисляет расстояние Левенштейна между двумя строками
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Нормализует строку для сравнения
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[_\s-]+/g, '')
    .replace(/[^\w]/g, '');
}

/**
 * Вычисляет схожесть между двумя строками (0-1)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  // Handle empty strings - both empty = 0, one empty > 0
  if (normalized1.length === 0 && normalized2.length === 0) return 0;

  if (normalized1 === normalized2) return 1.0;

  // Boost similarity if one string contains the other (substring match)
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    const minLength = Math.min(normalized1.length, normalized2.length);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    // Give higher similarity for substring matches (at least 0.7)
    return Math.max(0.7, minLength / maxLength);
  }

  // Check for common prefix (e.g., 'col' in 'col1' and 'column1')
  let commonPrefixLength = 0;
  for (let i = 0; i < Math.min(normalized1.length, normalized2.length); i++) {
    if (normalized1[i] === normalized2[i]) {
      commonPrefixLength++;
    } else {
      break;
    }
  }

  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);
  const baseSimilarity = maxLength > 0 ? 1 - distance / maxLength : 0;

  // Boost similarity if there's a significant common prefix (at least 3 chars)
  if (commonPrefixLength >= 3) {
    const prefixBoost = (commonPrefixLength / maxLength) * 0.2; // up to 20% boost
    return Math.min(1.0, baseSimilarity + prefixBoost);
  }

  return baseSimilarity;
}

/**
 * Предлагает маппинг колонок на основе схожести названий
 */
export function suggestColumnMapping(
  fileColumns: string[],
  schemaColumns: TableSchema[],
  threshold: number = 0.6
): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];

  for (const fileColumn of fileColumns) {
    let bestMatch: { column: string; confidence: number } | null = null;

    for (const schemaColumn of schemaColumns) {
      const similarity = calculateSimilarity(fileColumn, schemaColumn.column_name);

      if (similarity >= threshold && (!bestMatch || similarity > bestMatch.confidence)) {
        bestMatch = {
          column: schemaColumn.column_name,
          confidence: similarity,
        };
      }
    }

    if (bestMatch) {
      mappings.push({
        sourceColumn: fileColumn,
        targetColumn: bestMatch.column,
        confidence: bestMatch.confidence,
      });
    } else {
      // Если не найдено соответствие, добавляем с нулевой уверенностью
      mappings.push({
        sourceColumn: fileColumn,
        targetColumn: '',
        confidence: 0,
      });
    }
  }

  return mappings;
}

/**
 * Применяет маппинг к данным
 */
export function applyColumnMapping(
  data: Record<string, any>[],
  mapping: ColumnMapping[]
): Record<string, any>[] {
  return data.map(row => {
    const mappedRow: Record<string, any> = {};

    for (const map of mapping) {
      if (map.targetColumn && row[map.sourceColumn] !== undefined) {
        mappedRow[map.targetColumn] = row[map.sourceColumn];
      }
    }

    return mappedRow;
  });
}

/**
 * Определяет тип колонки на основе данных
 */
export function inferColumnType(values: any[]): string {
  const nonNullValues = values.filter(v => v != null && v !== '');

  if (nonNullValues.length === 0) return 'text';

  // Проверяем email (very specific pattern)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const allEmails = nonNullValues.every(v => emailRegex.test(String(v)));

  if (allEmails) return 'email';

  // Проверяем URL (very specific pattern)
  const urlRegex = /^https?:\/\/.+/;
  const allUrls = nonNullValues.every(v => urlRegex.test(String(v)));

  if (allUrls) return 'url';

  // Проверяем, все ли значения даты (BEFORE phone and numbers)
  const dateRegex = /^\d{4}-\d{2}-\d{2}/; // ISO date format
  const allDates = nonNullValues.every(v => {
    const str = String(v);
    // Check if it looks like a date format (must have date-like separators)
    if (!dateRegex.test(str) && !str.includes('/')) {
      return false;
    }
    const date = new Date(v);
    return !isNaN(date.getTime());
  });

  if (allDates) return 'date';

  // Проверяем телефон (must have phone-like patterns, not date patterns)
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  const allPhones = nonNullValues.every(v => {
    const str = String(v);
    const cleaned = str.replace(/[\s\-\(\)]/g, '');
    // Must not look like a date (no year-like 4 digits at start)
    const looksLikeDate = /^\d{4}-\d{2}/.test(str);
    return phoneRegex.test(str) && cleaned.length >= 7 && cleaned.length <= 20 && !looksLikeDate;
  });

  if (allPhones) return 'phone';

  // Проверяем, все ли значения числа
  const allNumbers = nonNullValues.every(v => {
    const num = typeof v === 'number' ? v : parseFloat(v);
    return !isNaN(num) && isFinite(num);
  });

  if (allNumbers) return 'number';

  // Проверяем, все ли значения boolean
  const allBooleans = nonNullValues.every(v => {
    const str = String(v).toLowerCase();
    return ['true', 'false', '1', '0', 'yes', 'no'].includes(str);
  });

  if (allBooleans) return 'boolean';

  return 'text';
}

/**
 * Анализирует данные файла и предлагает схему
 */
export function suggestSchema(
  data: Record<string, any>[],
  existingColumns?: string[]
): Array<{
  column_name: string;
  column_type: string;
  is_required: boolean;
}> {
  if (data.length === 0) return [];

  const columns = Object.keys(data[0]);
  const schema: Array<{
    column_name: string;
    column_type: string;
    is_required: boolean;
  }> = [];

  for (const column of columns) {
    // Пропускаем, если колонка уже существует
    if (existingColumns?.includes(column)) continue;

    const values = data.map(row => row[column]);
    const type = inferColumnType(values);

    // Определяем, является ли колонка обязательной
    const nonNullCount = values.filter(v => v != null && v !== '').length;
    const isRequired = nonNullCount === values.length;

    schema.push({
      column_name: column,
      column_type: type,
      is_required: isRequired,
    });
  }

  return schema;
}

/**
 * Валидирует маппинг колонок
 */
export function validateMapping(
  mapping: ColumnMapping[],
  requiredColumns: string[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Проверяем, что все обязательные колонки замаплены
  const mappedTargets = mapping
    .filter(m => m.targetColumn)
    .map(m => m.targetColumn);

  for (const required of requiredColumns) {
    if (!mappedTargets.includes(required)) {
      errors.push(`Обязательная колонка "${required}" не замаплена`);
    }
  }

  // Проверяем дубликаты в целевых колонках
  const targetCounts = mappedTargets.reduce((acc, col) => {
    acc[col] = (acc[col] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  for (const [col, count] of Object.entries(targetCounts)) {
    if (count > 1) {
      errors.push(`Колонка "${col}" замаплена несколько раз`);
    }
  }

  // Предупреждения о низкой уверенности
  const lowConfidence = mapping.filter(m => m.confidence > 0 && m.confidence < 0.7);
  if (lowConfidence.length > 0) {
    warnings.push(
      `Найдено ${lowConfidence.length} маппингов с низкой уверенностью (< 70%)`
    );
  }

  // Предупреждения о незамапленных колонках
  const unmapped = mapping.filter(m => !m.targetColumn);
  if (unmapped.length > 0) {
    warnings.push(
      `${unmapped.length} колонок из файла не будут импортированы`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Автоматически создает маппинг для общих шаблонов имен
 */
export function createDefaultMapping(
  fileColumns: string[],
  schemaColumns: string[]
): ColumnMapping[] {
  // Общие паттерны маппинга
  const patterns: Record<string, string[]> = {
    id: ['id', 'identifier', 'key', 'primary_key'],
    name: ['name', 'title', 'label', 'display_name'],
    email: ['email', 'e-mail', 'mail', 'email_address'],
    phone: ['phone', 'telephone', 'mobile', 'phone_number'],
    date: ['date', 'created_at', 'updated_at', 'timestamp'],
    description: ['description', 'desc', 'note', 'notes', 'comment'],
  };

  const mappings: ColumnMapping[] = [];

  for (const fileColumn of fileColumns) {
    const normalized = normalizeString(fileColumn);
    let matched = false;

    // First check for exact match (highest confidence)
    const exactMatch = schemaColumns.find(
      col => normalizeString(col) === normalized
    );

    if (exactMatch) {
      mappings.push({
        sourceColumn: fileColumn,
        targetColumn: exactMatch,
        confidence: 1.0,
      });
      matched = true;
    }

    // Then check patterns if no exact match
    if (!matched) {
      for (const [schemaCol, variants] of Object.entries(patterns)) {
        if (schemaColumns.includes(schemaCol)) {
          for (const variant of variants) {
            if (normalized.includes(normalizeString(variant))) {
              mappings.push({
                sourceColumn: fileColumn,
                targetColumn: schemaCol,
                confidence: 0.9,
              });
              matched = true;
              break;
            }
          }
        }
        if (matched) break;
      }
    }

    if (!matched) {
      // Без маппинга
      mappings.push({
        sourceColumn: fileColumn,
        targetColumn: '',
        confidence: 0,
      });
    }
  }

  return mappings;
}
