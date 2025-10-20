import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export interface SortConfig {
  column: string | null;
  direction: 'asc' | 'desc';
}

interface SortControlsProps {
  columns: Array<{ name: string; type: string }>;
  sort: SortConfig;
  onChange: (sort: SortConfig) => void;
}

export function SortControls({ columns, sort, onChange }: SortControlsProps) {
  const toggleDirection = () => {
    onChange({
      ...sort,
      direction: sort.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const clearSort = () => {
    onChange({ column: null, direction: 'asc' });
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={sort.column || '__none__'}
        onValueChange={(value) => onChange({ ...sort, column: value === '__none__' ? null : value })}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Sort by column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No sorting</SelectItem>
          {columns.map((col) => (
            <SelectItem key={col.name} value={col.name}>
              {col.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {sort.column && (
        <>
          <Button variant="outline" size="icon" onClick={toggleDirection}>
            {sort.direction === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>

          <Button variant="ghost" size="sm" onClick={clearSort}>
            Clear
          </Button>
        </>
      )}
    </div>
  );
}