import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GitBranch, Plus, Trash2, AlertCircle } from 'lucide-react';

interface ChecklistDependenciesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistId: string;
}

interface ChecklistItem {
  id: string;
  item_text: string;
  is_completed: boolean;
  order_index: number;
}

interface Dependency {
  id: string;
  blocked_item_id: string;
  depends_on_item_id: string;
  dependency_type: string;
}

export const ChecklistDependenciesDialog = ({
  open,
  onOpenChange,
  checklistId,
}: ChecklistDependenciesDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newDependency, setNewDependency] = useState({
    blocked_item_id: '',
    depends_on_item_id: '',
    dependency_type: 'finish_to_start',
  });

  // Load checklist items
  const { data: items } = useQuery({
    queryKey: ['checklist-items', checklistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklistId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as ChecklistItem[];
    },
    enabled: open,
  });

  // Load dependencies
  const { data: dependencies } = useQuery({
    queryKey: ['checklist-dependencies', checklistId],
    queryFn: async () => {
      if (!items || items.length === 0) return [];

      const itemIds = items.map(i => i.id);

      const { data, error } = await supabase
        .from('checklist_dependencies')
        .select('*')
        .in('blocked_item_id', itemIds);

      if (error) throw error;
      return data as Dependency[];
    },
    enabled: open && !!items && items.length > 0,
  });

  // Create dependency
  const createDependencyMutation = useMutation({
    mutationFn: async (dep: typeof newDependency) => {
      const { error } = await supabase
        .from('checklist_dependencies')
        .insert(dep);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-dependencies'] });
      setNewDependency({
        blocked_item_id: '',
        depends_on_item_id: '',
        dependency_type: 'finish_to_start',
      });
      toast({ description: 'Dependency created' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating dependency',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete dependency
  const deleteDependencyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('checklist_dependencies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-dependencies'] });
      toast({ description: 'Dependency removed' });
    },
  });

  const getItemText = (itemId: string) => {
    return items?.find(i => i.id === itemId)?.item_text || 'Unknown';
  };

  const isItemCompleted = (itemId: string) => {
    return items?.find(i => i.id === itemId)?.is_completed || false;
  };

  // Detect circular dependencies
  const wouldCreateCircularDependency = (blocked: string, dependsOn: string): boolean => {
    if (!dependencies) return false;

    const visited = new Set<string>();
    const stack = [dependsOn];

    while (stack.length > 0) {
      const current = stack.pop()!;

      if (current === blocked) return true;
      if (visited.has(current)) continue;

      visited.add(current);

      // Find all items that depend on current
      const nextDeps = dependencies
        .filter(d => d.depends_on_item_id === current)
        .map(d => d.blocked_item_id);

      stack.push(...nextDeps);
    }

    return false;
  };

  const canCreateDependency = () => {
    if (!newDependency.blocked_item_id || !newDependency.depends_on_item_id) return false;
    if (newDependency.blocked_item_id === newDependency.depends_on_item_id) return false;

    return !wouldCreateCircularDependency(
      newDependency.blocked_item_id,
      newDependency.depends_on_item_id
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Task Dependencies
          </DialogTitle>
          <DialogDescription>
            Define which tasks must be completed before others can start
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Existing Dependencies */}
          <div className="space-y-3 mb-6">
            <h3 className="font-medium text-sm">Existing Dependencies</h3>
            {dependencies && dependencies.length > 0 ? (
              dependencies.map((dep) => (
                <Card key={dep.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isItemCompleted(dep.depends_on_item_id) ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {isItemCompleted(dep.depends_on_item_id) ? '✓' : '○'}
                          </Badge>
                          <span className="text-sm font-medium">
                            {getItemText(dep.depends_on_item_id)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-6">
                          <span className="text-xs text-muted-foreground">blocks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isItemCompleted(dep.blocked_item_id) ? 'default' : 'outline'}
                            className="text-xs"
                          >
                            {isItemCompleted(dep.blocked_item_id) ? '✓' : '○'}
                          </Badge>
                          <span className="text-sm font-medium">
                            {getItemText(dep.blocked_item_id)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDependencyMutation.mutate(dep.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No dependencies defined yet</p>
            )}
          </div>

          {/* Add New Dependency */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Dependency
              </h3>

              <div className="space-y-3">
                <div>
                  <Label>This task (must be completed first)</Label>
                  <Select
                    value={newDependency.depends_on_item_id}
                    onValueChange={(value) =>
                      setNewDependency({ ...newDependency, depends_on_item_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {items?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.item_text}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Blocks this task</Label>
                  <Select
                    value={newDependency.blocked_item_id}
                    onValueChange={(value) =>
                      setNewDependency({ ...newDependency, blocked_item_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a task..." />
                    </SelectTrigger>
                    <SelectContent>
                      {items
                        ?.filter(i => i.id !== newDependency.depends_on_item_id)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.item_text}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {newDependency.blocked_item_id &&
                  newDependency.depends_on_item_id &&
                  wouldCreateCircularDependency(
                    newDependency.blocked_item_id,
                    newDependency.depends_on_item_id
                  ) && (
                    <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                      <p className="text-sm text-destructive">
                        This would create a circular dependency. Please choose different tasks.
                      </p>
                    </div>
                  )}

                <Button
                  onClick={() => createDependencyMutation.mutate(newDependency)}
                  disabled={!canCreateDependency() || createDependencyMutation.isPending}
                  className="w-full"
                >
                  Create Dependency
                </Button>
              </div>
            </CardContent>
          </Card>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
