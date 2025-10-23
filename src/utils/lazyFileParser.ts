/**
 * Lazy File Parser Utilities
 * Dynamically imports heavy file parsing libraries only when needed
 * Reduces initial bundle size by ~961KB
 */

// Type definitions for lazy-loaded libraries
type Papa = typeof import('papaparse');
type ExcelJS = typeof import('exceljs');

// Cache for loaded libraries to avoid re-importing
let papaCache: Papa | null = null;
let excelJSCache: ExcelJS | null = null;

/**
 * Lazy load PapaParse library
 * Only loads when CSV files need to be parsed
 */
export async function loadPapaParse(): Promise<Papa> {
  if (papaCache) {
    return papaCache;
  }

  console.log('[LazyLoad] Loading PapaParse library...');
  const papa = await import('papaparse');
  papaCache = papa;
  console.log('[LazyLoad] PapaParse library loaded successfully');
  return papa;
}

/**
 * Lazy load ExcelJS library
 * Only loads when creating Excel files for export
 */
export async function loadExcelJS(): Promise<ExcelJS> {
  if (excelJSCache) {
    return excelJSCache;
  }

  console.log('[LazyLoad] Loading ExcelJS library...');
  const exceljs = await import('exceljs');
  excelJSCache = exceljs;
  console.log('[LazyLoad] ExcelJS library loaded successfully');
  return exceljs;
}

export type ParsedCSVData = {
  data: Record<string, string | number>[];
  errors: unknown[];
  meta: {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
    fields?: string[];
  };
};

/**
 * Parse CSV file using dynamically loaded PapaParse
 */
export async function parseCSV(file: File): Promise<ParsedCSVData> {
  const Papa = await loadPapaParse();

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => resolve(results),
      error: (error) => reject(error),
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });
  });
}

export type ParsedExcelData = {
  data: (string | number)[][];
  headers: string[];
  rowCount: number;
};

/**
 * Parse Excel file using dynamically loaded ExcelJS
 * Note: This project uses ExcelJS for Excel parsing (see fileParser.ts)
 * This function is kept for compatibility but should use the fileParser module instead
 */
export async function parseExcel(file: File): Promise<ParsedExcelData> {
  // Delegate to fileParser.ts which properly handles ExcelJS loading
  const { parseFile } = await import('./fileParser');
  return parseFile(file);
}

export type ParsedFileData = {
  data: Record<string, string | number | boolean | Date | null>[];
  headers: string[];
  rowCount: number;
  fileType: 'csv' | 'excel' | 'json';
};

/**
 * Auto-detect file type and parse accordingly
 */
export async function parseFile(file: File): Promise<ParsedFileData> {
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.csv')) {
      const result = await parseCSV(file);
      return {
        data: result.data,
        headers: result.meta.fields || [],
        rowCount: result.data.length,
        fileType: 'csv',
      };
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const result = await parseExcel(file);
      const headers = result.data[0] || [];
      const data = result.data.slice(1);

      return {
        data: data.map((row: (string | number)[]) => {
          const obj: Record<string, string | number> = {};
          headers.forEach((header: string, index: number) => {
            obj[header] = row[index];
          });
          return obj;
        }),
        headers,
        rowCount: data.length,
        fileType: 'excel',
      };
    } else if (fileName.endsWith('.json')) {
      // JSON parsing doesn't need external library
      const text = await file.text();
      const jsonData = JSON.parse(text);
      const data = Array.isArray(jsonData) ? jsonData : [jsonData];
      const headers = data.length > 0 ? Object.keys(data[0]) : [];

      return {
        data,
        headers,
        rowCount: data.length,
        fileType: 'json',
      };
    } else {
      throw new Error(`Unsupported file type: ${fileName}`);
    }
  } catch (error) {
    console.error('[LazyLoad] Error parsing file:', error);
    throw error;
  }
}

/**
 * Preload file parsers for better UX
 * Call this when user hovers over import button
 */
export async function preloadFileParsers(): Promise<void> {
  try {
    console.log('[LazyLoad] Preloading file parsers...');
    await Promise.all([
      loadExcelJS(),
      loadPapaParse(),
    ]);
    console.log('[LazyLoad] File parsers preloaded successfully');
  } catch (error) {
    console.error('[LazyLoad] Error preloading file parsers:', error);
  }
}

/**
 * Clear parser cache (useful for testing)
 */
export function clearParserCache(): void {
  papaCache = null;
  excelJSCache = null;
  console.log('[LazyLoad] Parser cache cleared');
}

/**
 * Get library size estimation for logging
 */
export function getLibrarySizeEstimation() {
  return {
    papaparse: '~200KB',
    exceljs: '~400KB',
    total: '~600KB (loaded on-demand)',
  };
}
