import { describe, it, expect } from 'vitest';
import { formatAmount, normalizeDate, parseCSV } from './parseData';

describe('formatAmount', () => {
  it('should format positive numbers with spaces', () => {
    expect(formatAmount(1000)).toBe('1 000');
    expect(formatAmount(1000000)).toBe('1 000 000');
  });

  it('should format negative numbers', () => {
    expect(formatAmount(-1000)).toBe('-1 000');
  });

  it('should handle decimal numbers', () => {
    expect(formatAmount(1234.56)).toBe('1 234.56');
  });

  it('should handle zero', () => {
    expect(formatAmount(0)).toBe('0');
  });
});

describe('normalizeDate', () => {
  it('should parse ISO date strings', () => {
    const result = normalizeDate('2024-01-15');
    expect(result).toBeTruthy();
    expect(result?.toISOString()).toContain('2024-01-15');
  });

  it('should parse dates with time', () => {
    const result = normalizeDate('2024-01-15 10:30:00');
    expect(result).toBeTruthy();
  });

  it('should return null for invalid dates', () => {
    expect(normalizeDate('invalid')).toBeNull();
    expect(normalizeDate('')).toBeNull();
  });

  it('should handle various date formats', () => {
    expect(normalizeDate('15.01.2024')).toBeTruthy();
    expect(normalizeDate('01/15/2024')).toBeTruthy();
  });
});

describe('parseCSV', () => {
  it('should parse simple CSV', () => {
    const csv = 'name,age\nJohn,30\nJane,25';
    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: 'John', age: '30' });
    expect(result[1]).toEqual({ name: 'Jane', age: '25' });
  });

  it('should handle empty CSV', () => {
    const result = parseCSV('');
    expect(result).toEqual([]);
  });

  it('should handle CSV with headers only', () => {
    const result = parseCSV('name,age');
    expect(result).toEqual([]);
  });

  it('should handle CSV with quoted values', () => {
    const csv = 'name,description\nJohn,"A nice, person"\nJane,"Another person"';
    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0].description).toBe('A nice, person');
  });

  it('should skip empty lines', () => {
    const csv = 'name,age\n\nJohn,30\n\nJane,25\n';
    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
  });
});
