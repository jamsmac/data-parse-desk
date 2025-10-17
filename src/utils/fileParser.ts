// Dynamic import для ExcelJS - загружается только при необходимости
import { detectColumns, normalizeRow, NormalizedRow } from './parseData';
import type { TableRow } from '@/types/common';

export interface ParseResult {
  data: NormalizedRow[];
  headers: string[];
  fileName: string;
  rowCount: number;
  dateColumns: string[];
  amountColumns: string[];
}

export async function parseFile(file: File): Promise<ParseResult> {
  // Short-circuit for size to avoid heavy processing during tests/perf
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File too large');
  }
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file, fileName);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file, fileName);
  } else {
    throw new Error('Unsupported file format. Please upload CSV, XLS, or XLSX files.');
  }
}

async function parseCSV(file: File, fileName: string): Promise<ParseResult> {
  const text = await file.text();
  
  // Normalize line endings
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Auto-detect delimiter
  const firstLine = normalizedText.split('\n')[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const lines = normalizedText.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse CSV with proper quote handling
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"' || char === "'") {
        if (inQuotes && (nextChar === '"' || nextChar === "'")) {
          // Escaped quote
          current += char;
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0], delimiter);
  const { dateColumns, amountColumns } = detectColumns(headers);

  const data: NormalizedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length !== headers.length) continue;

    const row: TableRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const normalized = normalizeRow(row, dateColumns, amountColumns, fileName);
    data.push(normalized);
  }

  return {
    data,
    headers,
    fileName,
    rowCount: data.length,
    dateColumns,
    amountColumns,
  };
}

async function parseExcel(file: File, fileName: string): Promise<ParseResult> {
  // Dynamic import для ExcelJS - загружается только при обработке Excel файлов
  const ExcelJS = await import('exceljs');

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Use first sheet
  const worksheet = workbook.worksheets[0];
  
  if (!worksheet || worksheet.rowCount === 0) {
    throw new Error('Excel file is empty');
  }

  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers.push(String(cell.value || `Column${colNumber}`));
  });

  const { dateColumns, amountColumns } = detectColumns(headers);

  // Parse data rows
  const jsonData: TableRow[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row
    
    const rowData: TableRow = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        rowData[header] = cell.value !== null ? String(cell.value) : '';
      }
    });
    
    if (Object.keys(rowData).length > 0) {
      jsonData.push(rowData);
    }
  });

  if (jsonData.length === 0) {
    throw new Error('Excel file contains no data rows');
  }

  const data = jsonData.map(row => 
    normalizeRow(row, dateColumns, amountColumns, fileName)
  );

  return {
    data,
    headers,
    fileName,
    rowCount: data.length,
    dateColumns,
    amountColumns,
  };
}
