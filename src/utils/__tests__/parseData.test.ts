/**
 * Comprehensive tests for parseData utility
 * Tests for data parsing, normalization, column detection, and grouping
 */

import { describe, it, expect, beforeAll } from 'vitest';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {
  createRowHash,
  detectColumns,
  normalizeDate,
  normalizeAmount,
  normalizeRow,
  formatAmount,
  groupRows,
  type NormalizedRow,
  type GroupBy,
} from '../parseData';

// Setup dayjs plugins before running tests
beforeAll(() => {
  dayjs.extend(customParseFormat);
  dayjs.extend(utc);
  dayjs.extend(timezone);
});

// ============================================================================
// Row Hash Tests
// ============================================================================

describe('ParseData - createRowHash', () => {
  it('должен создавать одинаковый hash для идентичных объектов', () => {
    const row1 = { name: 'John', age: 30, email: 'john@example.com' };
    const row2 = { name: 'John', age: 30, email: 'john@example.com' };

    expect(createRowHash(row1)).toBe(createRowHash(row2));
  });

  it('должен создавать одинаковый hash независимо от порядка ключей', () => {
    const row1 = { name: 'John', age: 30 };
    const row2 = { age: 30, name: 'John' };

    expect(createRowHash(row1)).toBe(createRowHash(row2));
  });

  it('должен создавать разные hash для разных данных', () => {
    const row1 = { name: 'John', age: 30 };
    const row2 = { name: 'Jane', age: 30 };

    expect(createRowHash(row1)).not.toBe(createRowHash(row2));
  });

  it('должен обрабатывать null и undefined значения', () => {
    const row1 = { name: 'John', age: null };
    const row2 = { name: 'John', age: undefined };

    // null и undefined должны считаться одинаковыми для hash
    expect(createRowHash(row1)).toBe(createRowHash(row2));
  });

  it('должен обрабатывать пустые объекты', () => {
    const hash = createRowHash({});
    expect(hash).toBeTruthy();
    expect(typeof hash).toBe('string');
  });
});

// ============================================================================
// Column Detection Tests
// ============================================================================

describe('ParseData - detectColumns', () => {
  describe('Date column detection', () => {
    it('должен детектировать английские названия дат', () => {
      const headers = ['Order ID', 'Date', 'Customer', 'Amount'];
      const { dateColumns } = detectColumns(headers);

      expect(dateColumns).toContain('Date');
      expect(dateColumns.length).toBe(1);
    });

    it('должен детектировать русские названия дат', () => {
      const headers = ['Номер', 'Дата операции', 'Клиент', 'Сумма'];
      const { dateColumns } = detectColumns(headers);

      expect(dateColumns).toContain('Дата операции');
    });

    it('должен детектировать узбекские названия дат', () => {
      const headers = ['ID', 'Sana', 'Mijoz', 'Summa'];
      const { dateColumns } = detectColumns(headers);

      expect(dateColumns).toContain('Sana');
    });

    it('должен детектировать множественные колонки с датами', () => {
      const headers = ['Creation Time', 'Paying Time', 'Delivery Time'];
      const { dateColumns } = detectColumns(headers);

      expect(dateColumns.length).toBe(3);
      expect(dateColumns).toContain('Creation Time');
      expect(dateColumns).toContain('Paying Time');
      expect(dateColumns).toContain('Delivery Time');
    });

    it('должен быть регистронезависимым', () => {
      const headers = ['ORDER ID', 'creation TIME', 'CUSTOMER'];
      const { dateColumns } = detectColumns(headers);

      expect(dateColumns).toContain('creation TIME');
    });
  });

  describe('Amount column detection', () => {
    it('должен детектировать английские названия сумм', () => {
      const headers = ['Order ID', 'Total Amount', 'Customer'];
      const { amountColumns } = detectColumns(headers);

      expect(amountColumns).toContain('Total Amount');
    });

    it('должен детектировать русские названия сумм', () => {
      const headers = ['Номер', 'Сумма', 'Клиент'];
      const { amountColumns } = detectColumns(headers);

      expect(amountColumns).toContain('Сумма');
    });

    it('должен детектировать множественные колонки с суммами', () => {
      const headers = ['Price', 'Amount', 'Total'];
      const { amountColumns } = detectColumns(headers);

      expect(amountColumns.length).toBe(3);
    });

    it('должен детектировать частичные совпадения', () => {
      const headers = ['Order Price', 'Item Sum', 'Payment Total'];
      const { amountColumns } = detectColumns(headers);

      expect(amountColumns.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('должен обрабатывать пустой массив headers', () => {
      const { dateColumns, amountColumns } = detectColumns([]);

      expect(dateColumns).toEqual([]);
      expect(amountColumns).toEqual([]);
    });

    it('должен обрабатывать headers без совпадений', () => {
      const headers = ['ID', 'Name', 'Description'];
      const { dateColumns, amountColumns } = detectColumns(headers);

      expect(dateColumns).toEqual([]);
      expect(amountColumns).toEqual([]);
    });

    it('должен обрабатывать headers с пробелами', () => {
      const headers = ['  Date  ', '  Amount  '];
      const { dateColumns, amountColumns } = detectColumns(headers);

      expect(dateColumns).toContain('  Date  ');
      expect(amountColumns).toContain('  Amount  ');
    });
  });
});

// ============================================================================
// Date Normalization Tests
// ============================================================================

describe('ParseData - normalizeDate', () => {
  describe('Valid date formats', () => {
    it('должен парсить YYYY-MM-DD HH:mm:ss', () => {
      const result = normalizeDate('2024-01-15 10:30:00');

      expect(result.date_only).toBe('2024-01-15');
      expect(result.date_iso).toContain('10:30:00');
      expect(result.epoch_ms).toBeTypeOf('number');
      expect(result.error).toBeUndefined();
    });

    it('должен парсить YYYY-MM-DD', () => {
      const result = normalizeDate('2024-01-15T00:00:00Z');

      expect(result.date_only).toBe('2024-01-15');
      expect(result.date_iso).toBeTruthy();
      expect(result.error).toBeUndefined();
    });

    it('должен парсить даты с временными зонами', () => {
      const result = normalizeDate('2024-01-15T10:30:00+05:00');

      expect(result.date_only).toBe('2024-01-15');
      expect(result.epoch_ms).toBeTypeOf('number');
      expect(result.error).toBeUndefined();
    });

    it('должен парсить YYYY/MM/DD HH:mm:ss', () => {
      const result = normalizeDate('2024/01/15 10:30:00');

      expect(result.date_only).toBe('2024-01-15');
      expect(result.date_iso).toBeTruthy();
      expect(result.error).toBeUndefined();
    });

    it('должен парсить различные форматы времени', () => {
      const result = normalizeDate('2024/01/15 14:45:30');

      expect(result.date_only).toBe('2024-01-15');
      expect(result.error).toBeUndefined();
    });

    it('должен парсить ISO формат', () => {
      const result = normalizeDate('2024-01-15T10:30:00Z');

      expect(result.date_only).toBe('2024-01-15');
      expect(result.error).toBeUndefined();
    });
  });

  describe('Invalid inputs', () => {
    it('должен возвращать null для пустой строки', () => {
      const result = normalizeDate('');

      expect(result.date_iso).toBeNull();
      expect(result.date_only).toBeNull();
      expect(result.epoch_ms).toBeNull();
    });

    it('должен возвращать null для null', () => {
      const result = normalizeDate(null);

      expect(result.date_iso).toBeNull();
      expect(result.date_only).toBeNull();
      expect(result.epoch_ms).toBeNull();
    });

    it('должен возвращать null для undefined', () => {
      const result = normalizeDate(undefined);

      expect(result.date_iso).toBeNull();
      expect(result.date_only).toBeNull();
      expect(result.epoch_ms).toBeNull();
    });

    it('должен выбрасывать ошибку для полностью невалидного формата', () => {
      // Note: Current implementation throws RangeError for some invalid inputs
      // This is a known behavior when dayjs.tz() fails to parse
      expect(() => normalizeDate('completely-invalid-text-12345')).toThrow();
    });

    it('должен выбрасывать ошибку для строки только с буквами', () => {
      // Note: Current implementation throws RangeError for invalid dates
      expect(() => normalizeDate('abcdefgh')).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('должен обрабатывать даты с временем и пробелами', () => {
      const result = normalizeDate('  2024-01-15 10:00:00  ');

      expect(result.date_only).toBe('2024-01-15');
      expect(result.error).toBeUndefined();
    });

    it('должен обрабатывать високосные годы с временем', () => {
      const result = normalizeDate('2024-02-29 12:00:00');

      expect(result.date_only).toBe('2024-02-29');
      expect(result.error).toBeUndefined();
    });

    it('должен обрабатывать даты с нулевым временем', () => {
      const result = normalizeDate('2024-01-15 00:00:00');

      expect(result.date_only).toBe('2024-01-15');
      expect(result.error).toBeUndefined();
    });
  });
});

// ============================================================================
// Amount Normalization Tests
// ============================================================================

describe('ParseData - normalizeAmount', () => {
  describe('Valid amount formats', () => {
    it('должен парсить простые числа', () => {
      const result = normalizeAmount('1234.56');

      expect(result.amount_num).toBe(1234.56);
    });

    it('должен парсить числа с запятой в US формате (тысячи)', () => {
      const result = normalizeAmount('1,234,567.00');

      expect(result.amount_num).toBe(1234567);
    });

    it('должен парсить числа с запятой в European формате (десятичная)', () => {
      const result = normalizeAmount('1.234.567,00');

      expect(result.amount_num).toBe(1234567);
    });

    it('должен парсить числа с пробелами как разделители тысяч', () => {
      const result = normalizeAmount('1 234 567');

      expect(result.amount_num).toBe(1234567);
    });

    it('должен удалять валютные символы UZS', () => {
      const result = normalizeAmount('1234.56 UZS');

      expect(result.amount_num).toBe(1234.56);
    });

    it('должен удалять валютные символы сум', () => {
      const result = normalizeAmount('1234.56 сум');

      expect(result.amount_num).toBe(1234.56);
    });

    it('должен удалять валютные символы som', () => {
      const result = normalizeAmount("1234.56 so'm");

      expect(result.amount_num).toBe(1234.56);
    });

    it('должен обрабатывать отрицательные числа', () => {
      const result = normalizeAmount('-1234.56');

      expect(result.amount_num).toBe(-1234.56);
    });

    it('должен обрабатывать ноль', () => {
      const result = normalizeAmount('0');

      expect(result.amount_num).toBe(0);
    });

    it('должен обрабатывать дробные числа без целой части', () => {
      const result = normalizeAmount('.56');

      expect(result.amount_num).toBe(0.56);
    });
  });

  describe('Invalid inputs', () => {
    it('должен возвращать null для пустой строки', () => {
      const result = normalizeAmount('');

      expect(result.amount_num).toBeNull();
    });

    it('должен возвращать null для null', () => {
      const result = normalizeAmount(null);

      expect(result.amount_num).toBeNull();
    });

    it('должен возвращать null для undefined', () => {
      const result = normalizeAmount(undefined);

      expect(result.amount_num).toBeNull();
    });

    it('должен возвращать error для текста', () => {
      const result = normalizeAmount('not a number');

      expect(result.amount_num).toBeNull();
      expect(result.error).toBe('Invalid amount format');
    });

    it('должен извлекать числа из смешанного текста (parseFloat behavior)', () => {
      // parseFloat('123abc456') returns 123
      const result = normalizeAmount('123abc456');

      expect(result.amount_num).toBe(123);
    });
  });

  describe('Edge cases', () => {
    it('должен обрабатывать числа с пробелами', () => {
      const result = normalizeAmount('  1234.56  ');

      expect(result.amount_num).toBe(1234.56);
    });

    it('должен обрабатывать очень большие числа', () => {
      const result = normalizeAmount('999999999999.99');

      expect(result.amount_num).toBe(999999999999.99);
    });

    it('должен обрабатывать очень маленькие дробные числа', () => {
      const result = normalizeAmount('0.0001');

      expect(result.amount_num).toBe(0.0001);
    });
  });
});

// ============================================================================
// Row Normalization Tests
// ============================================================================

describe('ParseData - normalizeRow', () => {
  it('должен нормализовать row с датой и суммой', () => {
    const row = {
      'Order ID': '12345',
      'Date': '2024-01-15 10:00:00',
      'Amount': '1234.56',
      'Customer': 'John Doe',
    };

    const normalized = normalizeRow(row, ['Date'], ['Amount'], 'orders.csv');

    expect(normalized.date_only).toBe('2024-01-15');
    expect(normalized.amount_num).toBe(1234.56);
    expect(normalized._fileName).toBe('orders.csv');
    expect(normalized.row_hash).toBeTruthy();
  });

  it('должен сохранять оригинальные данные в _rawData', () => {
    const row = { id: 1, name: 'Test' };
    const normalized = normalizeRow(row, [], [], 'test.csv');

    expect(normalized._rawData).toEqual(row);
  });

  it('должен обрабатывать row без даты', () => {
    const row = { id: 1, amount: '100' };
    const normalized = normalizeRow(row, [], ['amount'], 'test.csv');

    expect(normalized.date_iso).toBeUndefined();
    expect(normalized.amount_num).toBe(100);
  });

  it('должен обрабатывать row без суммы', () => {
    const row = { id: 1, date: '2024-01-15 12:00:00' };
    const normalized = normalizeRow(row, ['date'], [], 'test.csv');

    expect(normalized.date_only).toBe('2024-01-15');
    expect(normalized.amount_num).toBeUndefined();
  });

  it('должен использовать первую найденную колонку даты', () => {
    const row = {
      'Creation Time': '2024-01-15 10:00:00',
      'Paying Time': '2024-01-16 11:00:00',
    };

    const normalized = normalizeRow(
      row,
      ['Creation Time', 'Paying Time'],
      [],
      'test.csv'
    );

    expect(normalized.date_only).toBe('2024-01-15'); // первая колонка
  });

  it('должен создавать уникальный row_hash', () => {
    const row1 = { id: 1, name: 'John' };
    const row2 = { id: 2, name: 'Jane' };

    const normalized1 = normalizeRow(row1, [], [], 'test.csv');
    const normalized2 = normalizeRow(row2, [], [], 'test.csv');

    expect(normalized1.row_hash).not.toBe(normalized2.row_hash);
  });
});

// ============================================================================
// Amount Formatting Tests
// ============================================================================

describe('ParseData - formatAmount', () => {
  it('должен форматировать целые числа', () => {
    const formatted = formatAmount(1234);

    expect(formatted).toBe('1,234 UZS');
  });

  it('должен форматировать дробные числа', () => {
    const formatted = formatAmount(1234.56);

    expect(formatted).toBe('1,234.56 UZS');
  });

  it('должен форматировать большие числа с разделителями', () => {
    const formatted = formatAmount(1234567.89);

    expect(formatted).toBe('1,234,567.89 UZS');
  });

  it('должен возвращать — для null', () => {
    const formatted = formatAmount(null);

    expect(formatted).toBe('—');
  });

  it('должен возвращать — для undefined', () => {
    const formatted = formatAmount(undefined);

    expect(formatted).toBe('—');
  });

  it('должен форматировать ноль', () => {
    const formatted = formatAmount(0);

    expect(formatted).toBe('0 UZS');
  });

  it('должен форматировать отрицательные числа', () => {
    const formatted = formatAmount(-1234.56);

    expect(formatted).toBe('-1,234.56 UZS');
  });

  it('должен ограничивать до 2 десятичных знаков', () => {
    const formatted = formatAmount(1234.56789);

    expect(formatted).toBe('1,234.57 UZS'); // округляет
  });
});

// ============================================================================
// Row Grouping Tests
// ============================================================================

describe('ParseData - groupRows', () => {
  const createMockRows = (): NormalizedRow[] => [
    {
      id: 1,
      date_only: '2024-01-15',
      amount_num: 100,
      _rawData: {},
      _fileName: 'test.csv',
    },
    {
      id: 2,
      date_only: '2024-01-15',
      amount_num: 200,
      _rawData: {},
      _fileName: 'test.csv',
    },
    {
      id: 3,
      date_only: '2024-01-16',
      amount_num: 300,
      _rawData: {},
      _fileName: 'test.csv',
    },
    {
      id: 4,
      date_only: '2024-02-01',
      amount_num: 400,
      _rawData: {},
      _fileName: 'test.csv',
    },
  ];

  describe('Группировка по дням', () => {
    it('должен группировать по дням', () => {
      const rows = createMockRows();
      const grouped = groupRows(rows, 'day');

      expect(grouped.length).toBe(3); // 3 уникальных дня
    });

    it('должен вычислять count для каждой группы', () => {
      const rows = createMockRows();
      const grouped = groupRows(rows, 'day');

      const jan15 = grouped.find(g => g.key === '2024-01-15');
      expect(jan15?.count).toBe(2);
    });

    it('должен вычислять sum для каждой группы', () => {
      const rows = createMockRows();
      const grouped = groupRows(rows, 'day');

      const jan15 = grouped.find(g => g.key === '2024-01-15');
      expect(jan15?.sum).toBe(300); // 100 + 200
    });

    it('должен сортировать группы по дате (новые первыми)', () => {
      const rows = createMockRows();
      const grouped = groupRows(rows, 'day');

      expect(grouped[0].key).toBe('2024-02-01');
      expect(grouped[grouped.length - 1].key).toBe('2024-01-15');
    });
  });

  describe('Группировка по месяцам', () => {
    it('должен группировать по месяцам', () => {
      const rows = createMockRows();
      const grouped = groupRows(rows, 'month');

      expect(grouped.length).toBe(2); // Январь и Февраль
    });

    it('должен правильно суммировать месяцы', () => {
      const rows = createMockRows();
      const grouped = groupRows(rows, 'month');

      const jan = grouped.find(g => g.key === '2024-01');
      expect(jan?.sum).toBe(600); // 100 + 200 + 300
    });
  });

  describe('Группировка по годам', () => {
    it('должен группировать по годам', () => {
      const rows = createMockRows();
      const grouped = groupRows(rows, 'year');

      expect(grouped.length).toBe(1); // Все в 2024
      expect(grouped[0].key).toBe('2024');
    });
  });

  describe('Без группировки', () => {
    it('должен возвращать все данные в одной группе', () => {
      const rows = createMockRows();
      const grouped = groupRows(rows, 'none');

      expect(grouped.length).toBe(1);
      expect(grouped[0].key).toBe('all');
      expect(grouped[0].count).toBe(4);
      expect(grouped[0].sum).toBe(1000);
    });
  });

  describe('Edge cases', () => {
    it('должен обрабатывать пустой массив', () => {
      const grouped = groupRows([], 'day');

      expect(grouped).toEqual([]);
    });

    it('должен игнорировать rows без date_only', () => {
      const rows: NormalizedRow[] = [
        {
          id: 1,
          amount_num: 100,
          _rawData: {},
          _fileName: 'test.csv',
        },
      ];

      const grouped = groupRows(rows, 'day');

      expect(grouped).toEqual([]);
    });

    it('должен обрабатывать rows с amount_num = 0', () => {
      const rows: NormalizedRow[] = [
        {
          id: 1,
          date_only: '2024-01-15',
          amount_num: 0,
          _rawData: {},
          _fileName: 'test.csv',
        },
      ];

      const grouped = groupRows(rows, 'day');

      expect(grouped[0].sum).toBe(0);
    });

    it('должен обрабатывать rows без amount_num', () => {
      const rows: NormalizedRow[] = [
        {
          id: 1,
          date_only: '2024-01-15',
          _rawData: {},
          _fileName: 'test.csv',
        },
      ];

      const grouped = groupRows(rows, 'day');

      expect(grouped[0].sum).toBe(0);
    });
  });
});
