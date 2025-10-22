import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { X, Plus, Save, FolderOpen, Trash2, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isTrue'
  | 'isFalse'
  | 'in'
  | 'notIn';

export interface AdvancedFilter {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string | string[];
  dataType?: 'text' | 'number' | 'date' | 'boolean' | 'select';
}

export interface FilterGroup {
  id: string;
  logic: 'AND' | 'OR';
  filters: AdvancedFilter[];
}

export interface FilterPreset {
  id?: string;
  name: string;
  description?: string;
  groups: FilterGroup[];
  created_at?: string;
  user_id?: string;
}

interface AdvancedFilterBuilderProps {
  columns: Array<{ name: string; type: string }>;
  databaseId: string;
  onApply: (groups: FilterGroup[]) => void;
  initialGroups?: FilterGroup[];
}

const OPERATORS_BY_TYPE: Record<string, FilterOperator[]> = {
  text: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty', 'in', 'notIn'],
  number: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty', 'in', 'notIn'],
  date: ['equals', 'notEquals', 'gt', 'gte', 'lt', 'lte', 'between', 'isEmpty', 'isNotEmpty'],
  boolean: ['isTrue', 'isFalse', 'isEmpty', 'isNotEmpty'],
  select: ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
  status: ['equals', 'notEquals', 'in', 'notIn', 'isEmpty', 'isNotEmpty'],
};

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'равно',
  notEquals: 'не равно',
  contains: 'содержит',
  notContains: 'не содержит',
  startsWith: 'начинается с',
  endsWith: 'заканчивается на',
  gt: 'больше',
  gte: 'больше или равно',
  lt: 'меньше',
  lte: 'меньше или равно',
  between: 'между',
  isEmpty: 'пусто',
  isNotEmpty: 'не пусто',
  isTrue: 'истина',
  isFalse: 'ложь',
  in: 'в списке',
  notIn: 'не в списке',
};

export function AdvancedFilterBuilder({
  columns,
  databaseId,
  onApply,
  initialGroups = [],
}: AdvancedFilterBuilderProps) {
  const [groups, setGroups] = useState<FilterGroup[]>(
    initialGroups.length > 0
      ? initialGroups
      : [
          {
            id: crypto.randomUUID(),
            logic: 'AND',
            filters: [],
          },
        ]
  );
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  // Load saved presets
  const loadPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('filter_presets')
        .select('*')
        .eq('database_id', databaseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  // Save current filters as preset
  const savePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Введите название пресета');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('filter_presets').insert({
        database_id: databaseId,
        user_id: user.id,
        name: presetName,
        description: presetDescription || null,
        filters: groups,
      });

      if (error) throw error;

      toast.success('Пресет сохранен');
      setShowSaveDialog(false);
      setPresetName('');
      setPresetDescription('');
      loadPresets();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка сохранения пресета');
    }
  };

  // Load preset
  const loadPreset = (preset: FilterPreset) => {
    setGroups(preset.groups);
    setShowLoadDialog(false);
    toast.success(`Загружен пресет: ${preset.name}`);
  };

  // Delete preset
  const deletePreset = async (presetId: string) => {
    try {
      const { error } = await supabase.from('filter_presets').delete().eq('id', presetId);

      if (error) throw error;

      toast.success('Пресет удален');
      loadPresets();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка удаления пресета');
    }
  };

  // Add filter group
  const addGroup = () => {
    setGroups([
      ...groups,
      {
        id: crypto.randomUUID(),
        logic: 'AND',
        filters: [],
      },
    ]);
  };

  // Remove filter group
  const removeGroup = (groupId: string) => {
    setGroups(groups.filter((g) => g.id !== groupId));
  };

  // Update group logic
  const updateGroupLogic = (groupId: string, logic: 'AND' | 'OR') => {
    setGroups(groups.map((g) => (g.id === groupId ? { ...g, logic } : g)));
  };

  // Add filter to group
  const addFilter = (groupId: string) => {
    const newFilter: AdvancedFilter = {
      id: crypto.randomUUID(),
      column: columns[0]?.name || '',
      operator: 'equals',
      value: '',
      dataType: getColumnType(columns[0]?.type),
    };

    setGroups(
      groups.map((g) =>
        g.id === groupId ? { ...g, filters: [...g.filters, newFilter] } : g
      )
    );
  };

  // Remove filter from group
  const removeFilter = (groupId: string, filterId: string) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId ? { ...g, filters: g.filters.filter((f) => f.id !== filterId) } : g
      )
    );
  };

  // Update filter
  const updateFilter = (groupId: string, filterId: string, updates: Partial<AdvancedFilter>) => {
    setGroups(
      groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              filters: g.filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f)),
            }
          : g
      )
    );
  };

  // Get column data type
  const getColumnType = (columnType: string): AdvancedFilter['dataType'] => {
    if (['number', 'integer', 'decimal', 'float'].includes(columnType)) return 'number';
    if (['date', 'datetime', 'timestamp'].includes(columnType)) return 'date';
    if (['boolean', 'checkbox'].includes(columnType)) return 'boolean';
    if (['select', 'status', 'tag'].includes(columnType)) return 'select';
    return 'text';
  };

  // Get available operators for column
  const getOperators = (columnType: string): FilterOperator[] => {
    const dataType = getColumnType(columnType);
    return OPERATORS_BY_TYPE[dataType] || OPERATORS_BY_TYPE.text;
  };

  // Check if operator needs value input
  const needsValue = (operator: FilterOperator): boolean => {
    return !['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(operator);
  };

  // Check if operator needs multiple values
  const needsMultipleValues = (operator: FilterOperator): boolean => {
    return ['between', 'in', 'notIn'].includes(operator);
  };

  // Clear all filters
  const clearAll = () => {
    setGroups([
      {
        id: crypto.randomUUID(),
        logic: 'AND',
        filters: [],
      },
    ]);
  };

  // Apply filters
  const handleApply = () => {
    const validGroups = groups.filter((g) => g.filters.length > 0);
    onApply(validGroups);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Расширенные фильтры</CardTitle>
            <CardDescription>Создайте сложные условия фильтрации с помощью групп AND/OR</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={loadPresets}>
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Загрузить
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Загрузить пресет</DialogTitle>
                  <DialogDescription>Выберите сохраненный набор фильтров</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {presets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Нет сохраненных пресетов
                    </p>
                  ) : (
                    presets.map((preset) => (
                      <div
                        key={preset.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                        onClick={() => loadPreset(preset)}
                      >
                        <div>
                          <p className="font-medium">{preset.name}</p>
                          {preset.description && (
                            <p className="text-sm text-muted-foreground">{preset.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deletePreset(preset.id!);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Сохранить пресет фильтров</DialogTitle>
                  <DialogDescription>
                    Сохраните текущие фильтры для быстрого доступа
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preset-name">Название</Label>
                    <Input
                      id="preset-name"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="Например: Активные задачи"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preset-description">Описание (опционально)</Label>
                    <Input
                      id="preset-description"
                      value={presetDescription}
                      onChange={(e) => setPresetDescription(e.target.value)}
                      placeholder="Краткое описание"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                    Отмена
                  </Button>
                  <Button onClick={savePreset}>Сохранить</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={clearAll}>
              <X className="h-4 w-4 mr-2" />
              Очистить
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={group.id} className="space-y-2">
            {groupIndex > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">AND</Badge>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}

            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Условие группы:</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={group.logic === 'AND' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateGroupLogic(group.id, 'AND')}
                      >
                        AND
                      </Button>
                      <Button
                        variant={group.logic === 'OR' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateGroupLogic(group.id, 'OR')}
                      >
                        OR
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addFilter(group.id)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить фильтр
                    </Button>
                    {groups.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGroup(group.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {group.filters.map((filter, filterIndex) => {
                  const column = columns.find((c) => c.name === filter.column);
                  const availableOperators = getOperators(column?.type || 'text');

                  return (
                    <div key={filter.id} className="space-y-2">
                      {filterIndex > 0 && (
                        <div className="flex items-center gap-2 pl-4">
                          <Badge variant="secondary" className="text-xs">
                            {group.logic}
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Select
                          value={filter.column}
                          onValueChange={(value) => {
                            const col = columns.find((c) => c.name === value);
                            updateFilter(group.id, filter.id, {
                              column: value,
                              dataType: getColumnType(col?.type || 'text'),
                              operator: 'equals',
                            });
                          }}
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
                          onValueChange={(value: FilterOperator) =>
                            updateFilter(group.id, filter.id, { operator: value })
                          }
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOperators.map((op) => (
                              <SelectItem key={op} value={op}>
                                {OPERATOR_LABELS[op]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {needsValue(filter.operator) && (
                          <Input
                            value={Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
                            onChange={(e) =>
                              updateFilter(group.id, filter.id, {
                                value: needsMultipleValues(filter.operator)
                                  ? e.target.value.split(',').map((v) => v.trim())
                                  : e.target.value,
                              })
                            }
                            placeholder={
                              needsMultipleValues(filter.operator)
                                ? 'Значение 1, Значение 2, ...'
                                : 'Значение'
                            }
                            className="flex-1"
                          />
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFilter(group.id, filter.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {group.filters.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Нажмите "Добавить фильтр" чтобы начать
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ))}

        <Button variant="outline" onClick={addGroup} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Добавить группу фильтров
        </Button>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={clearAll}>
            Сбросить все
          </Button>
          <Button onClick={handleApply}>Применить фильтры</Button>
        </div>
      </CardContent>
    </Card>
  );
}
