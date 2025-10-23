import { Eye, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
import { KeyboardShortcutsHelp } from '@/components/database/KeyboardShortcutsHelp';

interface DataTableToolbarProps {
  headers: string[];
  visibleColumns: Set<string>;
  pageSize: number;
  databaseId?: string;
  onPageSizeChange: (size: number) => void;
  onToggleColumn: (column: string) => void;
  onShowFormatting: () => void;
}

export function DataTableToolbar({
  headers,
  visibleColumns,
  pageSize,
  databaseId,
  onPageSizeChange,
  onToggleColumn,
  onShowFormatting,
}: DataTableToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <KeyboardShortcutsHelp />

        <Select
          value={String(pageSize)}
          onValueChange={(val) => onPageSizeChange(Number(val))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50 per page</SelectItem>
            <SelectItem value="100">100 per page</SelectItem>
            <SelectItem value="200">200 per page</SelectItem>
          </SelectContent>
        </Select>

        <Sheet>
          <Button variant="outline" onClick={() => {}}>
            <Eye className="mr-2 h-4 w-4" />
            Columns
          </Button>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Visible Columns</SheetTitle>
              <SheetDescription>Toggle columns visibility</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {headers.map((header) => (
                <div key={header} className="flex items-center gap-2">
                  <Checkbox
                    checked={visibleColumns.has(header)}
                    onCheckedChange={() => onToggleColumn(header)}
                  />
                  <label className="text-sm">{header}</label>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {databaseId && (
          <Button variant="outline" onClick={onShowFormatting}>
            <Palette className="mr-2 h-4 w-4" />
            Formatting
          </Button>
        )}
      </div>
    </div>
  );
}
