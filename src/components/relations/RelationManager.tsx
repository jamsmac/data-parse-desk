import { useState } from 'react';
import { Plus, Link as LinkIcon, Trash2, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { useRelations, useCreateRelation, useDeleteRelation } from '@/hooks/useRelations';
import { useDatabases } from '@/hooks/useDatabases';
import type { Database, RelationConfig } from '@/types/database';

export interface RelationManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseId: string;
}

const RELATION_TYPES = [
  { value: 'one_to_many', label: 'Один ко многим', icon: '1️⃣ → ∞' },
  { value: 'many_to_one', label: 'Многие к одному', icon: '∞ → 1️⃣' },
  { value: 'many_to_many', label: 'Многие ко многим', icon: '∞ ↔ ∞' },
];

export default function RelationManager({ open, onOpenChange, databaseId }: RelationManagerProps) {
  const { data: relations, isLoading } = useRelations(databaseId);
  const { data: databases = [] } = useDatabases(''); // TODO: Получить реальный userId
  const createRelation = useCreateRelation(databaseId);
  const deleteRelation = useDeleteRelation(databaseId);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRelation, setNewRelation] = useState<RelationConfig>({
    target_database_id: '',
    relation_type: 'one_to_many',
    display_field: 'name',
  });

  const handleCreateRelation = async () => {
    if (!newRelation.target_database_id) {
      toast.error('Выберите целевую базу данных');
      return;
    }

    try {
      await createRelation.mutateAsync(newRelation);
      toast.success('Связь создана');
      setIsCreateDialogOpen(false);
      setNewRelation({
        target_database_id: '',
        relation_type: 'one_to_many',
        display_field: 'name',
      });
    } catch (error) {
      toast.error('Ошибка при создании связи');
      console.error(error);
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    try {
      await deleteRelation.mutateAsync(relationId);
      toast.success('Связь удалена');
    } catch (error) {
      toast.error('Ошибка при удалении связи');
      console.error(error);
    }
  };

  const getTargetDatabase = (targetId: string) => {
    return databases.find(db => db.id === targetId);
  };

  const getRelationType = (type: string) => {
    return RELATION_TYPES.find(t => t.value === type);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Управление связями</DialogTitle>
          <DialogDescription>
            Создавайте связи между базами данных
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Связи между базами</h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Создать связь
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Новая связь</DialogTitle>
              <DialogDescription>
                Создайте связь с другой базой данных
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Целевая база данных</Label>
                <Select
                  value={newRelation.target_database_id}
                  onValueChange={(value) => setNewRelation({ ...newRelation, target_database_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите базу данных" />
                  </SelectTrigger>
                  <SelectContent>
                    {databases
                      .filter(db => db.id !== databaseId)
                      .map((db) => (
                        <SelectItem key={db.id} value={db.id}>
                          <div className="flex items-center gap-2">
                            <span>{db.icon}</span>
                            <span>{db.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Тип связи</Label>
                <Select
                  value={newRelation.relation_type}
                  onValueChange={(value) => setNewRelation({ ...newRelation, relation_type: value as 'one_to_many' | 'many_to_one' | 'many_to_many' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{type.icon}</span>
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-1">Что это значит?</p>
                <p className="text-muted-foreground">
                  {newRelation.relation_type === 'one_to_many' && 
                    'Одна запись в этой базе может быть связана с несколькими записями в целевой базе.'}
                  {newRelation.relation_type === 'many_to_one' && 
                    'Несколько записей в этой базе могут быть связаны с одной записью в целевой базе.'}
                  {newRelation.relation_type === 'many_to_many' && 
                    'Записи в обеих базах могут иметь множественные связи друг с другом.'}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleCreateRelation} disabled={createRelation.isPending}>
                {createRelation.isPending ? 'Создание...' : 'Создать'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Загрузка связей...</p>
            </div>
          ) : !relations || relations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <LinkIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="mb-2">Нет связей с другими базами</p>
              <p className="text-sm">Создайте связь для объединения данных из разных баз</p>
            </div>
          ) : (
            <div className="divide-y">
              {relations.map((relation) => {
                const targetDb = getTargetDatabase(relation.target_database_id);
                const relationType = getRelationType(relation.relation_type);

                return (
                  <div
                    key={relation.id}
                    className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <LinkIcon className="h-5 w-5 text-muted-foreground" />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          Связь с {targetDb?.icon} {targetDb?.name}
                        </span>
                        <Badge variant="outline" className="font-mono text-xs">
                          {relationType?.icon}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {relationType?.label}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {/* TODO: Открыть граф связей */}}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteRelation(relation.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

export { RelationManager };
