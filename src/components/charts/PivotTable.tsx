import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpDown, Download } from 'lucide-react';
import { TableSchema } from '@/types/database';
import { AggregationType } from '@/types/charts';
import { TableRow as DataRow } from '@/types/common';

export interface PivotTableProps {
  data: DataRow[];
  columns: TableSchema[];
  onExport?: (data: unknown[][]) => void;
}

interface PivotConfig {
  rows: string[];
  columns: string[];
  values: { column: string; aggregation: AggregationType }[];
}

interface CellStats {
  sum: number;
  count: number;
  min: number;
  max: number;
  values: number[];
}

export function PivotTable({ data, columns, onExport }: PivotTableProps) {
  const [config, setConfig] = useState<PivotConfig>({
    rows: [],
    columns: [],
    values: [],
  });

  const availableColumns = columns.filter(
    (col) =>
      !config.rows.includes(col.column_name) &&
      !config.columns.includes(col.column_name) &&
      !config.values.find((v) => v.column === col.column_name)
  );

  const pivotData = useMemo(() => {
    if (config.rows.length === 0 || config.values.length === 0) {
      return null;
    }

    const grouped = new Map<string, Map<string, Record<string, CellStats>>>();

    // Group data
    data.forEach((row) => {
      const rowKey = config.rows.map((r) => row[r] || 'N/A').join('|');
      const colKey = config.columns.length > 0 
        ? config.columns.map((c) => row[c] || 'N/A').join('|')
        : 'Total';

      if (!grouped.has(rowKey)) {
        grouped.set(rowKey, new Map());
      }

      const rowGroup = grouped.get(rowKey)!;
      if (!rowGroup.has(colKey)) {
        rowGroup.set(colKey, {});
      }

      const cell = rowGroup.get(colKey)!;

      config.values.forEach((valueConfig) => {
        const value = parseFloat(String(row[valueConfig.column])) || 0;
        const key = valueConfig.column;

        if (!cell[key]) {
          cell[key] = { sum: 0, count: 0, min: Infinity, max: -Infinity, values: [] };
        }

        cell[key].sum += value;
        cell[key].count += 1;
        cell[key].min = Math.min(cell[key].min, value);
        cell[key].max = Math.max(cell[key].max, value);
        cell[key].values.push(value);
      });
    });

    // Get all column keys
    const allColKeys = new Set<string>();
    grouped.forEach((rowGroup) => {
      rowGroup.forEach((_, colKey) => {
        allColKeys.add(colKey);
      });
    });

    const sortedColKeys = Array.from(allColKeys).sort();

    // Build pivot table
    const result: (string | number)[][] = [];

    // Header row
    const header = [
      ...config.rows,
      ...sortedColKeys.flatMap((colKey) =>
        config.values.map((v) => `${colKey}|${v.column}`)
      ),
    ];
    result.push(header);

    // Data rows
    grouped.forEach((rowGroup, rowKey) => {
      const rowValues = rowKey.split('|');
      const dataRow: (string | number)[] = [...rowValues];

      sortedColKeys.forEach((colKey) => {
        const cell = rowGroup.get(colKey);

        config.values.forEach((valueConfig) => {
          if (cell && cell[valueConfig.column]) {
            const stats = cell[valueConfig.column];
            let value = 0;

            switch (valueConfig.aggregation) {
              case 'sum':
                value = stats.sum;
                break;
              case 'avg':
                value = stats.sum / stats.count;
                break;
              case 'count':
                value = stats.count;
                break;
              case 'min':
                value = stats.min;
                break;
              case 'max':
                value = stats.max;
                break;
            }

            dataRow.push(value);
          } else {
            dataRow.push(0);
          }
        });
      });

      result.push(dataRow);
    });

    return {
      data: result,
      colKeys: sortedColKeys,
    };
  }, [data, config]);

  const addRow = (columnName: string) => {
    setConfig((prev) => ({
      ...prev,
      rows: [...prev.rows, columnName],
    }));
  };

  const addColumn = (columnName: string) => {
    setConfig((prev) => ({
      ...prev,
      columns: [...prev.columns, columnName],
    }));
  };

  const addValue = (columnName: string) => {
    setConfig((prev) => ({
      ...prev,
      values: [...prev.values, { column: columnName, aggregation: 'sum' }],
    }));
  };

  const removeRow = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== index),
    }));
  };

  const removeColumn = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index),
    }));
  };

  const removeValue = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      values: prev.values.filter((_, i) => i !== index),
    }));
  };

  const updateValueAggregation = (index: number, aggregation: AggregationType) => {
    setConfig((prev) => ({
      ...prev,
      values: prev.values.map((v, i) => (i === index ? { ...v, aggregation } : v)),
    }));
  };

  const handleExport = () => {
    if (pivotData && onExport) {
      onExport(pivotData.data);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4 h-[calc(100vh-200px)]">
      {/* Configuration Panel */}
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle>Настройки сводной таблицы</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-6">
              {/* Available Columns */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Доступные поля</Label>
                <div className="space-y-1">
                  {availableColumns.map((column) => (
                    <div
                      key={column.id}
                      className="flex items-center justify-between p-2 bg-secondary rounded text-sm"
                    >
                      <span>{column.column_name}</span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => addRow(column.column_name)}
                        >
                          R
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => addColumn(column.column_name)}
                        >
                          C
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => addValue(column.column_name)}
                        >
                          V
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rows */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Строки</Label>
                {config.rows.length > 0 ? (
                  <div className="space-y-1">
                    {config.rows.map((row, index) => (
                      <div
                        key={`${row}-${index}`}
                        className="flex items-center justify-between p-2 bg-blue-100 dark:bg-blue-900 rounded"
                      >
                        <span className="text-sm">{row}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => removeRow(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground p-2 border-2 border-dashed rounded">
                    Нажмите R чтобы добавить
                  </div>
                )}
              </div>

              {/* Columns */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Столбцы</Label>
                {config.columns.length > 0 ? (
                  <div className="space-y-1">
                    {config.columns.map((col, index) => (
                      <div
                        key={`${col}-${index}`}
                        className="flex items-center justify-between p-2 bg-green-100 dark:bg-green-900 rounded"
                      >
                        <span className="text-sm">{col}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => removeColumn(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground p-2 border-2 border-dashed rounded">
                    Нажмите C чтобы добавить (опционально)
                  </div>
                )}
              </div>

              {/* Values */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Значения</Label>
                {config.values.length > 0 ? (
                  <div className="space-y-2">
                    {config.values.map((value, index) => (
                      <div
                        key={`${value.column}-${index}`}
                        className="p-2 bg-purple-100 dark:bg-purple-900 rounded space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{value.column}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => removeValue(index)}
                          >
                            ×
                          </Button>
                        </div>
                        <Select
                          value={value.aggregation}
                          onValueChange={(agg) =>
                            updateValueAggregation(index, agg as AggregationType)
                          }
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sum">Сумма</SelectItem>
                            <SelectItem value="avg">Среднее</SelectItem>
                            <SelectItem value="count">Количество</SelectItem>
                            <SelectItem value="min">Минимум</SelectItem>
                            <SelectItem value="max">Максимум</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground p-2 border-2 border-dashed rounded">
                    Нажмите V чтобы добавить
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {pivotData && (
            <div className="mt-4 pt-4 border-t">
              <Button onClick={handleExport} variant="outline" size="sm" className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Экспортировать
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pivot Table */}
      <Card className="col-span-3">
        <CardHeader>
          <CardTitle>Сводная таблица</CardTitle>
        </CardHeader>
        <CardContent>
          {pivotData ? (
            <ScrollArea className="h-[calc(100vh-300px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    {pivotData.data[0].map((header, i) => (
                      <TableHead key={i} className="font-semibold whitespace-nowrap">
                        {i < config.rows.length ? (
                          <Badge variant="outline">{header}</Badge>
                        ) : (
                          <span className="text-xs">{String(header).split('|').join(' - ')}</span>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pivotData.data.slice(1).map((row, rowIndex) => (
                    <TableRow key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <TableCell key={cellIndex} className="whitespace-nowrap">
                          {cellIndex < config.rows.length ? (
                            <span className="font-medium">{cell}</span>
                          ) : typeof cell === 'number' ? (
                            cell.toLocaleString('ru-RU', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })
                          ) : (
                            cell
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="h-[calc(100vh-300px)] flex items-center justify-center">
              <div className="text-center space-y-4">
                <ArrowUpDown className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="text-lg font-medium">Настройте сводную таблицу</div>
                <div className="text-sm text-muted-foreground max-w-md">
                  Добавьте поля в Строки (R) и Значения (V) для создания сводной таблицы.
                  Столбцы (C) опциональны.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
