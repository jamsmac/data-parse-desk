import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';

interface ExportButtonProps {
  data: any[];
  fileName: string;
}

export function ExportButton({ data, fileName }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportToCSV = async () => {
    try {
      setExporting(true);
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${fileName}.csv`);
      toast.success('CSV экспортирован');
    } catch (error) {
      toast.error('Ошибка экспорта CSV');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Data');

      if (data.length > 0) {
        // Add headers
        const headers = Object.keys(data[0]);
        worksheet.addRow(headers);

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4CAF50' },
        };

        // Add data rows
        data.forEach((row) => {
          worksheet.addRow(Object.values(row));
        });

        // Auto-fit columns
        worksheet.columns.forEach((column) => {
          let maxLength = 0;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? String(cell.value).length : 10;
            if (columnLength > maxLength) {
              maxLength = columnLength;
            }
          });
          column.width = Math.min(maxLength + 2, 50);
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, `${fileName}.xlsx`);
      toast.success('Excel экспортирован');
    } catch (error) {
      toast.error('Ошибка экспорта Excel');
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting || data.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Экспорт...' : 'Экспорт'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} disabled={exporting}>
          <FileText className="mr-2 h-4 w-4" />
          Экспорт CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} disabled={exporting}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Экспорт Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
