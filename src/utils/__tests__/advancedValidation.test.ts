/**
 * Advanced Validation Tests
 * Tests for input validation, data quality checks, and sanitization
 */

import { describe, it, expect } from 'vitest';
import { advancedValidator } from '../advancedValidation';

describe('Advanced Validation - Email', () => {
  it('должен валидировать корректный email', () => {
    const data = [{ email: 'user@example.com' }];
    const schema = [{ name: 'email', type: 'email' as const, required: true }];

    const result = advancedValidator.validate(data, schema);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('должен отклонять некорректный email', () => {
    const data = [{ email: 'invalid-email' }];
    const schema = [{ name: 'email', type: 'email' as const, required: true }];

    const result = advancedValidator.validate(data, schema);

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('email');
  });

  it('должен отклонять email без @', () => {
    const data = [{ email: 'user.example.com' }];
    const schema = [{ name: 'email', type: 'email' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
  });

  it('должен отклонять email без домена', () => {
    const data = [{ email: 'user@' }];
    const schema = [{ name: 'email', type: 'email' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
  });

  it('должен предупреждать о слишком длинном email', () => {
    const longEmail = 'a'.repeat(250) + '@example.com'; // >255 символов
    const data = [{ email: longEmail }];
    const schema = [{ name: 'email', type: 'email' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('Advanced Validation - Phone', () => {
  it('должен валидировать корректный телефон', () => {
    const validPhones = [
      '1234567890',
      '(123) 456-7890',
      '123-456-7890',
      '5551234567',
    ];

    validPhones.forEach(phone => {
      const data = [{ phone }];
      const schema = [{ name: 'phone', type: 'phone' as const }];

      const result = advancedValidator.validate(data, schema);

      expect(result.isValid).toBe(true);
    });
  });

  it('должен отклонять некорректный телефон', () => {
    const data = [{ phone: 'abc-def-ghij' }];
    const schema = [{ name: 'phone', type: 'phone' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('телефон');
  });

  it('должен отклонять некорректный формат номера', () => {
    // Phone regex expects at least 2 groups of digits
    const data = [{ phone: 'abc123' }];
    const schema = [{ name: 'phone', type: 'phone' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Advanced Validation - URL', () => {
  it('должен валидировать корректный URL', () => {
    const validUrls = [
      'https://example.com',
      'http://example.com/path',
      'https://sub.example.com',
      'https://example.com:8080',
    ];

    validUrls.forEach(url => {
      const data = [{ url }];
      const schema = [{ name: 'url', type: 'url' as const }];

      const result = advancedValidator.validate(data, schema);

      expect(result.isValid).toBe(true);
    });
  });

  it('должен отклонять URL без протокола', () => {
    const data = [{ url: 'example.com' }];
    const schema = [{ name: 'url', type: 'url' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
  });

  it('должен отклонять некорректный URL', () => {
    const data = [{ url: 'not-a-url' }];
    const schema = [{ name: 'url', type: 'url' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
  });
});

describe('Advanced Validation - Required Fields', () => {
  it('должен требовать обязательные поля', () => {
    const data = [{ name: '' }];
    const schema = [{ name: 'name', type: 'text' as const, required: true }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('Обязательное');
  });

  it('должен пропускать необязательные пустые поля', () => {
    const data = [{ name: '' }];
    const schema = [{ name: 'name', type: 'text' as const, required: false }];

    const result = advancedValidator.validate(data, schema);

    expect(result.isValid).toBe(true);
  });

  it('должен валидировать null как пустое значение', () => {
    const data = [{ name: null }];
    const schema = [{ name: 'name', type: 'text' as const, required: true }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
  });

  it('должен валидировать undefined как пустое значение', () => {
    const data = [{ name: undefined }];
    const schema = [{ name: 'name', type: 'text' as const, required: true }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
  });
});

describe('Advanced Validation - Duplicate Detection', () => {
  it('должен находить дубликаты в данных', () => {
    const data = [
      { email: 'user@example.com' },
      { email: 'user@example.com' }, // Дубликат
      { email: 'other@example.com' },
    ];
    const schema = [{ name: 'email', type: 'email' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.warnings.length).toBeGreaterThan(0);
    const duplicateWarning = result.warnings.find(w => w.message.includes('Дубликат'));
    expect(duplicateWarning).toBeDefined();
  });

  it('должен находить множественные дубликаты', () => {
    const data = [
      { email: 'user@example.com' },
      { email: 'user@example.com' }, // Дубликат 1
      { email: 'user@example.com' }, // Дубликат 2
    ];
    const schema = [{ name: 'email', type: 'email' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.warnings.length).toBe(2); // 2 дубликата
  });

  it('не должен считать уникальные значения дубликатами', () => {
    const data = [
      { email: 'user1@example.com' },
      { email: 'user2@example.com' },
      { email: 'user3@example.com' },
    ];
    const schema = [{ name: 'email', type: 'email' as const }];

    const result = advancedValidator.validate(data, schema);

    const duplicateWarnings = result.warnings.filter(w => w.message.includes('Дубликат'));
    expect(duplicateWarnings).toHaveLength(0);
  });
});

describe('Advanced Validation - Number Type', () => {
  it('должен валидировать корректное число', () => {
    const data = [{ age: 25 }];
    const schema = [{ name: 'age', type: 'number' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.isValid).toBe(true);
  });

  it('должен валидировать строку как число', () => {
    const data = [{ age: '25' }];
    const schema = [{ name: 'age', type: 'number' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.isValid).toBe(true);
  });

  it('должен отклонять нечисловые значения', () => {
    const data = [{ age: 'twenty-five' }];
    const schema = [{ name: 'age', type: 'number' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain('число');
  });

  it('должен предупреждать о слишком больших числах', () => {
    const data = [{ value: Number.MAX_SAFE_INTEGER + 1 }];
    const schema = [{ name: 'value', type: 'number' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('Advanced Validation - Boolean Type', () => {
  it('должен валидировать boolean значения', () => {
    const validValues = [
      true,
      false,
      'true',
      'false',
      'yes',
      'no',
      '1',
      '0',
      'да',
      'нет'
    ];

    validValues.forEach(value => {
      const data = [{ active: value }];
      const schema = [{ name: 'active', type: 'boolean' as const }];

      const result = advancedValidator.validate(data, schema);

      expect(result.isValid).toBe(true);
    });
  });

  it('должен отклонять некорректные boolean значения', () => {
    const data = [{ active: 'maybe' }];
    const schema = [{ name: 'active', type: 'boolean' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
  });
});

describe('Advanced Validation - Date Type', () => {
  it('должен валидировать корректные даты', () => {
    const validDates = [
      '2025-01-15',
      '01/15/2025',
      '2025/01/15',
      new Date('2025-01-15'),
    ];

    validDates.forEach(date => {
      const data = [{ created: date }];
      const schema = [{ name: 'created', type: 'date' as const }];

      const result = advancedValidator.validate(data, schema);

      expect(result.isValid).toBe(true);
    });
  });

  it('должен отклонять некорректные даты', () => {
    const data = [{ created: 'not-a-date' }];
    const schema = [{ name: 'created', type: 'date' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors).toHaveLength(1);
  });

  it('должен отклонять невалидные даты', () => {
    const data = [{ created: '2025-13-45' }]; // Несуществующая дата
    const schema = [{ name: 'created', type: 'date' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Advanced Validation - Text Length', () => {
  it('должен предупреждать о слишком длинном тексте', () => {
    const longText = 'a'.repeat(1500); // >1000 символов
    const data = [{ description: longText }];
    const schema = [{ name: 'description', type: 'text' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain('длинный');
  });

  it('должен пропускать нормальный текст', () => {
    const data = [{ description: 'Normal length text' }];
    const schema = [{ name: 'description', type: 'text' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.isValid).toBe(true);
  });
});

describe('Advanced Validation - Data Quality Analysis', () => {
  it('должен анализировать completeness (заполненность)', () => {
    const data = [
      { name: 'John', email: 'john@example.com' },
      { name: 'Jane', email: null },
      { name: null, email: 'bob@example.com' },
    ];

    const quality = advancedValidator.analyzeDataQuality(data);

    expect(quality.columns).toHaveLength(2);

    const nameColumn = quality.columns.find(c => c.name === 'name');
    expect(nameColumn?.completeness).toBeCloseTo(0.66, 1); // 2/3 заполнено
  });

  it('должен анализировать uniqueness (уникальность)', () => {
    const data = [
      { name: 'John' },
      { name: 'Jane' },
      { name: 'John' }, // Дубликат
    ];

    const quality = advancedValidator.analyzeDataQuality(data);

    const nameColumn = quality.columns.find(c => c.name === 'name');
    expect(nameColumn?.uniqueness).toBeCloseTo(0.66, 1); // 2 unique / 3 total
  });

  it('должен анализировать consistency (согласованность типов)', () => {
    const data = [
      { age: 25 },
      { age: 30 },
      { age: 'thirty-five' }, // Несогласованный тип
    ];

    const quality = advancedValidator.analyzeDataQuality(data);

    const ageColumn = quality.columns.find(c => c.name === 'age');
    expect(ageColumn?.consistency).toBeLessThan(1); // Не все значения одного типа
  });

  it('должен вычислять общий score качества', () => {
    const data = [
      { name: 'John', email: 'john@example.com', age: 25 },
      { name: 'Jane', email: 'jane@example.com', age: 30 },
      { name: 'Bob', email: 'bob@example.com', age: 35 },
    ];

    const quality = advancedValidator.analyzeDataQuality(data);

    expect(quality.overallScore).toBeGreaterThan(0.9); // Высокое качество
    expect(quality.overallScore).toBeLessThanOrEqual(1);
  });
});

describe('Advanced Validation - Custom Rules', () => {
  it('должен применять кастомные правила валидации', () => {
    const data = [{ age: 15 }];
    const schema = [{
      name: 'age',
      type: 'number' as const,
      rules: [{
        type: 'range' as const,
        message: 'Возраст должен быть от 18 до 100',
        params: { min: 18, max: 100 }
      }]
    }];

    const result = advancedValidator.validate(data, schema);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain('18');
  });

  it('должен применять несколько правил', () => {
    const data = [{ price: -10 }];
    const schema = [{
      name: 'price',
      type: 'number' as const,
      required: true,
      rules: [
        {
          type: 'range' as const,
          message: 'Цена не может быть отрицательной',
          params: { min: 0 }
        },
        {
          type: 'custom' as const,
          message: 'Цена слишком низкая для продажи',
          params: {
            validator: (value: number) => value >= 1
          }
        }
      ]
    }];

    const result = advancedValidator.validate(data, schema);

    expect(result.warnings.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Advanced Validation - Multiple Columns', () => {
  it('должен валидировать множество колонок', () => {
    const data = [{
      name: 'John Doe',
      email: 'john@example.com',
      phone: '(123) 456-7890',
      age: 30,
      website: 'https://johndoe.com'
    }];

    const schema = [
      { name: 'name', type: 'text' as const, required: true },
      { name: 'email', type: 'email' as const, required: true },
      { name: 'phone', type: 'phone' as const },
      { name: 'age', type: 'number' as const },
      { name: 'website', type: 'url' as const },
    ];

    const result = advancedValidator.validate(data, schema);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('должен находить ошибки в разных колонках', () => {
    const data = [{
      name: '',
      email: 'invalid-email',
      phone: 'abc',
      age: 'not-a-number'
    }];

    const schema = [
      { name: 'name', type: 'text' as const, required: true },
      { name: 'email', type: 'email' as const },
      { name: 'phone', type: 'phone' as const },
      { name: 'age', type: 'number' as const },
    ];

    const result = advancedValidator.validate(data, schema);

    expect(result.errors.length).toBeGreaterThanOrEqual(4); // Все 4 поля имеют ошибки
  });
});

describe('Advanced Validation - Statistics', () => {
  it('должен предоставлять статистику валидации', () => {
    const data = [
      { email: 'valid@example.com' },
      { email: 'invalid' },
      { email: 'another@example.com' },
    ];
    const schema = [{ name: 'email', type: 'email' as const }];

    const result = advancedValidator.validate(data, schema);

    expect(result.stats.totalRows).toBe(3);
    expect(result.stats.validRows).toBe(2);
    expect(result.stats.errorRows).toBe(1);
  });
});
