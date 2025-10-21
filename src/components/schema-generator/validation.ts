import { GeneratedSchema } from './types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate input step
 */
export function validateInputStep(
  inputType: 'text' | 'json' | 'csv',
  textInput: string,
  fileInput: File | null
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (inputType === 'text') {
    if (!textInput || textInput.trim().length === 0) {
      errors.push('Введите описание схемы');
    } else if (textInput.trim().length < 20) {
      warnings.push('Описание слишком короткое. Добавьте больше деталей для лучшего результата.');
    }
  } else {
    if (!fileInput) {
      errors.push('Выберите файл для загрузки');
    } else {
      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (fileInput.size > maxSize) {
        errors.push('Файл слишком большой. Максимальный размер: 5MB');
      }

      // Check file type
      if (inputType === 'json' && !fileInput.name.endsWith('.json')) {
        warnings.push('Файл не имеет расширения .json');
      } else if (inputType === 'csv' && !fileInput.name.endsWith('.csv')) {
        warnings.push('Файл не имеет расширения .csv');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate preview step (generated schema)
 */
export function validatePreviewStep(schema: GeneratedSchema | null): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!schema) {
    errors.push('Схема не сгенерирована');
    return { isValid: false, errors, warnings };
  }

  // Check if schema has entities
  if (!schema.entities || schema.entities.length === 0) {
    errors.push('Схема не содержит таблиц');
  }

  // Check each entity
  schema.entities.forEach((entity, index) => {
    // Check entity name
    if (!entity.name || entity.name.trim().length === 0) {
      errors.push(`Таблица #${index + 1} не имеет названия`);
    } else if (!/^[a-z][a-z0-9_]*$/.test(entity.name)) {
      warnings.push(
        `Таблица "${entity.name}": название должно начинаться с буквы и содержать только строчные буквы, цифры и подчеркивания`
      );
    }

    // Check for duplicate table names
    const duplicates = schema.entities.filter(e => e.name === entity.name);
    if (duplicates.length > 1) {
      errors.push(`Дублирующееся название таблицы: "${entity.name}"`);
    }

    // Check columns
    if (!entity.columns || entity.columns.length === 0) {
      errors.push(`Таблица "${entity.name}" не имеет колонок`);
    } else {
      const hasPrimaryKey = entity.columns.some(col => col.primary_key);
      if (!hasPrimaryKey) {
        warnings.push(`Таблица "${entity.name}" не имеет первичного ключа (PRIMARY KEY)`);
      }

      // Check for duplicate column names
      const columnNames = entity.columns.map(col => col.name);
      const duplicateColumns = columnNames.filter(
        (name, index) => columnNames.indexOf(name) !== index
      );
      if (duplicateColumns.length > 0) {
        errors.push(
          `Таблица "${entity.name}" имеет дублирующиеся колонки: ${duplicateColumns.join(', ')}`
        );
      }

      // Check column names
      entity.columns.forEach(col => {
        if (!col.name || col.name.trim().length === 0) {
          errors.push(`Таблица "${entity.name}": колонка без названия`);
        } else if (!/^[a-z][a-z0-9_]*$/.test(col.name)) {
          warnings.push(
            `Таблица "${entity.name}", колонка "${col.name}": название должно начинаться с буквы и содержать только строчные буквы, цифры и подчеркивания`
          );
        }

        if (!col.type) {
          errors.push(`Таблица "${entity.name}", колонка "${col.name}": не указан тип данных`);
        }
      });
    }

    // Check confidence
    if (entity.confidence < 50) {
      warnings.push(
        `Таблица "${entity.name}": низкая уверенность AI (${entity.confidence}%). Рекомендуется проверить и отредактировать.`
      );
    }
  });

  // Check relationships
  if (schema.relationships && schema.relationships.length > 0) {
    schema.relationships.forEach((rel, index) => {
      const fromTable = schema.entities.find(e => e.name === rel.from);
      const toTable = schema.entities.find(e => e.name === rel.to);

      if (!fromTable) {
        errors.push(`Связь #${index + 1}: таблица "${rel.from}" не найдена`);
      }
      if (!toTable) {
        errors.push(`Связь #${index + 1}: таблица "${rel.to}" не найдена`);
      }

      if (rel.confidence < 50) {
        warnings.push(
          `Связь "${rel.from} → ${rel.to}": низкая уверенность (${rel.confidence}%)`
        );
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate edit step (modified schema)
 */
export function validateEditStep(schema: GeneratedSchema | null): ValidationResult {
  // Same validation as preview step
  return validatePreviewStep(schema);
}

/**
 * Validate that user has enough credits
 */
export function validateCredits(
  availableCredits: number,
  requiredCredits: number = 20
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (availableCredits < requiredCredits) {
    errors.push(
      `Недостаточно AI кредитов. Доступно: ${availableCredits.toFixed(2)}, требуется: ${requiredCredits}`
    );
  } else if (availableCredits < requiredCredits * 2) {
    warnings.push(
      `У вас мало AI кредитов (${availableCredits.toFixed(2)}). Рекомендуется пополнить баланс.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
