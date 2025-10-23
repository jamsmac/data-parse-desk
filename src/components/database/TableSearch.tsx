import { useState } from 'react';
import { Search, X, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDebounce } from '@/hooks/useDebounce';
import { useEffect } from 'react';

interface TableSearchProps {
  columns: string[];
  onSearch: (query: string, columns: string[]) => void;
  className?: string;
}

export const TableSearch = ({ columns, onSearch, className }: TableSearchProps) => {
  const [query, setQuery] = useState('');
  const [searchColumns, setSearchColumns] = useState<string[]>(columns);
  const debouncedQuery = useDebounce(query, 300);

  // Update search columns when columns prop changes
  useEffect(() => {
    setSearchColumns(columns);
  }, [columns]);

  // Trigger search when debounced query or search columns change
  useEffect(() => {
    onSearch(debouncedQuery, searchColumns);
  }, [debouncedQuery, searchColumns, onSearch]);

  const handleToggleColumn = (column: string, checked: boolean) => {
    if (checked) {
      setSearchColumns([...searchColumns, column]);
    } else {
      // Ensure at least one column is selected
      if (searchColumns.length > 1) {
        setSearchColumns(searchColumns.filter(c => c !== column));
      }
    }
  };

  const handleSelectAll = () => {
    setSearchColumns(columns);
  };

  const handleClearAll = () => {
    // Keep at least one column selected (the first one)
    setSearchColumns([columns[0]]);
  };

  const handleClear = () => {
    setQuery('');
  };

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по таблице..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings2 className="h-4 w-4 mr-2" />
            Колонки ({searchColumns.length})
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Искать в колонках:</p>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSelectAll}
                >
                  Все
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleClearAll}
                  disabled={searchColumns.length <= 1}
                >
                  Сброс
                </Button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {columns.map((col) => (
                <label key={col} className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded p-1">
                  <Checkbox
                    checked={searchColumns.includes(col)}
                    onCheckedChange={(checked) =>
                      handleToggleColumn(col, checked as boolean)
                    }
                    disabled={searchColumns.length === 1 && searchColumns.includes(col)}
                  />
                  <span className="text-sm flex-1">{col}</span>
                </label>
              ))}
            </div>

            {searchColumns.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Выберите хотя бы одну колонку
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
