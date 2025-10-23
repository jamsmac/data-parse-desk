import { useState } from 'react';
import { Download, FileJson, FileText, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

export type ExportFormat = 'csv' | 'json';

interface ExportDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Record<string, unknown>[];
  filename: string;
  columns?: string[];
}

export function ExportDataDialog({
  open,
  onOpenChange,
  data,
  filename,
  columns,
}: ExportDataDialogProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    columns || Object.keys(data[0] || {})
  );
  const [isExporting, setIsExporting] = useState(false);

  const availableColumns = columns || Object.keys(data[0] || {});

  const toggleColumn = (column: string) => {
    setSelectedColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column]
    );
  };

  const toggleAllColumns = () => {
    setSelectedColumns(
      selectedColumns.length === availableColumns.length ? [] : availableColumns
    );
  };

  const filterData = (rows: Record<string, unknown>[]) => {
    return rows.map((row) => {
      const filtered: Record<string, unknown> = {};
      selectedColumns.forEach((col) => {
        filtered[col] = row[col];
      });
      return filtered;
    });
  };

  const exportToCSV = () => {
    const filteredData = filterData(data);
    const headers = selectedColumns;

    let csvContent = '';

    if (includeHeaders) {
      csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';
    }

    filteredData.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return '""';
        const stringValue = String(value).replace(/"/g, '""');
        return `"${stringValue}"`;
      });
      csvContent += values.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToJSON = () => {
    const filteredData = filterData(data);

    const jsonString = JSON.stringify(filteredData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите хотя бы одну колонку для экспорта',
        variant: 'destructive',
      });
      return;
    }

    if (data.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Нет данных для экспорта',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      switch (format) {
        case 'csv':
          exportToCSV();
          break;
        case 'json':
          exportToJSON();
          break;
      }

      toast({
        title: 'Успешно',
        description: `Данные экспортированы в формате ${format.toUpperCase()}`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Ошибка экспорта',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Экспорт данных</DialogTitle>
          <DialogDescription>
            Выберите формат и колонки для экспорта ({data.length} записей)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label>Формат экспорта</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  CSV (Comma-Separated Values)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
                  <FileJson className="h-4 w-4" />
                  JSON (JavaScript Object Notation)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Include Headers */}
          {format === 'csv' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="headers"
                checked={includeHeaders}
                onCheckedChange={(checked) => setIncludeHeaders(checked as boolean)}
              />
              <Label htmlFor="headers" className="cursor-pointer">
                Включить заголовки колонок
              </Label>
            </div>
          )}

          {/* Column Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Выберите колонки</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleAllColumns}
              >
                {selectedColumns.length === availableColumns.length
                  ? 'Снять все'
                  : 'Выбрать все'}
              </Button>
            </div>

            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
              {availableColumns.map((column) => (
                <div key={column} className="flex items-center space-x-2">
                  <Checkbox
                    id={`col-${column}`}
                    checked={selectedColumns.includes(column)}
                    onCheckedChange={() => toggleColumn(column)}
                  />
                  <Label
                    htmlFor={`col-${column}`}
                    className="cursor-pointer font-normal"
                  >
                    {column}
                  </Label>
                </div>
              ))}
            </div>

            <p className="text-sm text-muted-foreground">
              Выбрано: {selectedColumns.length} из {availableColumns.length}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Экспорт...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Экспортировать
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
