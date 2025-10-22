/**
 * Lazy File Parser Utilities
 * Dynamically imports heavy file parsing libraries only when needed
 * Reduces initial bundle size by ~961KB
 */

// Type definitions for lazy-loaded libraries
type XLSX = typeof import('xlsx');
type Papa = typeof import('papaparse');

// Cache for loaded libraries to avoid re-importing
let xlsxCache: XLSX | null = null;
let papaCache: Papa | null = null;

/**
 * Lazy load XLSX library
 * Only loads when Excel/XLSX files need to be parsed
 */
export async function loadXLSX(): Promise<XLSX> {
  if (xlsxCache) {
    return xlsxCache;
  }

  console.log('[LazyLoad] Loading XLSX library...');
  const xlsx = await import('xlsx');
  xlsxCache = xlsx;
  console.log('[LazyLoad] XLSX library loaded successfully');
  return xlsx;
}

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
 * Parse CSV file using dynamically loaded PapaParse
 */
export async function parseCSV(file: File): Promise<any> {
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

/**
 * Parse Excel file using dynamically loaded XLSX
 */
export async function parseExcel(file: File): Promise<any> {
  const XLSX = await loadXLSX();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        resolve({
          data: jsonData,
          sheetName: firstSheetName,
          allSheets: workbook.SheetNames,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
}

/**
 * Auto-detect file type and parse accordingly
 */
export async function parseFile(file: File): Promise<{
  data: any[];
  headers: string[];
  rowCount: number;
  fileType: 'csv' | 'excel' | 'json';
}> {
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
        data: data.map((row: any[]) => {
          const obj: any = {};
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
      loadXLSX(),
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
  xlsxCache = null;
  papaCache = null;
  console.log('[LazyLoad] Parser cache cleared');
}
