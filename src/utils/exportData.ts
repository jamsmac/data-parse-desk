import * as XLSX from 'xlsx';
import { NormalizedRow } from './parseData';

export function exportToCSV(data: NormalizedRow[], visibleColumns: string[], fileName: string = 'export.csv') {
  if (data.length === 0) return;

  // Create CSV content
  const headers = visibleColumns.join(',');
  const rows = data.map(row => 
    visibleColumns.map(col => {
      const value = row[col];
      // Escape commas and quotes
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
}

export function exportToExcel(data: NormalizedRow[], visibleColumns: string[], fileName: string = 'export.xlsx') {
  if (data.length === 0) return;

  // Create filtered data with only visible columns
  const filteredData = data.map(row => {
    const filtered: any = {};
    visibleColumns.forEach(col => {
      filtered[col] = row[col];
    });
    return filtered;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(filteredData, { header: visibleColumns });
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

  // Download
  XLSX.writeFile(workbook, fileName);
}
