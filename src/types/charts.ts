export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'scatter' | 'composed' | 'heatmap';

export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';

export interface ChartAxis {
  columnId: string;
  columnName: string;
  aggregation?: AggregationType;
}

export interface ChartConfig {
  id: string;
  name: string;
  type: ChartType;
  databaseId: string;
  xAxis?: ChartAxis;
  yAxis: ChartAxis[];
  filters?: FilterCondition[];
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
}

export interface FilterCondition {
  columnId: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'starts_with' | 'ends_with';
  value: any;
}

export interface ChartData {
  [key: string]: any;
}
