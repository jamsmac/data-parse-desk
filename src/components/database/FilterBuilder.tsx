import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';

export interface Filter {
  id: string;
  column: string;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'notEquals';
  value: string;
}

interface FilterBuilderProps {
  columns: Array<{ name: string; type: string }>;
  filters: Filter[];
  onChange: (filters: Filter[]) => void;
}

export function FilterBuilder({ columns, filters, onChange }: FilterBuilderProps) {
  const addFilter = () => {
    const newFilter: Filter = {
      id: crypto.randomUUID(),
      column: columns[0]?.name || '',
      operator: 'equals',
      value: '',
    };
    onChange([...filters, newFilter]);
  };

  const updateFilter = (id: string, updates: Partial<Filter>) => {
    onChange(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id: string) => {
    onChange(filters.filter(f => f.id !== id));
  };

  const operatorLabels = {
    equals: '=',
    notEquals: '≠',
    contains: 'contains',
    startsWith: 'starts with',
    endsWith: 'ends with',
    gt: '>',
    lt: '<',
    gte: '≥',
    lte: '≤',
  };

  return (
    <div className="space-y-2">
      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-2">
          <Select
            value={filter.column}
            onValueChange={(value) => updateFilter(filter.id, { column: value })}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map((col) => (
                <SelectItem key={col.name} value={col.name}>
                  {col.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filter.operator}
            onValueChange={(value: any) => updateFilter(filter.id, { operator: value })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(operatorLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={filter.value}
            onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
            placeholder="Value"
            className="flex-1"
          />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeFilter(filter.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addFilter}>
        <Plus className="h-4 w-4 mr-2" />
        Add Filter
      </Button>
    </div>
  );
}