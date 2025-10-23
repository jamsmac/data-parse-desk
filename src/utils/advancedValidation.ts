/**
 * Расширенная валидация данных при импорте
 */

import { ValidationError, ValidationWarning, ColumnType } from '@/types/database';

export type ValidationRuleParams = {
  min?: number;
  max?: number;
  validator?: (value: unknown) => boolean;
  [key: string]: unknown;
};

export interface ValidationRule {
  type: 'required' | 'type' | 'format' | 'range' | 'unique' | 'reference' | 'custom';
  message: string;
  params?: ValidationRuleParams;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
  };
}

class AdvancedValidator {
  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  private urlRegex = /^https?:\/\/.+/;
  private dateRegex = /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}/;

  /**
   * Валидирует данные перед импортом
   */
  validate(
    data: Record<string, unknown>[],
    schema: { name: string; type: ColumnType; required?: boolean; rules?: ValidationRule[] }[]
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const uniqueValues = new Map<string, Set<unknown>>();

    // Инициализируем множества для проверки уникальности
    schema.forEach((col) => {
      uniqueValues.set(col.name, new Set());
    });

    data.forEach((row, rowIndex) => {
      schema.forEach((column) => {
        const value = row[column.name];

        // 1. Проверка обязательности
        if (column.required && (value == null || value === '')) {
          errors.push({
            row: rowIndex + 1,
            column: column.name,
            value,
            message: `Обязательное поле не заполнено`,
          });
          return;
        }

        // Если значение пустое и не обязательное, пропускаем остальные проверки
        if (value == null || value === '') {
          return;
        }

        // 2. Проверка типа
        const typeError = this.validateType(value, column.type);
        if (typeError) {
          errors.push({
            row: rowIndex + 1,
            column: column.name,
            value,
            message: typeError,
          });
        }

        // 3. Проверка формата
        const formatWarning = this.validateFormat(value, column.type);
        if (formatWarning) {
          warnings.push({
            row: rowIndex + 1,
            column: column.name,
            value,
            message: formatWarning,
          });
        }

        // 4. Проверка уникальности
        const uniqueSet = uniqueValues.get(column.name);
        if (uniqueSet) {
          if (uniqueSet.has(value)) {
            warnings.push({
              row: rowIndex + 1,
              column: column.name,
              value,
              message: `Дубликат значения`,
            });
          } else {
            uniqueSet.add(value);
          }
        }

        // 5. Дополнительные правила
        if (column.rules) {
          column.rules.forEach((rule) => {
            const ruleError = this.validateRule(value, rule, rowIndex + 1, column.name);
            if (ruleError) {
              if (rule.type === 'required' || rule.type === 'type') {
                errors.push(ruleError);
              } else {
                warnings.push(ruleError as ValidationWarning);
              }
            }
          });
        }
      });
    });

    const errorRows = new Set(errors.map((e) => e.row)).size;
    const warningRows = new Set(warnings.map((w) => w.row)).size;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalRows: data.length,
        validRows: data.length - errorRows,
        errorRows,
        warningRows,
      },
    };
  }

  /**
   * Валидирует тип данных
   */
  private validateType(value: unknown, type: ColumnType): string | null {
    switch (type) {
      case 'number':
        if (isNaN(Number(value))) {
          return `Ожидается число, получено: "${value}"`;
        }
        break;

      case 'boolean':
        const boolValues = ['true', 'false', 'yes', 'no', '1', '0', 'да', 'нет'];
        if (!boolValues.includes(String(value).toLowerCase())) {
          return `Ожидается boolean, получено: "${value}"`;
        }
        break;

      case 'date':
        if (!this.isValidDate(value)) {
          return `Неверный формат даты: "${value}"`;
        }
        break;

      case 'email':
        if (!this.emailRegex.test(String(value))) {
          return `Неверный формат email: "${value}"`;
        }
        break;

      case 'phone':
        if (!this.phoneRegex.test(String(value))) {
          return `Неверный формат телефона: "${value}"`;
        }
        break;

      case 'url':
        if (!this.urlRegex.test(String(value))) {
          return `Неверный формат URL: "${value}"`;
        }
        break;
    }

    return null;
  }

  /**
   * Валидирует формат (мягкие проверки)
   */
  private validateFormat(value: unknown, type: ColumnType): string | null {
    const str = String(value);

    switch (type) {
      case 'text':
        if (str.length > 1000) {
          return `Слишком длинный текст (${str.length} символов)`;
        }
        break;

      case 'number':
        const num = Number(value);
        if (num > Number.MAX_SAFE_INTEGER) {
          return `Число слишком большое`;
        }
        if (num < Number.MIN_SAFE_INTEGER) {
          return `Число слишком маленькое`;
        }
        break;

      case 'email':
        if (str.length > 255) {
          return `Email слишком длинный`;
        }
        break;
    }

    return null;
  }

  /**
   * Валидирует кастомное правило
   */
  private validateRule(
    value: unknown,
    rule: ValidationRule,
    row: number,
    column: string
  ): ValidationError | null {
    switch (rule.type) {
      case 'range':
        const num = Number(value);
        if (rule.params?.min != null && num < rule.params.min) {
          return { row, column, value, message: rule.message };
        }
        if (rule.params?.max != null && num > rule.params.max) {
          return { row, column, value, message: rule.message };
        }
        break;

      case 'custom':
        if (rule.params?.validator && !rule.params.validator(value)) {
          return { row, column, value, message: rule.message };
        }
        break;
    }

    return null;
  }

  /**
   * Проверяет корректность даты
   */
  private isValidDate(value: unknown): boolean {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Анализирует качество данных
   */
  analyzeDataQuality(data: Record<string, unknown>[]): {
    columns: {
      name: string;
      completeness: number; // % заполненности
      uniqueness: number; // % уникальных значений
      consistency: number; // % согласованности типов
    }[];
    overallScore: number;
  } {
    if (data.length === 0) {
      return { columns: [], overallScore: 0 };
    }

    const columnNames = Object.keys(data[0]);
    const columns = columnNames.map((name) => {
      const values = data.map((row) => row[name]);
      const nonNullValues = values.filter((v) => v != null && v !== '');

      const completeness = nonNullValues.length / values.length;
      const uniqueness = new Set(nonNullValues).size / Math.max(nonNullValues.length, 1);
      
      // Проверяем согласованность типов
      const types = nonNullValues.map((v) => this.inferType(v));
      const dominantType = this.getMostCommon(types);
      const consistency = types.filter((t) => t === dominantType).length / Math.max(types.length, 1);

      return {
        name,
        completeness,
        uniqueness,
        consistency,
      };
    });

    const overallScore =
      columns.reduce((sum, col) => {
        return sum + (col.completeness + col.consistency) / 2;
      }, 0) / columns.length;

    return { columns, overallScore };
  }

  /**
   * Определяет тип значения
   */
  private inferType(value: unknown): string {
    if (value == null) return 'null';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    
    const str = String(value);
    if (this.emailRegex.test(str)) return 'email';
    if (this.phoneRegex.test(str)) return 'phone';
    if (this.urlRegex.test(str)) return 'url';
    if (this.dateRegex.test(str)) return 'date';
    if (!isNaN(Number(str))) return 'number';
    
    return 'text';
  }

  /**
   * Находит наиболее частое значение в массиве
   */
  private getMostCommon<T>(arr: T[]): T {
    const counts = new Map<T, number>();
    arr.forEach((item) => {
      counts.set(item, (counts.get(item) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommon = arr[0];
    counts.forEach((count, item) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = item;
      }
    });

    return mostCommon;
  }
}

export const advancedValidator = new AdvancedValidator();

// Экспортируем также удобные функции
export function validateData(
  data: Record<string, ColumnValue>[],
  schema: { name: string; type: ColumnType; required?: boolean }[],
  mappings: { sourceColumn: string; targetColumn: string }[]
): ValidationError[] {
  const result = advancedValidator.validate(data, schema);
  return result.errors;
}

export function analyzeDataQuality(
  data: Record<string, ColumnValue>[],
  columns: string[]
): {
  completeness: number;
  uniqueness: number;
  consistency: number;
  totalErrors: number;
  warnings: string[];
} {
  const analysis = advancedValidator.analyzeDataQuality(data);
  
  const avgCompleteness = analysis.columns.reduce((sum, col) => sum + col.completeness, 0) / Math.max(analysis.columns.length, 1);
  const avgUniqueness = analysis.columns.reduce((sum, col) => sum + col.uniqueness, 0) / Math.max(analysis.columns.length, 1);
  const avgConsistency = analysis.columns.reduce((sum, col) => sum + col.consistency, 0) / Math.max(analysis.columns.length, 1);
  
  const warnings: string[] = [];
  analysis.columns.forEach(col => {
    if (col.completeness < 0.9) {
      warnings.push(`Колонка "${col.name}" заполнена только на ${Math.round(col.completeness * 100)}%`);
    }
    if (col.consistency < 0.9) {
      warnings.push(`Колонка "${col.name}" содержит разнородные данные (${Math.round(col.consistency * 100)}% согласованность)`);
    }
  });
  
  return {
    completeness: avgCompleteness,
    uniqueness: avgUniqueness,
    consistency: avgConsistency,
    totalErrors: 0,
    warnings,
  };
}
