import { Edit2, History } from 'lucide-react';
import { TableCell } from '@/components/ui/table';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { EditableCell } from '@/components/database/EditableCell';
import { formatToStyles, type FormatRule } from '@/utils/conditionalFormatting';

interface DataTableCellProps {
  value: any;
  header: string;
  columnType: string;
  rowId: string;
  rowIndex: number;
  colIndex: number;
  isEditing: boolean;
  isFocused: boolean;
  isSelected: boolean;
  cellFormat?: FormatRule;
  databaseId?: string;
  onCellUpdate?: boolean;
  onDoubleClick: () => void;
  onClick: () => void;
  onSave: (value: any) => Promise<void>;
  onCancel: () => void;
  onShowHistory: (rowId: string, column: string) => void;
  formatValue: (value: any, header: string) => string;
}

export function DataTableCell({
  value,
  header,
  columnType,
  rowId,
  rowIndex,
  colIndex,
  isEditing,
  isFocused,
  isSelected,
  cellFormat,
  databaseId,
  onCellUpdate,
  onDoubleClick,
  onClick,
  onSave,
  onCancel,
  onShowHistory,
  formatValue,
}: DataTableCellProps) {
  return (
    <TableCell
      data-row={rowIndex}
      data-col={colIndex}
      data-table-cell="true"
      tabIndex={isFocused ? 0 : -1}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      className={`cursor-pointer hover:bg-accent/50 transition-colors ${
        isFocused ? 'ring-2 ring-primary ring-inset' : ''
      } ${isSelected ? 'bg-primary/10' : ''}`}
      style={cellFormat ? formatToStyles(cellFormat) : undefined}
    >
      {isEditing ? (
        <EditableCell
          value={value}
          columnType={columnType}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div className="flex items-center justify-between group w-full">
              <span>{formatValue(value, header)}</span>
              {onCellUpdate && (
                <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
              )}
            </div>
          </ContextMenuTrigger>
          {databaseId && (
            <ContextMenuContent>
              <ContextMenuItem
                onSelect={() => onShowHistory(rowId, header)}
              >
                <History className="mr-2 h-4 w-4" />
                Показать историю
              </ContextMenuItem>
            </ContextMenuContent>
          )}
        </ContextMenu>
      )}
    </TableCell>
  );
}
