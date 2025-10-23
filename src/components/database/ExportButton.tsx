import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileJson, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ExportDataDialog } from '@/components/export/ExportDataDialog';
import { toast } from 'sonner';
import { loadPapaParse, loadExcelJS, loadFileSaver } from '@/utils/lazyFileParser';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  fileName: string;
  columns?: string[];
}

export function ExportButton({ data, fileName, columns }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [showAdvancedDialog, setShowAdvancedDialog] = useState(false);

  const exportToCSV = async () => {
    try {
      setExporting(true);
      // Lazy load PapaParse only when exporting to CSV
      const Papa = await loadPapaParse();
      const csv = Papa.unparse(data);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${fileName}.csv`);
      toast.success('CSV экспортирован');
    } catch (_error) {
      toast.error('Ошибка экспорта CSV');
    } finally {
      setExporting(false);
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);

      // Lazy load ExcelJS only when exporting to Excel
      const ExcelJS = await loadExcelJS();

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
    } catch (_error) {
      toast.error('Ошибка экспорта Excel');
    } finally {
      setExporting(false);
    }
  };

  const exportToJSON = async () => {
    try {
      setExporting(true);
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      downloadBlob(blob, `${fileName}.json`);
      toast.success('JSON экспортирован');
    } catch (_error) {
      toast.error('Ошибка экспорта JSON');
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting || data.length === 0}
            aria-label={`Export ${data.length} rows. Choose format: CSV, Excel, or JSON`}
            title="Export data to file"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {exporting ? 'Экспорт...' : 'Экспорт'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" aria-label="Export format options">
          <DropdownMenuItem
            onClick={exportToCSV}
            disabled={exporting}
            aria-label="Quick export to CSV format"
          >
            <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
            Быстрый экспорт CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={exportToExcel}
            disabled={exporting}
            aria-label="Quick export to Excel format"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />
            Быстрый экспорт Excel
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={exportToJSON}
            disabled={exporting}
            aria-label="Quick export to JSON format"
          >
            <FileJson className="mr-2 h-4 w-4" aria-hidden="true" />
            Быстрый экспорт JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowAdvancedDialog(true)}
            disabled={exporting}
            aria-label="Open advanced export dialog with more options"
          >
            <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Расширенный экспорт...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ExportDataDialog
        open={showAdvancedDialog}
        onOpenChange={setShowAdvancedDialog}
        data={data}
        filename={fileName}
        columns={columns}
      />
    </>
  );
}
