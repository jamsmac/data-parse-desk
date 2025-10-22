/**
 * Heatmap Chart Component
 * Визуализация данных в виде тепловой карты
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface HeatmapCell {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
}

export interface HeatmapChartProps {
  data: HeatmapCell[];
  title?: string;
  description?: string;
  colorScheme?: 'blue' | 'green' | 'red' | 'purple' | 'orange';
  showValues?: boolean;
  showLegend?: boolean;
  cellSize?: number;
  className?: string;
  onCellClick?: (cell: HeatmapCell) => void;
}

const COLOR_SCHEMES = {
  blue: {
    low: '#dbeafe',
    mediumLow: '#93c5fd',
    medium: '#3b82f6',
    mediumHigh: '#2563eb',
    high: '#1e40af',
  },
  green: {
    low: '#d1fae5',
    mediumLow: '#6ee7b7',
    medium: '#10b981',
    mediumHigh: '#059669',
    high: '#047857',
  },
  red: {
    low: '#fee2e2',
    mediumLow: '#fca5a5',
    medium: '#ef4444',
    mediumHigh: '#dc2626',
    high: '#b91c1c',
  },
  purple: {
    low: '#f3e8ff',
    mediumLow: '#d8b4fe',
    medium: '#a855f7',
    mediumHigh: '#9333ea',
    high: '#7e22ce',
  },
  orange: {
    low: '#ffedd5',
    mediumLow: '#fdba74',
    medium: '#f97316',
    mediumHigh: '#ea580c',
    high: '#c2410c',
  },
};

export function HeatmapChart({
  data,
  title,
  description,
  colorScheme = 'blue',
  showValues = true,
  showLegend = true,
  cellSize = 60,
  className,
  onCellClick,
}: HeatmapChartProps) {
  // Получаем уникальные значения для осей
  const { xLabels, yLabels, minValue, maxValue, cellMap } = useMemo(() => {
    const xSet = new Set<string>();
    const ySet = new Set<string>();
    let min = Infinity;
    let max = -Infinity;

    const map = new Map<string, HeatmapCell>();

    data.forEach((cell) => {
      const xKey = String(cell.x);
      const yKey = String(cell.y);
      xSet.add(xKey);
      ySet.add(yKey);

      if (cell.value < min) min = cell.value;
      if (cell.value > max) max = cell.value;

      map.set(`${xKey}-${yKey}`, cell);
    });

    return {
      xLabels: Array.from(xSet).sort(),
      yLabels: Array.from(ySet).sort(),
      minValue: min === Infinity ? 0 : min,
      maxValue: max === -Infinity ? 100 : max,
      cellMap: map,
    };
  }, [data]);

  // Функция для определения цвета ячейки
  const getCellColor = (value: number): string => {
    if (maxValue === minValue) return COLOR_SCHEMES[colorScheme].medium;

    const normalized = (value - minValue) / (maxValue - minValue);
    const colors = COLOR_SCHEMES[colorScheme];

    if (normalized <= 0.2) return colors.low;
    if (normalized <= 0.4) return colors.mediumLow;
    if (normalized <= 0.6) return colors.medium;
    if (normalized <= 0.8) return colors.mediumHigh;
    return colors.high;
  };

  // Функция для определения цвета текста
  const getTextColor = (value: number): string => {
    const normalized = (value - minValue) / (maxValue - minValue);
    return normalized > 0.5 ? '#ffffff' : '#000000';
  };

  // Форматирование значения
  const formatValue = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            No data available for heatmap
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        {title && <CardTitle>{title}</CardTitle>}
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Heatmap Grid */}
            <div className="flex flex-col gap-1">
              {/* Header Row */}
              <div className="flex gap-1">
                <div style={{ width: cellSize, height: cellSize }} className="shrink-0" />
                {xLabels.map((xLabel) => (
                  <div
                    key={xLabel}
                    style={{ width: cellSize, height: cellSize }}
                    className="flex items-center justify-center text-xs font-medium shrink-0"
                  >
                    <div className="truncate max-w-full px-1" title={xLabel}>
                      {xLabel}
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Rows */}
              {yLabels.map((yLabel) => (
                <div key={yLabel} className="flex gap-1">
                  {/* Y Label */}
                  <div
                    style={{ width: cellSize, height: cellSize }}
                    className="flex items-center justify-center text-xs font-medium shrink-0"
                  >
                    <div className="truncate max-w-full px-1" title={yLabel}>
                      {yLabel}
                    </div>
                  </div>

                  {/* Data Cells */}
                  {xLabels.map((xLabel) => {
                    const cell = cellMap.get(`${xLabel}-${yLabel}`);
                    const value = cell?.value ?? 0;
                    const backgroundColor = getCellColor(value);
                    const color = getTextColor(value);

                    return (
                      <div
                        key={`${xLabel}-${yLabel}`}
                        style={{
                          width: cellSize,
                          height: cellSize,
                          backgroundColor,
                          color,
                        }}
                        className={cn(
                          'flex items-center justify-center text-xs font-medium rounded transition-all shrink-0',
                          onCellClick && 'cursor-pointer hover:scale-110 hover:shadow-lg hover:z-10'
                        )}
                        onClick={() => cell && onCellClick?.(cell)}
                        title={cell?.label || `${xLabel} × ${yLabel}: ${formatValue(value)}`}
                      >
                        {showValues && <span className="truncate max-w-full px-1">{formatValue(value)}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            {showLegend && (
              <div className="mt-6 flex items-center gap-4">
                <span className="text-sm font-medium">Scale:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatValue(minValue)}</span>
                  <div className="flex gap-1">
                    {Object.values(COLOR_SCHEMES[colorScheme]).map((color, index) => (
                      <div
                        key={index}
                        style={{ backgroundColor: color }}
                        className="w-8 h-4 rounded"
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatValue(maxValue)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
