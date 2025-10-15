// Типы данных для колонок
export type ColumnType = 
  | 'text'
  | 'number'
  | 'date'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'email'
  | 'url'
  | 'phone'
  | 'file'
  | 'relation'
  | 'rollup'
  | 'formula'
  | 'lookup';

// Основная таблица баз данных
export interface Database {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  tags?: string[];
  table_count?: number;
  created_at: string;
  updated_at: string;
}

// Схема таблицы
export interface TableSchema {
  id: string;
  database_id: string;
  column_name: string;
  column_type: ColumnType;
  is_required: boolean;
  default_value?: string | number | boolean | Date | null;
  position: number;
  created_at: string;
  updated_at: string;
  relation_config?: RelationConfig;
  rollup_config?: RollupConfig;
  formula_config?: FormulaConfig;
}

// Алиас для схемы колонки (совместимость)
export interface ColumnSchema {
  name: string;
  type: ColumnType;
  required?: boolean;
  defaultValue?: string | number | boolean | Date | null;
}

// Конфигурация связи
export interface RelationConfig {
  target_database_id: string;
  relation_type: 'one_to_many' | 'many_to_one' | 'many_to_many';
  display_field?: string;
}

// Конфигурация rollup
export interface RollupConfig {
  relationId: string;
  relation_column_id: string;
  target_column: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median' | 'unique' | 'empty' | 'not_empty';
}

// Конфигурация формулы
export interface FormulaConfig {
  expression: string;
  return_type: ColumnType;
  dependencies: string[];
}

// Конфигурация lookup
export interface LookupConfig {
  relation_column_id: string;
  target_column: string;
}

// Связи между базами данных
export interface DatabaseRelation {
  id: string;
  source_database_id: string;
  target_database_id: string;
  relation_type: 'one_to_many' | 'many_to_one' | 'many_to_many';
  source_column: string;
  target_column: string;
  created_at: string;
}

// История загрузок файлов
export interface UploadHistory {
  id: string;
  database_id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  rows_imported: number;
  column_mapping: Record<string, string>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// Типы для фильтрации и сортировки
export interface TableFilters {
  [columnName: string]: string | number | boolean | Date | null | string[] | number[];
}

export interface TableSorting {
  column: string;
  direction: 'asc' | 'desc';
}

export interface TablePagination {
  page: number;
  pageSize: number;
}

// Статистика базы данных
export interface DatabaseStats {
  rowCount: number;
  lastUpdated: string;
  columnCount: number;
}

// Опции маппинга колонок
export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  confidence: number;
}

// Результат валидации импорта
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  row: number;
  column: string;
  value: unknown;
  message: string;
}

export interface ValidationWarning {
  row: number;
  column: string;
  value: unknown;
  message: string;
}

// Типы для аналитики
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'heatmap';
  xAxis: string;
  yAxis: string | string[];
  groupBy?: string;
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  filters?: TableFilters;
}

// Типы для автоматизации
export interface WorkflowTrigger {
  type: 'schedule' | 'webhook' | 'data_change';
  config: Record<string, unknown>;
}

export interface WorkflowAction {
  type: 'send_email' | 'update_row' | 'create_row' | 'http_request';
  config: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  database_id: string;
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Пользователи и разрешения
export interface UserPermission {
  user_id: string;
  database_id: string;
  role: 'owner' | 'editor' | 'viewer';
  granted_at: string;
}

export interface Comment {
  id: string;
  database_id: string;
  row_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  database_id: string;
  user_id: string;
  action: 'create' | 'update' | 'delete' | 'import';
  entity_type: 'database' | 'row' | 'column';
  entity_id: string;
  changes?: Record<string, unknown>;
  created_at: string;
}

// Типы для работы с файлами
export interface ParsedFileData {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export interface FileUploadResult {
  success: boolean;
  fileName: string;
  rowsImported: number;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

// Типы для графа отношений
export interface RelationshipGraphNode {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type: 'database';
}

export interface RelationshipGraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'one_to_many' | 'many_to_one' | 'many_to_many';
  label?: string;
}

export interface RelationshipGraphData {
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
}
