import { supabase } from '@/integrations/supabase/client';
import { ColumnMapping, ValidationResult, TableFilters } from '@/types/database';
import { AnyObject, TableRow } from '@/types/common';

interface ParsedFile {
  headers: string[];
  rows: TableRow[];
  totalRows: number;
}

interface FileUploadResult {
  fileId: string;
  fileName: string;
}

interface ImportResult {
  imported: number;
  failed: number;
}

interface SchemaDefinition {
  type: string;
  required: boolean;
}

export class FileAPI {
  // Загрузка файла
  static async uploadFile(
    file: File,
    databaseId: string,
    userId: string
  ): Promise<FileUploadResult> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `${userId}/${databaseId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(filePath, file);

    if (error) throw error;

    return {
      fileId: data.path,
      fileName: file.name,
    };
  }

  // Парсинг файла
  static async parseFile(file: File): Promise<ParsedFile> {
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'csv') {
      return this.parseCSV(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      return this.parseExcel(file);
    } else if (ext === 'json') {
      return this.parseJSON(file);
    } else {
      throw new Error('Неподдерживаемый формат файла');
    }
  }

  // Парсинг CSV
  private static async parseCSV(file: File): Promise<ParsedFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());

          if (lines.length === 0) {
            reject(new Error('Файл пуст'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const rows: TableRow[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: TableRow = {};

            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });

            rows.push(row);
          }

          resolve({
            headers,
            rows,
            totalRows: rows.length,
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }

  // Парсинг Excel
  private static async parseExcel(file: File): Promise<ParsedFile> {
    // Для простоты, можно использовать библиотеку xlsx
    // npm install xlsx
    throw new Error('Excel парсинг будет реализован с библиотекой xlsx');
  }

  // Парсинг JSON
  private static async parseJSON(file: File): Promise<ParsedFile> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const data = JSON.parse(text);

          if (!Array.isArray(data)) {
            reject(new Error('JSON должен содержать массив объектов'));
            return;
          }

          if (data.length === 0) {
            reject(new Error('JSON файл пуст'));
            return;
          }

          const headers = Object.keys(data[0]);
          const rows = data;

          resolve({
            headers,
            rows,
            totalRows: rows.length,
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsText(file);
    });
  }

  // Автоматический маппинг колонок
  static suggestColumnMapping(
    fileHeaders: string[],
    tableColumns: string[]
  ): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];

    for (const fileHeader of fileHeaders) {
      let bestMatch = '';
      let bestConfidence = 0;

      for (const tableColumn of tableColumns) {
        const confidence = this.calculateSimilarity(
          fileHeader.toLowerCase(),
          tableColumn.toLowerCase()
        );

        if (confidence > bestConfidence) {
          bestConfidence = confidence;
          bestMatch = tableColumn;
        }
      }

      mappings.push({
        sourceColumn: fileHeader,
        targetColumn: bestMatch,
        confidence: bestConfidence,
      });
    }

    return mappings;
  }

  // Расчет схожести строк (Levenshtein distance)
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
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

  // Валидация данных перед импортом
  static validateData(
    rows: TableRow[],
    mapping: ColumnMapping[],
    schemas: Record<string, SchemaDefinition>
  ): ValidationResult {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    rows.forEach((row, rowIndex) => {
      mapping.forEach((map) => {
        const value = row[map.sourceColumn];
        const schema = schemas[map.targetColumn];

        if (!schema) return;

        // Проверка обязательных полей
        if (schema.required && (value === null || value === undefined || value === '')) {
          errors.push({
            row: rowIndex + 1,
            column: map.targetColumn,
            value,
            message: `Обязательное поле "${map.targetColumn}" пусто`,
          });
        }

        // Проверка типов данных
        if (value !== null && value !== undefined && value !== '') {
          switch (schema.type) {
            case 'number': {
              if (isNaN(Number(value))) {
                errors.push({
                  row: rowIndex + 1,
                  column: map.targetColumn,
                  value,
                  message: `Значение "${value}" не является числом`,
                });
              }
              break;
            }

            case 'email': {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(String(value))) {
                errors.push({
                  row: rowIndex + 1,
                  column: map.targetColumn,
                  value,
                  message: `Значение "${value}" не является валидным email`,
                });
              }
              break;
            }

            case 'url': {
              try {
                new URL(String(value));
              } catch {
                errors.push({
                  row: rowIndex + 1,
                  column: map.targetColumn,
                  value,
                  message: `Значение "${value}" не является валидным URL`,
                });
              }
              break;
            }

            case 'boolean': {
              const booleanValues = ['true', 'false', '1', '0', 'yes', 'no', 'да', 'нет'];
              if (!booleanValues.includes(String(value).toLowerCase())) {
                warnings.push({
                  row: rowIndex + 1,
                  column: map.targetColumn,
                  value,
                  message: `Значение "${value}" будет преобразовано в boolean`,
                });
              }
              break;
            }
          }
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Импорт данных в базу
  static async importData(
    databaseId: string,
    rows: TableRow[],
    mapping: ColumnMapping[]
  ): Promise<ImportResult> {
    let imported = 0;
    let failed = 0;

    const mappedRows = rows.map((row) => {
      const mappedRow: TableRow = {};

      mapping.forEach((map) => {
        if (map.targetColumn) {
          mappedRow[map.targetColumn] = row[map.sourceColumn];
        }
      });

      return mappedRow;
    });

    // Импортируем пакетами по 100 строк
    const batchSize = 100;
    for (let i = 0; i < mappedRows.length; i += batchSize) {
      const batch = mappedRows.slice(i, i + batchSize);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)('bulk_insert_table_rows', {
          p_database_id: databaseId,
          p_rows: batch,
        });

        if (error) {
          failed += batch.length;
        } else {
          imported += batch.length;
        }
      } catch (error) {
        failed += batch.length;
      }
    }

    return { imported, failed };
  }

  // Получение данных таблицы для экспорта
  static async getTableData(
    databaseId: string, 
    filters?: TableFilters
  ): Promise<TableRow[]> {
    try {
      // Используем RPC функцию для получения данных таблицы
      // В реальном приложении эта функция должна быть создана в Supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_table_data', {
        p_database_id: databaseId,
        p_filters: filters ? JSON.stringify(filters) : null,
      });

      if (error) {
        console.error('Error fetching table data:', error);
        // Fallback: возвращаем пустой массив если функция не существует
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTableData:', error);
      // Возвращаем пустой массив как fallback
      return [];
    }
  }

  // Конвертация данных в CSV формат
  static convertToCSV(data: TableRow[]): string {
    if (data.length === 0) {
      return '';
    }

    // Получаем заголовки из первого объекта
    const headers = Object.keys(data[0]);
    
    // Функция для экранирования значений CSV
    const escapeCSV = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '';
      }
      
      const stringValue = String(value);
      
      // Если значение содержит запятую, кавычку или перенос строки, оборачиваем в кавычки
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };

    // Создаем строку заголовков
    const csvHeaders = headers.map(h => escapeCSV(h)).join(',');
    
    // Создаем строки данных
    const csvRows = data.map(row => {
      return headers.map(header => escapeCSV(row[header])).join(',');
    });

    // Объединяем все в одну строку
    return [csvHeaders, ...csvRows].join('\n');
  }
}
