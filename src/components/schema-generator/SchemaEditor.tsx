import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Database, Trash2, Plus, Edit2, GripVertical } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface SchemaEntity {
  name: string;
  confidence: number;
  reasoning?: string;
  columns: Array<{
    name: string;
    type: string;
    primary_key?: boolean;
    nullable?: boolean;
    unique?: boolean;
    default?: string;
    references?: string;
  }>;
}

interface GeneratedSchema {
  entities: SchemaEntity[];
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    on: string;
    confidence: number;
  }>;
  indexes?: Array<{
    table: string;
    columns: string[];
    reason: string;
  }>;
  warnings?: string[];
}

interface SchemaEditorProps {
  schema: GeneratedSchema;
  onChange: (schema: GeneratedSchema) => void;
}

const COLUMN_TYPES = [
  'text',
  'integer',
  'bigint',
  'numeric',
  'boolean',
  'timestamp',
  'date',
  'time',
  'uuid',
  'jsonb',
  'varchar',
];

export function SchemaEditor({ schema, onChange }: SchemaEditorProps) {
  const [editingEntity, setEditingEntity] = useState<number | null>(null);

  const updateEntity = (index: number, updates: Partial<SchemaEntity>) => {
    const newEntities = [...schema.entities];
    newEntities[index] = { ...newEntities[index], ...updates };
    onChange({ ...schema, entities: newEntities });
  };

  const deleteEntity = (index: number) => {
    const newEntities = schema.entities.filter((_, i) => i !== index);
    onChange({ ...schema, entities: newEntities });
  };

  const addColumn = (entityIndex: number) => {
    const newEntities = [...schema.entities];
    newEntities[entityIndex].columns.push({
      name: 'new_column',
      type: 'text',
      nullable: true,
    });
    onChange({ ...schema, entities: newEntities });
  };

  const updateColumn = (
    entityIndex: number,
    columnIndex: number,
    updates: Partial<SchemaEntity['columns'][0]>
  ) => {
    const newEntities = [...schema.entities];
    newEntities[entityIndex].columns[columnIndex] = {
      ...newEntities[entityIndex].columns[columnIndex],
      ...updates,
    };
    onChange({ ...schema, entities: newEntities });
  };

  const deleteColumn = (entityIndex: number, columnIndex: number) => {
    const newEntities = [...schema.entities];
    newEntities[entityIndex].columns = newEntities[entityIndex].columns.filter(
      (_, i) => i !== columnIndex
    );
    onChange({ ...schema, entities: newEntities });
  };

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {schema.entities.map((entity, entityIdx) => (
          <Card key={entityIdx} className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <Database className="h-4 w-4" />
                  {editingEntity === entityIdx ? (
                    <Input
                      value={entity.name}
                      onChange={(e) => updateEntity(entityIdx, { name: e.target.value })}
                      className="h-8 font-semibold"
                      autoFocus
                    />
                  ) : (
                    <CardTitle className="text-base">{entity.name}</CardTitle>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditingEntity(editingEntity === entityIdx ? null : entityIdx)
                    }
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteEntity(entityIdx)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {/* Columns */}
              <div className="space-y-2">
                {entity.columns.map((col, colIdx) => (
                  <div
                    key={colIdx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Имя колонки</Label>
                        <Input
                          value={col.name}
                          onChange={(e) =>
                            updateColumn(entityIdx, colIdx, { name: e.target.value })
                          }
                          className="h-8"
                          placeholder="column_name"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Тип</Label>
                        <Select
                          value={col.type}
                          onValueChange={(value) =>
                            updateColumn(entityIdx, colIdx, { type: value })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COLUMN_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-muted-foreground">Свойства</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            id={`pk-${entityIdx}-${colIdx}`}
                            checked={col.primary_key || false}
                            onCheckedChange={(checked) =>
                              updateColumn(entityIdx, colIdx, { primary_key: checked as boolean })
                            }
                          />
                          <label
                            htmlFor={`pk-${entityIdx}-${colIdx}`}
                            className="text-xs cursor-pointer"
                          >
                            PK
                          </label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            id={`unique-${entityIdx}-${colIdx}`}
                            checked={col.unique || false}
                            onCheckedChange={(checked) =>
                              updateColumn(entityIdx, colIdx, { unique: checked as boolean })
                            }
                          />
                          <label
                            htmlFor={`unique-${entityIdx}-${colIdx}`}
                            className="text-xs cursor-pointer"
                          >
                            UNIQUE
                          </label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            id={`nullable-${entityIdx}-${colIdx}`}
                            checked={col.nullable !== false}
                            onCheckedChange={(checked) =>
                              updateColumn(entityIdx, colIdx, { nullable: checked as boolean })
                            }
                          />
                          <label
                            htmlFor={`nullable-${entityIdx}-${colIdx}`}
                            className="text-xs cursor-pointer"
                          >
                            NULL
                          </label>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteColumn(entityIdx, colIdx)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => addColumn(entityIdx)}
                className="w-full"
              >
                <Plus className="h-3 w-3 mr-2" />
                Добавить колонку
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
