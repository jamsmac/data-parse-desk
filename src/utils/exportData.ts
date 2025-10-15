import * as ExcelJS from 'exceljs';
import { NormalizedRow } from './parseData';
import type { TableRow } from '@/types/common';

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

export async function exportToExcel(data: NormalizedRow[], visibleColumns: string[], fileName: string = 'export.xlsx') {
  if (data.length === 0) return;

  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Add headers
  worksheet.columns = visibleColumns.map(col => ({
    header: col,
    key: col,
    width: 15
  }));

  // Add rows
  data.forEach(row => {
    const rowData: TableRow = {};
    visibleColumns.forEach(col => {
      rowData[col] = row[col];
    });
    worksheet.addRow(rowData);
  });

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
}
