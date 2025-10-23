import { TableRow, TableCell } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { RowContextMenu } from '@/components/database/RowContextMenu';
import { DataTableCell } from './DataTableCell';
import { formatToStyles, type FormatRule } from '@/utils/conditionalFormatting';
import { NormalizedRow } from '@/utils/parseData';
import { CellPosition } from '@/hooks/useKeyboardNavigation';

interface DataTableRowProps {
  row: NormalizedRow;
  headers: string[];
  rowIndex: number;
  columnTypes: Record<string, string>;
  editingCell: { rowId: string; column: string } | null;
  selectedRowIds?: Set<string>;
  rowFormat?: FormatRule | null;
  cellFormats?: Record<string, FormatRule>;
  showBulkActions: boolean;
  databaseId?: string;
  onCellUpdate?: boolean;
  isCellFocused: (pos: CellPosition) => boolean;
  isCellSelected: (pos: CellPosition) => boolean;
  onRowClick: (row: NormalizedRow) => void;
  onCellClick: (pos: CellPosition) => void;
  onCellDoubleClick: (rowId: string, column: string) => void;
  onCellSave: (value: any) => Promise<void>;
  onCellCancel: () => void;
  onToggleRowSelection?: (rowId: string) => void;
  onShowHistory: (rowId: string, column: string) => void;
  formatCellValue: (value: any, header: string) => string;
  onRowEdit?: (rowId: string) => void;
  onRowView?: (rowId: string) => void;
  onRowDuplicate?: (rowId: string) => void;
  onRowDelete?: (rowId: string) => void;
  onRowHistory?: (rowId: string) => void;
  onInsertRowAbove?: (rowId: string) => void;
  onInsertRowBelow?: (rowId: string) => void;
}

export function DataTableRow({
  row,
  headers,
  rowIndex,
  columnTypes,
  editingCell,
  selectedRowIds,
  rowFormat,
  cellFormats = {},
  showBulkActions,
  databaseId,
  onCellUpdate,
  isCellFocused,
  isCellSelected,
  onRowClick,
  onCellClick,
  onCellDoubleClick,
  onCellSave,
  onCellCancel,
  onToggleRowSelection,
  onShowHistory,
  formatCellValue,
  onRowEdit,
  onRowView,
  onRowDuplicate,
  onRowDelete,
  onRowHistory,
  onInsertRowAbove,
  onInsertRowBelow,
}: DataTableRowProps) {
  return (
    <RowContextMenu
      onEdit={() => onRowEdit?.(row.id)}
      onView={() => onRowView?.(row.id)}
      onDuplicate={() => onRowDuplicate?.(row.id)}
      onDelete={() => onRowDelete?.(row.id)}
      onHistory={() => onRowHistory?.(row.id)}
      onInsertAbove={() => onInsertRowAbove?.(row.id)}
      onInsertBelow={() => onInsertRowBelow?.(row.id)}
    >
      <TableRow
        className="cursor-pointer hover:bg-table-row-hover"
        style={rowFormat ? formatToStyles(rowFormat) : undefined}
        onClick={() => onRowClick(row)}
      >
        {showBulkActions && (
          <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedRowIds?.has(row.id)}
              onCheckedChange={() => onToggleRowSelection?.(row.id)}
              aria-label={`Выбрать строку ${rowIndex + 1}`}
            />
          </TableCell>
        )}
        {headers.map((header, colIndex) => {
          const isEditing = editingCell?.rowId === row.id && editingCell?.column === header;
          const value = row[header];
          const cellFormat = cellFormats[header];
          const cellPosition = { rowIndex, columnIndex: colIndex };

          return (
            <DataTableCell
              key={header}
              value={value}
              header={header}
              columnType={columnTypes[header] || 'text'}
              rowId={row.id}
              rowIndex={rowIndex}
              colIndex={colIndex}
              isEditing={isEditing}
              isFocused={isCellFocused(cellPosition)}
              isSelected={isCellSelected(cellPosition)}
              cellFormat={cellFormat}
              databaseId={databaseId}
              onCellUpdate={onCellUpdate}
              onDoubleClick={() => onCellDoubleClick(row.id, header)}
              onClick={() => onCellClick(cellPosition)}
              onSave={onCellSave}
              onCancel={onCellCancel}
              onShowHistory={onShowHistory}
              formatValue={formatCellValue}
            />
          );
        })}
      </TableRow>
    </RowContextMenu>
  );
}
