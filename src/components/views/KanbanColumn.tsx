import { useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color: string;
  onAdd?: () => void;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, count, color, onAdd, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-[320px]">
      <Card className={`${isOver ? 'ring-2 ring-primary' : ''} h-full`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-base">{title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{count}</Badge>
              {onAdd && (
                <Button variant="ghost" size="icon" onClick={onAdd}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}
