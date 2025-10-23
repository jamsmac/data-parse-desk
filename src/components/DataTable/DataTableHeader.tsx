import { ChevronDown, ChevronUp } from 'lucide-react';
import { TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';

type SortDirection = 'asc' | 'desc' | null;

interface DataTableHeaderProps {
  headers: string[];
  isGrouped: boolean;
  showBulkActions: boolean;
  sortColumn: string | null;
  sortDirection: SortDirection;
  allSelected: boolean;
  onSort: (column: string) => void;
  onToggleSelectAll: () => void;
}

export function DataTableHeader({
  headers,
  isGrouped,
  showBulkActions,
  sortColumn,
  sortDirection,
  allSelected,
  onSort,
  onToggleSelectAll,
}: DataTableHeaderProps) {
  return (
    <TableHeader className="bg-table-header sticky top-0">
      <TableRow>
        {!isGrouped && showBulkActions && (
          <TableHead className="w-12">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onToggleSelectAll}
              aria-label="Выбрать все"
            />
          </TableHead>
        )}
        {headers.map((header) => (
          <TableHead
            key={header}
            className="cursor-pointer whitespace-nowrap"
            onClick={() => !isGrouped && onSort(header)}
          >
            <div className="flex items-center gap-2">
              {header}
              {!isGrouped && sortColumn === header && (
                sortDirection === 'asc' ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )
              )}
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}
