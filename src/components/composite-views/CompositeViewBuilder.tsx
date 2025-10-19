import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, Eye, Link2, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TableRef {
  database_id: string;
  table_name: string;
  alias: string;
}

interface JoinConfig {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  left: string;
  right: string;
}

interface ColumnConfig {
  source: string;
  alias: string;
  visible: boolean;
}

interface CustomColumnConfig {
  name: string;
  type: 'checklist' | 'status' | 'progress';
  config: any;
}

interface CompositeViewBuilderProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

export function CompositeViewBuilder({ open, onClose, projectId }: CompositeViewBuilderProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tables, setTables] = useState<TableRef[]>([]);
  const [joins, setJoins] = useState<JoinConfig[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [customColumns, setCustomColumns] = useState<CustomColumnConfig[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Load databases for this project
  const { data: databases } = useQuery({
    queryKey: ['databases', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('databases')
        .select('id, name, table_schemas(*)')
        .eq('project_id', projectId);
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const config = {
        tables,
        joins,
        columns,
        custom_columns: customColumns,
      };

      const { data, error } = await supabase.functions.invoke('composite-views-create', {
        body: { project_id: projectId, name, description, config },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Составное представление создано');
      queryClient.invalidateQueries({ queryKey: ['composite-views', projectId] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Ошибка создания');
    },
  });

  const handleClose = () => {
    setName('');
    setDescription('');
    setTables([]);
    setJoins([]);
    setColumns([]);
    setCustomColumns([]);
    setShowPreview(false);
    onClose();
  };

  const addTable = () => {
    if (!databases || databases.length === 0) return;
    const firstDb = databases[0];
    setTables([
      ...tables,
      {
        database_id: firstDb.id,
        table_name: firstDb.name,
        alias: `t${tables.length + 1}`,
      },
    ]);
  };

  const removeTable = (index: number) => {
    const newTables = tables.filter((_, i) => i !== index);
    setTables(newTables);
    // Remove related joins
    if (index > 0) {
      const newJoins = joins.filter((_, i) => i !== index - 1);
      setJoins(newJoins);
    }
  };

  const addJoin = () => {
    if (tables.length < 2) return;
    setJoins([
      ...joins,
      {
        type: 'INNER',
        left: `${tables[joins.length].alias}.id`,
        right: `${tables[joins.length + 1].alias}.id`,
      },
    ]);
  };

  const addColumn = () => {
    if (tables.length === 0) return;
    const table = tables[0];
    setColumns([
      ...columns,
      {
        source: `${table.alias}.id`,
        alias: 'column_' + columns.length,
        visible: true,
      },
    ]);
  };

  const loadPreview = async () => {
    try {
      const config = { tables, joins, columns, custom_columns: customColumns };
      const { data, error } = await supabase.functions.invoke('composite-views-query', {
        body: { config, limit: 10 },
      });

      if (error) throw error;
      setPreviewData(data.rows || []);
      setShowPreview(true);
      toast.success('Предпросмотр загружен');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка предпросмотра');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать составное представление</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">Конфигурация</TabsTrigger>
            <TabsTrigger value="columns">Колонки</TabsTrigger>
            <TabsTrigger value="preview">Предпросмотр</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Заказы с клиентами"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание (опционально)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Объединение данных о заказах и клиентах"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Таблицы</Label>
                <Button size="sm" variant="outline" onClick={addTable}>
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить таблицу
                </Button>
              </div>

              <div className="space-y-2">
                {tables.map((table, index) => (
                  <Card key={index}>
                    <CardContent className="p-3 flex items-center gap-2">
                      <Table2 className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={table.database_id}
                        onValueChange={(value) => {
                          const db = databases?.find((d) => d.id === value);
                          if (db) {
                            const newTables = [...tables];
                            newTables[index] = {
                              ...table,
                              database_id: value,
                              table_name: db.name,
                            };
                            setTables(newTables);
                          }
                        }}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {databases?.map((db) => (
                            <SelectItem key={db.id} value={db.id}>
                              {db.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Badge variant="outline">Алиас: {table.alias}</Badge>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeTable(index)}
                        className="ml-auto"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {tables.length >= 2 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>JOIN условия</Label>
                  {tables.length > joins.length + 1 && (
                    <Button size="sm" variant="outline" onClick={addJoin}>
                      <Link2 className="h-4 w-4 mr-1" />
                      Добавить JOIN
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  {joins.map((join, index) => (
                    <Card key={index}>
                      <CardContent className="p-3 flex items-center gap-2">
                        <Select
                          value={join.type}
                          onValueChange={(value: any) => {
                            const newJoins = [...joins];
                            newJoins[index].type = value;
                            setJoins(newJoins);
                          }}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INNER">INNER</SelectItem>
                            <SelectItem value="LEFT">LEFT</SelectItem>
                            <SelectItem value="RIGHT">RIGHT</SelectItem>
                            <SelectItem value="FULL">FULL</SelectItem>
                          </SelectContent>
                        </Select>

                        <Input
                          value={join.left}
                          onChange={(e) => {
                            const newJoins = [...joins];
                            newJoins[index].left = e.target.value;
                            setJoins(newJoins);
                          }}
                          placeholder="t1.customer_id"
                          className="flex-1"
                        />

                        <span className="text-muted-foreground">=</span>

                        <Input
                          value={join.right}
                          onChange={(e) => {
                            const newJoins = [...joins];
                            newJoins[index].right = e.target.value;
                            setJoins(newJoins);
                          }}
                          placeholder="t2.id"
                          className="flex-1"
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="columns" className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Колонки для отображения</Label>
              <Button size="sm" variant="outline" onClick={addColumn}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить колонку
              </Button>
            </div>

            <div className="space-y-2">
              {columns.map((column, index) => (
                <Card key={index}>
                  <CardContent className="p-3 flex items-center gap-2">
                    <Input
                      value={column.source}
                      onChange={(e) => {
                        const newColumns = [...columns];
                        newColumns[index].source = e.target.value;
                        setColumns(newColumns);
                      }}
                      placeholder="t1.column_name"
                      className="flex-1"
                    />

                    <Input
                      value={column.alias}
                      onChange={(e) => {
                        const newColumns = [...columns];
                        newColumns[index].alias = e.target.value;
                        setColumns(newColumns);
                      }}
                      placeholder="Название"
                      className="flex-1"
                    />

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setColumns(columns.filter((_, i) => i !== index))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <div className="space-y-4">
              <Button onClick={loadPreview} disabled={tables.length === 0 || columns.length === 0}>
                <Eye className="h-4 w-4 mr-2" />
                Загрузить предпросмотр
              </Button>

              {showPreview && previewData.length > 0 && (
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        {Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="p-2 text-left font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-t">
                          {Object.values(row).map((value: any, j) => (
                            <td key={j} className="p-2">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Отмена
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name || tables.length === 0 || columns.length === 0 || createMutation.isPending}
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
