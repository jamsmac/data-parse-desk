import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'Asia/Tashkent';

// Date column synonyms (case-insensitive)
const DATE_SYNONYMS = [
  'date', 'datetime', 'timestamp', 'time', 
  'creation time', 'paying time', 'delivery time', 'refund time',
  'дата', 'время', 'дата операции', 'дата создания', 'создано', 
  'оплата', 'проведено', 'sana', 'vaqt'
];

// Amount column synonyms (case-insensitive)
const AMOUNT_SYNONYMS = [
  'amount', 'sum', 'total', 'price', 'order price', 'payment',
  'оплата', 'сумма', 'итого', 'цена', 'стоимость', 'оплачено'
];

// Date formats to try
const DATE_FORMATS = [
  'YYYY-MM-DD HH:mm:ss',
  'YYYY-MM-DD HH:mm',
  'YYYY-MM-DD',
  'YYYY/MM/DD HH:mm:ss',
  'YYYY/MM/DD HH:mm',
  'YYYY/MM/DD',
  'DD.MM.YYYY HH:mm:ss',
  'DD.MM.YYYY HH:mm',
  'DD.MM.YYYY',
  'DD/MM/YYYY HH:mm:ss',
  'DD/MM/YYYY HH:mm',
  'DD/MM/YYYY',
  'DD-MM-YYYY HH:mm:ss',
  'DD-MM-YYYY HH:mm',
  'DD-MM-YYYY',
  'MM/DD/YYYY h:mm A',
  'MM/DD/YYYY h:mm:ss A',
];

/**
 * Represents a normalized data row with parsed date and amount fields
 */
export interface NormalizedRow {
  /** Dynamic properties from the original data */
  [key: string]: any;
  /** ISO 8601 formatted date string */
  date_iso?: string;
  /** Date-only string (YYYY-MM-DD) */
  date_only?: string;
  /** Unix epoch timestamp in milliseconds */
  epoch_ms?: number;
  /** Normalized numeric amount */
  amount_num?: number;
  /** Hash for duplicate detection */
  row_hash?: string;
  /** Original raw data before normalization */
  _rawData: any;
  /** Source file name */
  _fileName: string;
}

/**
 * Creates a deterministic hash from row data for duplicate detection
 *
 * @param row - The data row to hash
 * @returns A base-36 encoded hash string
 *
 * @example
 * ```ts
 * const hash = createRowHash({ name: 'John', age: 30 });
 * // Returns something like "1a2b3c4d"
 * ```
 */
export function createRowHash(row: any): string {
  const sortedKeys = Object.keys(row).sort();
  const values = sortedKeys.map(key => String(row[key] ?? ''));
  const hashString = values.join('|');
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    const char = hashString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Automatically detects date and amount columns from headers
 *
 * Uses predefined synonyms in multiple languages (English, Russian, Uzbek)
 * to identify relevant columns.
 *
 * @param headers - Array of column header names
 * @returns Object containing detected date and amount column names
 *
 * @example
 * ```ts
 * const headers = ['Order Date', 'Customer', 'Total Amount'];
 * const { dateColumns, amountColumns } = detectColumns(headers);
 * // dateColumns: ['Order Date']
 * // amountColumns: ['Total Amount']
 * ```
 */
export function detectColumns(headers: string[]): {
  dateColumns: string[];
  amountColumns: string[];
} {
  const dateColumns: string[] = [];
  const amountColumns: string[] = [];

  headers.forEach(header => {
    const lower = header.toLowerCase().trim();
    
    if (DATE_SYNONYMS.some(syn => lower.includes(syn))) {
      dateColumns.push(header);
    }
    
    if (AMOUNT_SYNONYMS.some(syn => lower.includes(syn))) {
      amountColumns.push(header);
    }
  });

  return { dateColumns, amountColumns };
}

/**
 * Normalizes a date value into multiple formats
 *
 * Attempts to parse the input using various date formats and converts
 * to Asia/Tashkent timezone. Supports multiple date format patterns.
 *
 * @param value - The date value to normalize (string, number, or Date)
 * @returns Object containing normalized date formats or null values if parsing fails
 *
 * @example
 * ```ts
 * const result = normalizeDate('2024-01-15 10:30:00');
 * // {
 * //   date_iso: '2024-01-15T10:30:00+05:00',
 * //   date_only: '2024-01-15',
 * //   epoch_ms: 1705304400000
 * // }
 * ```
 */
export function normalizeDate(value: any): {
  date_iso: string | null;
  date_only: string | null;
  epoch_ms: number | null;
  error?: string;
} {
  if (!value || value === '') {
    return { date_iso: null, date_only: null, epoch_ms: null };
  }

  const dateStr = String(value).trim();

  // Try parsing with various formats
  for (const format of DATE_FORMATS) {
    const parsed = dayjs.tz(dateStr, format, TIMEZONE);
    if (parsed.isValid()) {
      return {
        date_iso: parsed.format(),
        date_only: parsed.format('YYYY-MM-DD'),
        epoch_ms: parsed.valueOf(),
      };
    }
  }

  // Try ISO format
  const isoDate = dayjs.tz(dateStr, TIMEZONE);
  if (isoDate.isValid()) {
    return {
      date_iso: isoDate.format(),
      date_only: isoDate.format('YYYY-MM-DD'),
      epoch_ms: isoDate.valueOf(),
    };
  }

  return {
    date_iso: null,
    date_only: null,
    epoch_ms: null,
    error: 'Invalid date format',
  };
}

export function normalizeAmount(value: any): {
  amount_num: number | null;
  error?: string;
} {
  if (!value || value === '') {
    return { amount_num: null };
  }

  let amountStr = String(value).trim();

  // Remove currency symbols and words
  amountStr = amountStr
    .replace(/UZS|сум|so'm|som/gi, '')
    .trim();

  // Detect delimiter pattern
  // If comma is used as decimal separator (European style)
  if (/\d+\.\d{3}/.test(amountStr) && /,\d{2}$/.test(amountStr)) {
    // 1.234.567,00 -> remove dots, replace comma with dot
    amountStr = amountStr.replace(/\./g, '').replace(',', '.');
  } 
  // If comma is thousand separator (US style)
  else if (/\d+,\d{3}/.test(amountStr)) {
    // 1,234,567.00 -> remove commas
    amountStr = amountStr.replace(/,/g, '');
  }
  // If space is thousand separator
  else if (/\d+\s\d{3}/.test(amountStr)) {
    // 1 234 567 -> remove spaces
    amountStr = amountStr.replace(/\s/g, '');
  }

  const num = parseFloat(amountStr);

  if (isNaN(num)) {
    return { amount_num: null, error: 'Invalid amount format' };
  }

  return { amount_num: num };
}

export function normalizeRow(
  row: any,
  dateColumns: string[],
  amountColumns: string[],
  fileName: string
): NormalizedRow {
  const normalized: NormalizedRow = {
    ...row,
    _rawData: row,
    _fileName: fileName,
  };

  // Normalize first date column found
  if (dateColumns.length > 0) {
    const dateValue = row[dateColumns[0]];
    const { date_iso, date_only, epoch_ms } = normalizeDate(dateValue);
    normalized.date_iso = date_iso || undefined;
    normalized.date_only = date_only || undefined;
    normalized.epoch_ms = epoch_ms || undefined;
  }

  // Normalize first amount column found
  if (amountColumns.length > 0) {
    const amountValue = row[amountColumns[0]];
    const { amount_num } = normalizeAmount(amountValue);
    normalized.amount_num = amount_num || undefined;
  }

  // Add row hash for duplicate detection
  normalized.row_hash = createRowHash(row);

  return normalized;
}

export function formatAmount(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount) + ' UZS';
}

export type GroupBy = 'day' | 'month' | 'year' | 'none';

export interface GroupedData {
  key: string;
  label: string;
  rows: NormalizedRow[];
  count: number;
  sum: number;
}

export function groupRows(rows: NormalizedRow[], groupBy: GroupBy): GroupedData[] {
  if (groupBy === 'none') {
    return [{
      key: 'all',
      label: 'All Data',
      rows,
      count: rows.length,
      sum: rows.reduce((acc, row) => acc + (row.amount_num || 0), 0),
    }];
  }

  const groups = new Map<string, NormalizedRow[]>();

  rows.forEach(row => {
    if (!row.date_only) return;

    let key: string;
    let label: string;

    const date = dayjs(row.date_only);

    switch (groupBy) {
      case 'day':
        key = date.format('YYYY-MM-DD');
        label = date.format('DD MMM YYYY');
        break;
      case 'month':
        key = date.format('YYYY-MM');
        label = date.format('MMMM YYYY');
        break;
      case 'year':
        key = date.format('YYYY');
        label = date.format('YYYY');
        break;
      default:
        return;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  return Array.from(groups.entries())
    .map(([key, rows]) => ({
      key,
      label: rows[0] ? (groupBy === 'day' ? dayjs(rows[0].date_only).format('DD MMM YYYY') :
                       groupBy === 'month' ? dayjs(rows[0].date_only).format('MMMM YYYY') :
                       dayjs(rows[0].date_only).format('YYYY')) : key,
      rows,
      count: rows.length,
      sum: rows.reduce((acc, row) => acc + (row.amount_num || 0), 0),
    }))
    .sort((a, b) => b.key.localeCompare(a.key)); // Latest first
}
