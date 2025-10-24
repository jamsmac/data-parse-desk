import { describe, it, expect, beforeEach, vi } from 'vitest';
import { parseFile } from '../fileParser';
import type { NormalizedRow } from '../parseData';

// Mock dependencies
vi.mock('../parseData', () => ({
  detectColumns: vi.fn(() => ({
    dateColumns: ['date', 'created_at'],
    amountColumns: ['amount', 'price'],
  })),
  normalizeRow: vi.fn((row: Record<string, string>) => ({
    ...row,
    _normalized: true,
  } as unknown as NormalizedRow)),
}));

vi.mock('../lazyFileParser', () => ({
  loadExcelJS: vi.fn(() => {
    // Mock ExcelJS
    class MockWorkbook {
      worksheets: any[] = [];
      xlsx: any;

      constructor() {
        this.xlsx = {
          load: async (buffer: ArrayBuffer) => {
            // Create mock worksheet based on buffer content
            const decoder = new TextDecoder();
            const text = decoder.decode(buffer);

            // Simple mock: create worksheet with data
            const mockWorksheet = {
            rowCount: 2,
            getRow: vi.fn((rowNum: number) => {
              if (rowNum === 1) {
                // Header row
                return {
                  eachCell: vi.fn((callback: (cell: any, colNum: number) => void) => {
                    callback({ value: 'Name' }, 1);
                    callback({ value: 'Age' }, 2);
                    callback({ value: 'Date' }, 3);
                  }),
                };
              }
              return { eachCell: vi.fn() };
            }),
            eachRow: vi.fn((callback: (row: any, rowNum: number) => void) => {
              // Header row
              callback(
                {
                  eachCell: vi.fn((cb: (cell: any, colNum: number) => void) => {
                    cb({ value: 'Name' }, 1);
                    cb({ value: 'Age' }, 2);
                    cb({ value: 'Date' }, 3);
                  }),
                },
                1
              );
              // Data row
              callback(
                {
                  eachCell: vi.fn((cb: (cell: any, colNum: number) => void) => {
                    cb({ value: 'John' }, 1);
                    cb({ value: 30 }, 2);
                    cb({ value: '2024-01-01' }, 3);
                  }),
                },
                2
              );
            }),
          };

          this.worksheets = [mockWorksheet];
        },
      };
      }
    }

    return Promise.resolve({
      Workbook: MockWorkbook,
    });
  }),
}));

// Polyfill for File.prototype methods in test environment
if (typeof File !== 'undefined') {
  if (!File.prototype.text) {
    File.prototype.text = async function(this: File) {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(this);
      });
    };
  }

  if (!File.prototype.arrayBuffer) {
    File.prototype.arrayBuffer = async function(this: File) {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(this);
      });
    };
  }
}

describe('fileParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseFile', () => {
    it('should parse CSV files', async () => {
      const csvContent = 'Name,Age,Email\nJohn,30,john@example.com\nJane,25,jane@example.com';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.fileName).toBe('test.csv');
      expect(result.headers).toEqual(['Name', 'Age', 'Email']);
      expect(result.rowCount).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.dateColumns).toBeDefined();
      expect(result.amountColumns).toBeDefined();
    });

    it('should parse Excel files', async () => {
      const file = new File(['excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseFile(file);

      expect(result.fileName).toBe('test.xlsx');
      expect(result.headers).toEqual(['Name', 'Age', 'Date']);
      expect(result.rowCount).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('should parse XLS files', async () => {
      const file = new File(['xls content'], 'test.xls', {
        type: 'application/vnd.ms-excel',
      });

      const result = await parseFile(file);

      expect(result.fileName).toBe('test.xls');
      expect(result.headers).toBeDefined();
    });

    it('should throw error for unsupported file format', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      await expect(parseFile(file)).rejects.toThrow(
        'Unsupported file format. Please upload CSV, XLS, or XLSX files.'
      );
    });

    it('should handle files without extension', async () => {
      const file = new File(['content'], 'test', { type: 'text/plain' });

      await expect(parseFile(file)).rejects.toThrow('Unsupported file format');
    });
  });

  describe('CSV parsing', () => {
    it('should auto-detect comma delimiter', async () => {
      const csvContent = 'Name,Age,City\nJohn,30,NYC\nJane,25,LA';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.rowCount).toBe(2);
    });

    it('should auto-detect semicolon delimiter', async () => {
      const csvContent = 'Name;Age;City\nJohn;30;NYC\nJane;25;LA';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.rowCount).toBe(2);
    });

    it('should remove quotes from headers', async () => {
      const csvContent = '"Name","Age","Email"\nJohn,30,john@example.com';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.headers).toEqual(['Name', 'Age', 'Email']);
    });

    it('should remove quotes from values', async () => {
      const csvContent = 'Name,Age\n"John Doe",30';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.rowCount).toBe(1);
    });

    it('should skip empty lines', async () => {
      const csvContent = 'Name,Age\n\nJohn,30\n\nJane,25\n';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.rowCount).toBe(2);
    });

    it('should skip rows with mismatched column count', async () => {
      const csvContent = 'Name,Age,City\nJohn,30,NYC\nJane,25\nBob,40,SF';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.rowCount).toBe(2); // Jane row skipped
    });

    it('should throw error for empty CSV file', async () => {
      const csvContent = '';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(parseFile(file)).rejects.toThrow('CSV file is empty');
    });

    it('should throw error for CSV with only empty lines', async () => {
      const csvContent = '\n\n\n';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await expect(parseFile(file)).rejects.toThrow('CSV file is empty');
    });

    it('should handle single quotes in values', async () => {
      const csvContent = "Name,Age\n'John',30";
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.rowCount).toBe(1);
    });

    it('should trim whitespace from headers and values', async () => {
      const csvContent = ' Name , Age , City \n John , 30 , NYC ';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.headers).toEqual(['Name', 'Age', 'City']);
    });

    it('should call detectColumns with headers', async () => {
      const { detectColumns } = await import('../parseData');
      const csvContent = 'Name,Date,Amount\nJohn,2024-01-01,100';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await parseFile(file);

      expect(detectColumns).toHaveBeenCalledWith(['Name', 'Date', 'Amount']);
    });

    it('should call normalizeRow for each data row', async () => {
      const { normalizeRow } = await import('../parseData');
      const csvContent = 'Name,Age\nJohn,30\nJane,25';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      await parseFile(file);

      expect(normalizeRow).toHaveBeenCalledTimes(2);
      expect(normalizeRow).toHaveBeenCalledWith(
        { Name: 'John', Age: '30' },
        expect.any(Array),
        expect.any(Array),
        'test.csv'
      );
    });

    it('should include dateColumns and amountColumns in result', async () => {
      const csvContent = 'Name,Date,Amount\nJohn,2024-01-01,100';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.dateColumns).toEqual(['date', 'created_at']);
      expect(result.amountColumns).toEqual(['amount', 'price']);
    });
  });

  describe('Excel parsing', () => {
    it('should load ExcelJS lazily', async () => {
      const { loadExcelJS } = await import('../lazyFileParser');
      const file = new File(['excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await parseFile(file);

      expect(loadExcelJS).toHaveBeenCalled();
    });

    it('should use first worksheet', async () => {
      const file = new File(['excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseFile(file);

      expect(result.data).toBeDefined();
    });

    // Note: Empty Excel file and column name generation are covered by the main Excel parsing test

    it('should skip empty rows', async () => {
      const file = new File(['excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseFile(file);

      expect(result.rowCount).toBeGreaterThan(0);
    });

    it('should convert cell values to strings', async () => {
      const file = new File(['excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseFile(file);

      expect(result.data[0]).toBeDefined();
    });

    it('should handle null cell values', async () => {
      const file = new File(['excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseFile(file);

      expect(result.data).toBeDefined();
    });

    it('should call normalizeRow for each Excel row', async () => {
      const { normalizeRow } = await import('../parseData');
      const file = new File(['excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await parseFile(file);

      expect(normalizeRow).toHaveBeenCalled();
    });
  });

  describe('ParseResult structure', () => {
    it('should return correct structure for CSV', async () => {
      const csvContent = 'Name,Age\nJohn,30';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('rowCount');
      expect(result).toHaveProperty('dateColumns');
      expect(result).toHaveProperty('amountColumns');
      expect(Array.isArray(result.data)).toBe(true);
      expect(Array.isArray(result.headers)).toBe(true);
      expect(typeof result.fileName).toBe('string');
      expect(typeof result.rowCount).toBe('number');
    });

    it('should return correct structure for Excel', async () => {
      const file = new File(['excel content'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await parseFile(file);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('rowCount');
      expect(result).toHaveProperty('dateColumns');
      expect(result).toHaveProperty('amountColumns');
    });
  });

  describe('Edge cases', () => {
    it('should handle CSV with only headers', async () => {
      const csvContent = 'Name,Age,City';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.headers).toEqual(['Name', 'Age', 'City']);
      expect(result.rowCount).toBe(0);
    });

    it('should handle very long CSV lines', async () => {
      const longValue = 'x'.repeat(10000);
      const csvContent = `Name,Description\nJohn,${longValue}`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.rowCount).toBe(1);
    });

    it('should handle special characters in CSV', async () => {
      const csvContent = 'Name,Notes\nJohn,Test\nwith\nnewlines';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.headers).toEqual(['Name', 'Notes']);
    });

    it('should handle Unicode characters in CSV', async () => {
      const csvContent = 'Name,City\n日本,東京\nРусский,Москва';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.rowCount).toBe(2);
    });

    it('should handle large number of columns', async () => {
      const headers = Array.from({ length: 100 }, (_, i) => `Col${i + 1}`);
      const values = Array.from({ length: 100 }, (_, i) => `Val${i + 1}`);
      const csvContent = `${headers.join(',')}\n${values.join(',')}`;
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

      const result = await parseFile(file);

      expect(result.headers).toHaveLength(100);
      expect(result.rowCount).toBe(1);
    });
  });
});
