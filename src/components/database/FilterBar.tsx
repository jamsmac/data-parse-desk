import { useState } from 'react';
import { Plus, X, Filter as FilterIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Card } from '../ui/card';
import type { TableSchema, ColumnType } from '@/types/database';
import type { FilterOperator } from '@/utils/sqlBuilder';

export interface FilterCondition {
  id: string;
  column: string;
  operator: FilterOperator;
  value: any;
}

export interface FilterBarProps {
  columns: TableSchema[];
  filters: Record<string, any>;
  onFiltersChange: (filters: Record<string, any>) => void;
}

const OPERATORS: Record<string, { value: FilterOperator; label: string; types: ColumnType[] }[]> = {
  text: [
    { value: 'eq', label: 'Равно', types: ['text', 'email', 'url', 'phone'] },
    { value: 'neq', label: 'Не равно', types: ['text', 'email', 'url', 'phone'] },
    { value: 'contains', label: 'Содержит', types: ['text', 'email', 'url', 'phone'] },
    { value: 'startsWith', label: 'Начинается с', types: ['text', 'email', 'url', 'phone'] },
    { value: 'endsWith', label: 'Заканчивается на', types: ['text', 'email', 'url', 'phone'] },
    { value: 'is', label: 'Пусто', types: ['text', 'email', 'url', 'phone'] },
  ],
  number: [
    { value: 'eq', label: '=', types: ['number'] },
    { value: 'neq', label: '≠', types: ['number'] },
    { value: 'gt', label: '>', types: ['number'] },
    { value: 'gte', label: '≥', types: ['number'] },
    { value: 'lt', label: '<', types: ['number'] },
    { value: 'lte', label: '≤', types: ['number'] },
    { value: 'between', label: 'Между', types: ['number'] },
  ],
  date: [
    { value: 'eq', label: 'Равно', types: ['date'] },
    { value: 'neq', label: 'Не равно', types: ['date'] },
    { value: 'gt', label: 'После', types: ['date'] },
    { value: 'lt', label: 'До', types: ['date'] },
    { value: 'between', label: 'В диапазоне', types: ['date'] },
  ],
  boolean: [
    { value: 'eq', label: 'Равно', types: ['boolean'] },
  ],
  select: [
    { value: 'eq', label: 'Равно', types: ['select', 'multi_select'] },
    { value: 'neq', label: 'Не равно', types: ['select', 'multi_select'] },
    { value: 'in', label: 'Один из', types: ['select', 'multi_select'] },
  ],
};

export default function FilterBar({ columns, filters: externalFilters, onFiltersChange }: FilterBarProps) {
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  
  // Convert external filters to internal format on mount
  // useEffect(() => {
  //   // TODO: Convert Record<string, any> to FilterCondition[]
  // }, [externalFilters]);
  const [isOpen, setIsOpen] = useState(false);

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: Math.random().toString(36).substring(7),
      column: columns[0]?.column_name || '',
      operator: 'eq',
      value: '',
    };
    const newFilters = [...filters, newFilter];
    setFilters(newFilters);
    // Convert to external format
    onFiltersChange({});
  };

  const removeFilter = (id: string) => {
    const newFilters = filters.filter(f => f.id !== id);
    setFilters(newFilters);
    // Convert to external format
    onFiltersChange({});
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    const newFilters = filters.map(f => 
      f.id === id ? { ...f, ...updates } : f
    );
    setFilters(newFilters);
    // Convert to external format
    onFiltersChange({});
  };

  const clearAllFilters = () => {
    setFilters([]);
    onFiltersChange({});
  };

  const getOperatorsForColumn = (columnName: string): Array<{ value: FilterOperator; label: string }> => {
    const column = columns.find(c => c.column_name === columnName);
    if (!column) return [];

    const columnType = column.column_type;
    
    if (['text', 'email', 'url', 'phone'].includes(columnType)) {
      return OPERATORS.text;
    } else if (columnType === 'number') {
      return OPERATORS.number;
    } else if (columnType === 'date') {
      return OPERATORS.date;
    } else if (columnType === 'boolean') {
      return OPERATORS.boolean;
    } else if (['select', 'multi_select'].includes(columnType)) {
      return OPERATORS.select;
    }

    return OPERATORS.text;
  };

  const renderValueInput = (filter: FilterCondition) => {
    const column = columns.find(c => c.column_name === filter.column);
    if (!column) return null;

    const columnType = column.column_type;

    if (filter.operator === 'is') {
      return (
        <Select
          value={filter.value === null ? 'null' : 'not_null'}
          onValueChange={(value) => updateFilter(filter.id, { value: value === 'null' ? null : false })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="null">Пусто</SelectItem>
            <SelectItem value="not_null">Не пусто</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (filter.operator === 'between') {
      return (
        <div className="flex items-center gap-2">
          <Input
            type={columnType === 'number' ? 'number' : columnType === 'date' ? 'date' : 'text'}
            placeholder="От"
            value={Array.isArray(filter.value) ? filter.value[0] : ''}
            onChange={(e) => {
              const current = Array.isArray(filter.value) ? filter.value : ['', ''];
              updateFilter(filter.id, { value: [e.target.value, current[1]] });
            }}
            className="w-[120px]"
          />
          <span className="text-muted-foreground">и</span>
          <Input
            type={columnType === 'number' ? 'number' : columnType === 'date' ? 'date' : 'text'}
            placeholder="До"
            value={Array.isArray(filter.value) ? filter.value[1] : ''}
            onChange={(e) => {
              const current = Array.isArray(filter.value) ? filter.value : ['', ''];
              updateFilter(filter.id, { value: [current[0], e.target.value] });
            }}
            className="w-[120px]"
          />
        </div>
      );
    }

    if (columnType === 'boolean') {
      return (
        <Select
          value={String(filter.value)}
          onValueChange={(value) => updateFilter(filter.id, { value: value === 'true' })}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Да</SelectItem>
            <SelectItem value="false">Нет</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    if (columnType === 'date') {
      return (
        <Input
          type="date"
          value={filter.value || ''}
          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
          className="w-[180px]"
        />
      );
    }

    if (columnType === 'number') {
      return (
        <Input
          type="number"
          placeholder="Значение"
          value={filter.value || ''}
          onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
          className="w-[150px]"
        />
      );
    }

    // Default text input
    return (
      <Input
        placeholder="Значение"
        value={filter.value || ''}
        onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
        className="w-[200px]"
      />
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <FilterIcon className="h-4 w-4" />
              Фильтры
              {filters.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {filters.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[600px]" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Фильтры</h4>
                {filters.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-muted-foreground"
                  >
                    Очистить все
                  </Button>
                )}
              </div>

              {filters.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Нет активных фильтров. Добавьте фильтр для начала.
                </p>
              ) : (
                <div className="space-y-2">
                  {filters.map((filter, index) => (
                    <Card key={filter.id} className="p-3">
                      <div className="flex items-center gap-2">
                        {index > 0 && (
                          <span className="text-xs text-muted-foreground font-medium">И</span>
                        )}
                        
                        <Select
                          value={filter.column}
                          onValueChange={(value) => updateFilter(filter.id, { column: value, operator: 'eq', value: '' })}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {columns.map((column) => (
                              <SelectItem key={column.id} value={column.column_name}>
                                {column.column_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={filter.operator}
                          onValueChange={(value) => updateFilter(filter.id, { operator: value as FilterOperator, value: '' })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getOperatorsForColumn(filter.column).map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {renderValueInput(filter)}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFilter(filter.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={addFilter}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Добавить фильтр
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {filters.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map((filter) => {
              const column = columns.find(c => c.column_name === filter.column);
              const operator = getOperatorsForColumn(filter.column).find(op => op.value === filter.operator);
              
              return (
                <Badge key={filter.id} variant="secondary" className="gap-1">
                  {column?.column_name} {operator?.label} {filter.value}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilter(filter.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export { FilterBar };
