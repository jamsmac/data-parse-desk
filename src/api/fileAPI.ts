import { supabase } from '@/integrations/supabase/client';
import { ColumnMapping, ValidationResult } from '@/types/database';

export class FileAPI {
  // Загрузка файла
  static async uploadFile(
    file: File,
    databaseId: string,
    userId: string
  ): Promise<{ fileId: string; fileName: string }> {
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
  static async parseFile(file: File): Promise<{
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }> {
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
  private static async parseCSV(file: File): Promise<{
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }> {
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
          const rows: Record<string, any>[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: Record<string, any> = {};

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
  private static async parseExcel(file: File): Promise<{
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }> {
    // Для простоты, можно использовать библиотеку xlsx
    // npm install xlsx
    throw new Error('Excel парсинг будет реализован с библиотекой xlsx');
  }

  // Парсинг JSON
  private static async parseJSON(file: File): Promise<{
    headers: string[];
    rows: Record<string, any>[];
    totalRows: number;
  }> {
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
    rows: Record<string, any>[],
    mapping: ColumnMapping[],
    schemas: Record<string, { type: string; required: boolean }>
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
            case 'number':
              if (isNaN(Number(value))) {
                errors.push({
                  row: rowIndex + 1,
                  column: map.targetColumn,
                  value,
                  message: `Значение "${value}" не является числом`,
                });
              }
              break;

            case 'email':
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

            case 'url':
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

            case 'boolean':
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
    rows: Record<string, any>[],
    mapping: ColumnMapping[]
  ): Promise<{ imported: number; failed: number }> {
    let imported = 0;
    let failed = 0;

    const mappedRows = rows.map((row) => {
      const mappedRow: Record<string, any> = {};

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
        const { data, error } = await supabase
          .rpc('bulk_insert_table_rows', {
            p_database_id: databaseId,
            p_rows: batch as any,
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
}
