import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import type { AnyObject, TableRow } from '@/types/common';

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

export interface NormalizedRow extends AnyObject {
  date_iso?: string;
  date_only?: string;
  epoch_ms?: number;
  amount_num?: number;
  row_hash?: string;
  _rawData: TableRow;
  _fileName: string;
}

// Create hash from row data for duplicate detection
export function createRowHash(row: TableRow): string {
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

export function normalizeDate(value: unknown): {
  date_iso: string | null;
  date_only: string | null;
  epoch_ms: number | null;
  error?: string;
} {
  if (!value || value === '') {
    return { date_iso: null, date_only: null, epoch_ms: null };
  }

  const dateStr = String(value).trim();

  try {
    // Try parsing with various formats
    for (const format of DATE_FORMATS) {
      const parsed = dayjs(dateStr, format, true);
      if (parsed.isValid()) {
        // Convert to timezone
        const tzDate = dayjs.tz(parsed.format('YYYY-MM-DD HH:mm:ss'), TIMEZONE);
        return {
          date_iso: tzDate.format(),
          date_only: tzDate.format('YYYY-MM-DD'),
          epoch_ms: tzDate.valueOf(),
        };
      }
    }

    // Try ISO format
    const isoDate = dayjs(dateStr);
    if (isoDate.isValid()) {
      const tzDate = dayjs.tz(isoDate.format('YYYY-MM-DD HH:mm:ss'), TIMEZONE);
      return {
        date_iso: tzDate.format(),
        date_only: tzDate.format('YYYY-MM-DD'),
        epoch_ms: tzDate.valueOf(),
      };
    }
  } catch (err) {
    // If any parsing error, return null values
    return {
      date_iso: null,
      date_only: null,
      epoch_ms: null,
      error: 'Invalid date format',
    };
  }

  return {
    date_iso: null,
    date_only: null,
    epoch_ms: null,
    error: 'Invalid date format',
  };
}

export function normalizeAmount(value: unknown): {
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
  row: TableRow,
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

export function formatAmount(amount: number | null | undefined, currency: string = ''): string {
  if (amount === null || amount === undefined) return '—';
  
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  
  return currency ? `${formatted} ${currency}` : formatted;
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
