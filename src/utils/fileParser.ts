import * as XLSX from 'xlsx';
import { detectColumns, normalizeRow, NormalizedRow } from './parseData';

export interface ParseResult {
  data: NormalizedRow[];
  headers: string[];
  fileName: string;
  rowCount: number;
  dateColumns: string[];
  amountColumns: string[];
}

export async function parseFile(file: File): Promise<ParseResult> {
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
  
  // Auto-detect delimiter
  const firstLine = text.split('\n')[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
  const { dateColumns, amountColumns } = detectColumns(headers);

  const data: NormalizedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    if (values.length !== headers.length) continue;

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
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
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { 
    raw: false,
    defval: '',
  });

  if (jsonData.length === 0) {
    throw new Error('Excel file is empty');
  }

  const headers = Object.keys(jsonData[0]);
  const { dateColumns, amountColumns } = detectColumns(headers);

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
