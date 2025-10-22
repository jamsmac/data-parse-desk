/**
 * Heatmap Chart Demo
 * Демонстрация возможностей компонента HeatmapChart
 */

import { useState } from 'react';
import { HeatmapChart, HeatmapCell } from './HeatmapChart';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// Пример данных: продажи по месяцам и категориям
const salesData: HeatmapCell[] = [
  { x: 'Jan', y: 'Electronics', value: 45000, label: 'Electronics sales in January' },
  { x: 'Jan', y: 'Clothing', value: 32000 },
  { x: 'Jan', y: 'Food', value: 28000 },
  { x: 'Jan', y: 'Books', value: 15000 },

  { x: 'Feb', y: 'Electronics', value: 52000 },
  { x: 'Feb', y: 'Clothing', value: 38000 },
  { x: 'Feb', y: 'Food', value: 30000 },
  { x: 'Feb', y: 'Books', value: 17000 },

  { x: 'Mar', y: 'Electronics', value: 61000 },
  { x: 'Mar', y: 'Clothing', value: 45000 },
  { x: 'Mar', y: 'Food', value: 33000 },
  { x: 'Mar', y: 'Books', value: 19000 },

  { x: 'Apr', y: 'Electronics', value: 58000 },
  { x: 'Apr', y: 'Clothing', value: 41000 },
  { x: 'Apr', y: 'Food', value: 31000 },
  { x: 'Apr', y: 'Books', value: 18000 },

  { x: 'May', y: 'Electronics', value: 65000 },
  { x: 'May', y: 'Clothing', value: 48000 },
  { x: 'May', y: 'Food', value: 35000 },
  { x: 'May', y: 'Books', value: 21000 },

  { x: 'Jun', y: 'Electronics', value: 72000 },
  { x: 'Jun', y: 'Clothing', value: 55000 },
  { x: 'Jun', y: 'Food', value: 38000 },
  { x: 'Jun', y: 'Books', value: 23000 },
];

// Пример данных: корреляция между метриками
const correlationData: HeatmapCell[] = [
  { x: 'Speed', y: 'Speed', value: 1.0 },
  { x: 'Speed', y: 'Accuracy', value: 0.85 },
  { x: 'Speed', y: 'Cost', value: -0.42 },
  { x: 'Speed', y: 'Quality', value: 0.67 },

  { x: 'Accuracy', y: 'Speed', value: 0.85 },
  { x: 'Accuracy', y: 'Accuracy', value: 1.0 },
  { x: 'Accuracy', y: 'Cost', value: -0.23 },
  { x: 'Accuracy', y: 'Quality', value: 0.91 },

  { x: 'Cost', y: 'Speed', value: -0.42 },
  { x: 'Cost', y: 'Accuracy', value: -0.23 },
  { x: 'Cost', y: 'Cost', value: 1.0 },
  { x: 'Cost', y: 'Quality', value: -0.35 },

  { x: 'Quality', y: 'Speed', value: 0.67 },
  { x: 'Quality', y: 'Accuracy', value: 0.91 },
  { x: 'Quality', y: 'Cost', value: -0.35 },
  { x: 'Quality', y: 'Quality', value: 1.0 },
];

export function HeatmapChartDemo() {
  const [dataset, setDataset] = useState<'sales' | 'correlation'>('sales');
  const [colorScheme, setColorScheme] = useState<'blue' | 'green' | 'red' | 'purple' | 'orange'>('blue');
  const [showValues, setShowValues] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [cellSize, setCellSize] = useState(60);

  const currentData = dataset === 'sales' ? salesData : correlationData;

  const handleCellClick = (cell: HeatmapCell) => {
    toast.info(`Clicked: ${cell.x} × ${cell.y} = ${cell.value}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Heatmap Chart Demo</h2>
        <p className="text-muted-foreground">
          Interactive heatmap visualization with customizable appearance
        </p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
        <div className="space-y-2">
          <Label>Dataset</Label>
          <Select value={dataset} onValueChange={(v: any) => setDataset(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">Sales by Month</SelectItem>
              <SelectItem value="correlation">Correlation Matrix</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Color Scheme</Label>
          <Select value={colorScheme} onValueChange={(v: any) => setColorScheme(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blue">Blue</SelectItem>
              <SelectItem value="green">Green</SelectItem>
              <SelectItem value="red">Red</SelectItem>
              <SelectItem value="purple">Purple</SelectItem>
              <SelectItem value="orange">Orange</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Cell Size</Label>
          <Select value={String(cellSize)} onValueChange={(v) => setCellSize(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="40">Small (40px)</SelectItem>
              <SelectItem value="60">Medium (60px)</SelectItem>
              <SelectItem value="80">Large (80px)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-values"
            checked={showValues}
            onCheckedChange={(checked) => setShowValues(checked as boolean)}
          />
          <Label htmlFor="show-values" className="cursor-pointer font-normal">
            Show Values
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-legend"
            checked={showLegend}
            onCheckedChange={(checked) => setShowLegend(checked as boolean)}
          />
          <Label htmlFor="show-legend" className="cursor-pointer font-normal">
            Show Legend
          </Label>
        </div>
      </div>

      {/* Heatmap */}
      <HeatmapChart
        data={currentData}
        title={dataset === 'sales' ? 'Sales Performance by Category' : 'Metric Correlation Matrix'}
        description={
          dataset === 'sales'
            ? 'Monthly sales data across different product categories'
            : 'Correlation coefficients between different performance metrics'
        }
        colorScheme={colorScheme}
        showValues={showValues}
        showLegend={showLegend}
        cellSize={cellSize}
        onCellClick={handleCellClick}
      />

      {/* Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold mb-2">Features:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          <li>Dynamic data visualization</li>
          <li>Multiple color schemes</li>
          <li>Customizable cell sizes</li>
          <li>Toggle values and legend</li>
          <li>Interactive cells with click handlers</li>
          <li>Automatic value formatting (K, M suffixes)</li>
          <li>Responsive tooltip labels</li>
          <li>Dark mode support</li>
        </ul>
      </div>
    </div>
  );
}
