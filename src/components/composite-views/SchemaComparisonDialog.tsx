import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Plus, Minus, Edit } from 'lucide-react';

interface Column {
  name: string;
  type: string;
}

interface Schema {
  id: string;
  name: string;
  columns: Column[];
}

interface SchemaComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schemas: Schema[];
}

interface SchemaDiff {
  added: Column[];
  removed: Column[];
  modified: Array<{ name: string; oldType: string; newType: string }>;
}

export function SchemaComparisonDialog({ 
  open, 
  onOpenChange, 
  schemas 
}: SchemaComparisonDialogProps) {
  const [schema1Id, setSchema1Id] = useState<string>('');
  const [schema2Id, setSchema2Id] = useState<string>('');
  const [diff, setDiff] = useState<SchemaDiff | null>(null);

  const compareSchemas = () => {
    const s1 = schemas.find(s => s.id === schema1Id);
    const s2 = schemas.find(s => s.id === schema2Id);

    if (!s1 || !s2) return;

    const s1Map = new Map(s1.columns.map(c => [c.name, c.type]));
    const s2Map = new Map(s2.columns.map(c => [c.name, c.type]));

    const added: Column[] = [];
    const removed: Column[] = [];
    const modified: Array<{ name: string; oldType: string; newType: string }> = [];

    // Find added and modified
    s2.columns.forEach(col => {
      if (!s1Map.has(col.name)) {
        added.push(col);
      } else if (s1Map.get(col.name) !== col.type) {
        modified.push({
          name: col.name,
          oldType: s1Map.get(col.name)!,
          newType: col.type
        });
      }
    });

    // Find removed
    s1.columns.forEach(col => {
      if (!s2Map.has(col.name)) {
        removed.push(col);
      }
    });

    setDiff({ added, removed, modified });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Сравнение схем таблиц</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="space-y-2">
              <label className="text-sm font-medium">Схема 1 (старая)</label>
              <Select value={schema1Id} onValueChange={setSchema1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите схему" />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Схема 2 (новая)</label>
              <Select value={schema2Id} onValueChange={setSchema2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите схему" />
                </SelectTrigger>
                <SelectContent>
                  {schemas.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={compareSchemas} 
            disabled={!schema1Id || !schema2Id}
            className="w-full"
          >
            Сравнить схемы
          </Button>

          {diff && (
            <div className="space-y-4">
              {diff.added.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Plus className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold">Добавленные колонки ({diff.added.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {diff.added.map((col, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                          <Badge variant="outline">{col.name}</Badge>
                          <span className="text-sm text-muted-foreground">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {diff.removed.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Minus className="h-5 w-5 text-red-600" />
                      <h3 className="font-semibold">Удалённые колонки ({diff.removed.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {diff.removed.map((col, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded">
                          <Badge variant="outline">{col.name}</Badge>
                          <span className="text-sm text-muted-foreground">{col.type}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {diff.modified.length > 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Edit className="h-5 w-5 text-yellow-600" />
                      <h3 className="font-semibold">Изменённые колонки ({diff.modified.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {diff.modified.map((col, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                          <Badge variant="outline">{col.name}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {col.oldType} → {col.newType}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {diff.added.length === 0 && diff.removed.length === 0 && diff.modified.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-center text-muted-foreground">
                      Схемы идентичны
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
