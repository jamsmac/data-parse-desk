/**
 * Shared types for DataTable components
 */

import { NormalizedRow, GroupedData } from '@/utils/parseData';

export type CellValue = string | number | boolean | null | Date;

export interface DataTableProps {
  data?: NormalizedRow[] | GroupedData[];
  headers?: string[];
  isGrouped?: boolean;
  onCellUpdate?: (rowId: string, column: string, value: CellValue) => Promise<void>;
  columnTypes?: Record<string, string>;
  databaseId?: string;
  onRowEdit?: (rowId: string) => void;
  onRowView?: (rowId: string) => void;
  onRowDuplicate?: (rowId: string) => void;
  onRowDelete?: (rowId: string) => void;
  onRowHistory?: (rowId: string) => void;
  onInsertRowAbove?: (rowId: string) => void;
  onInsertRowBelow?: (rowId: string) => void;
  onBulkDelete?: (rowIds: string[]) => Promise<void>;
  onBulkDuplicate?: (rowIds: string[]) => Promise<void>;
  onBulkEdit?: (rowIds: string[], column: string, value: CellValue) => Promise<void>;
}

export type SortDirection = 'asc' | 'desc' | null;

export interface DataTableState {
  page: number;
  pageSize: number;
  sortColumn: string | null;
  sortDirection: SortDirection;
  visibleColumns: Set<string>;
  selectedRow: NormalizedRow | null;
  expandedGroups: Set<string>;
  editingCell: { rowId: string; column: string } | null;
  historyCell: { rowId: string; column: string } | null;
  showHistory: boolean;
  showFormatting: boolean;
  selectedRowIds: Set<string>;
  showBulkEdit: boolean;
  showBulkDeleteConfirm: boolean;
}

export interface DataTableHandlers {
  handleCellUpdate: (rowId: string, column: string, value: CellValue) => Promise<void>;
  handleRowView?: (rowId: string) => void;
  handleRowEdit?: (rowId: string) => void;
  handleRowDuplicate?: (rowId: string) => void;
  handleRowDelete?: (rowId: string) => void;
  handleRowHistory?: (rowId: string) => void;
  handleInsertRowAbove?: (rowId: string) => void;
  handleInsertRowBelow?: (rowId: string) => void;
  handleBulkDelete?: (rowIds: string[]) => Promise<void>;
  handleBulkDuplicate?: (rowIds: string[]) => Promise<void>;
  handleBulkEdit?: (rowIds: string[], column: string, value: CellValue) => Promise<void>;
}
