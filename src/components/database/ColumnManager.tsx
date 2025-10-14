import { useState } from 'react';
import { Plus, Settings, Trash2, GripVertical, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import type { TableSchema, ColumnType } from '@/types/database';

export interface ColumnManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseId: string;
  columns: TableSchema[];
}

const COLUMN_TYPES: { value: ColumnType; label: string; icon: string }[] = [
  { value: 'text', label: 'Текст', icon: '📝' },
  { value: 'number', label: 'Число', icon: '🔢' },
  { value: 'date', label: 'Дата', icon: '📅' },
  { value: 'boolean', label: 'Да/Нет', icon: '✓' },
  { value: 'select', label: 'Выбор', icon: '📋' },
  { value: 'multi_select', label: 'Множ. выбор', icon: '☑' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'phone', label: 'Телефон', icon: '📞' },
  { value: 'file', label: 'Файл', icon: '📎' },
  { value: 'relation', label: 'Связь', icon: '🔀' },
  { value: 'rollup', label: 'Rollup', icon: '∑' },
  { value: 'formula', label: 'Формула', icon: 'ƒ' },
  { value: 'lookup', label: 'Lookup', icon: '👁' },
];

export default function ColumnManager({ open, onOpenChange, databaseId, columns }: ColumnManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<TableSchema | null>(null);
  
  const [newColumn, setNewColumn] = useState({
    column_name: '',
    column_type: 'text' as ColumnType,
    is_required: false,
    default_value: '',
  });

  const handleAddColumn = async () => {
    if (!newColumn.column_name.trim()) {
      toast.error('Введите название колонки');
      return;
    }

    try {
      // TODO: Вызвать API для создания колонки
      toast.success('Колонка добавлена');
      setIsAddDialogOpen(false);
      setNewColumn({
        column_name: '',
        column_type: 'text',
        is_required: false,
        default_value: '',
      });
      // Refresh будет через React Query invalidation
    } catch (error) {
      toast.error('Ошибка при добавлении колонки');
      console.error(error);
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    try {
      // TODO: Вызвать API для удаления колонки
      toast.success('Колонка удалена');
      // Refresh будет через React Query invalidation
    } catch (error) {
      toast.error('Ошибка при удалении колонки');
      console.error(error);
    }
  };

  const handleUpdateColumn = async (column: TableSchema) => {
    try {
      // TODO: Вызвать API для обновления колонки
      toast.success('Колонка обновлена');
      setEditingColumn(null);
      // Refresh будет через React Query invalidation
    } catch (error) {
      toast.error('Ошибка при обновлении колонки');
      console.error(error);
    }
  };

  const getColumnTypeInfo = (type: ColumnType) => {
    return COLUMN_TYPES.find(t => t.value === type) || COLUMN_TYPES[0];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Управление колонками</DialogTitle>
          <DialogDescription>
            Добавляйте, редактируйте и удаляйте колонки базы данных
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Колонки</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Добавить колонку
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Новая колонка</DialogTitle>
              <DialogDescription>
                Добавьте новую колонку в базу данных
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="column_name">Название колонки *</Label>
                <Input
                  id="column_name"
                  placeholder="Название"
                  value={newColumn.column_name}
                  onChange={(e) => setNewColumn({ ...newColumn, column_name: e.target.value })}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="column_type">Тип данных</Label>
                <Select
                  value={newColumn.column_type}
                  onValueChange={(value) => setNewColumn({ ...newColumn, column_type: value as ColumnType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLUMN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_required">Обязательное поле</Label>
                  <p className="text-sm text-muted-foreground">
                    Поле должно быть заполнено
                  </p>
                </div>
                <Switch
                  id="is_required"
                  checked={newColumn.is_required}
                  onCheckedChange={(checked) => setNewColumn({ ...newColumn, is_required: checked })}
                />
              </div>
              
              {!newColumn.is_required && (
                <div className="grid gap-2">
                  <Label htmlFor="default_value">Значение по умолчанию</Label>
                  <Input
                    id="default_value"
                    placeholder="Пусто"
                    value={newColumn.default_value}
                    onChange={(e) => setNewColumn({ ...newColumn, default_value: e.target.value })}
                  />
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddColumn}>
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {columns.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Нет колонок. Добавьте первую колонку для начала работы.</p>
            </div>
          ) : (
            <div className="divide-y">
              {columns.map((column, index) => {
                const typeInfo = getColumnTypeInfo(column.column_type);
                const isEditing = editingColumn?.id === column.id;

                return (
                  <div
                    key={column.id}
                    className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{typeInfo.icon}</span>
                        {isEditing ? (
                          <Input
                            value={column.column_name}
                            onChange={(e) => setEditingColumn({ ...column, column_name: e.target.value })}
                            className="h-8 max-w-xs"
                          />
                        ) : (
                          <span className="font-medium">{column.column_name}</span>
                        )}
                        {column.is_required && (
                          <Badge variant="destructive" className="text-xs">
                            Обязательное
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{typeInfo.label}</span>
                        {column.default_value && (
                          <>
                            <span>•</span>
                            <span>По умолчанию: {column.default_value}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleUpdateColumn(editingColumn)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingColumn(null)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingColumn(column)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteColumn(column.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { ColumnManager };
