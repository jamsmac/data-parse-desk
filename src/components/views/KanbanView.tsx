import { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, MoreVertical } from 'lucide-react';
import { KanbanCard } from './KanbanCard';
import { KanbanColumn } from './KanbanColumn';

interface KanbanViewProps {
  data: any[];
  statusColumn: string;
  titleColumn?: string;
  descriptionColumn?: string;
  statuses?: string[];
  onCardClick?: (item: any) => void;
  onStatusChange?: (itemId: string, newStatus: string) => void;
  onAddCard?: (status: string) => void;
}

export function KanbanView({
  data,
  statusColumn,
  titleColumn = 'title',
  descriptionColumn = 'description',
  statuses = ['pending', 'in_progress', 'review', 'completed'],
  onCardClick,
  onStatusChange,
  onAddCard,
}: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Группируем данные по статусам
  const groupedData = statuses.reduce((acc, status) => {
    acc[status] = data.filter(item => item[statusColumn] === status);
    return acc;
  }, {} as Record<string, any[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveId(null);
      return;
    }

    // Проверяем, что перетаскиваем в другую колонку
    const activeItem = data.find(item => item.id === active.id);
    const newStatus = over.id as string;

    if (activeItem && activeItem[statusColumn] !== newStatus) {
      onStatusChange?.(active.id as string, newStatus);
    }

    setActiveId(null);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает',
      in_progress: 'В работе',
      review: 'На проверке',
      completed: 'Завершено',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      in_progress: 'bg-blue-500',
      review: 'bg-purple-500',
      completed: 'bg-green-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const activeItem = activeId ? data.find(item => item.id === activeId) : null;

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCorners}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statuses.map(status => {
          const items = groupedData[status] || [];
          
          return (
            <KanbanColumn
              key={status}
              id={status}
              title={getStatusLabel(status)}
              count={items.length}
              color={getStatusColor(status)}
              onAdd={() => onAddCard?.(status)}
            >
              <SortableContext
                items={items.map(item => item.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {items.map(item => (
                    <KanbanCard
                      key={item.id}
                      id={item.id}
                      title={item[titleColumn] || 'Без названия'}
                      description={item[descriptionColumn]}
                      onClick={() => onCardClick?.(item)}
                    />
                  ))}
                </div>
              </SortableContext>
            </KanbanColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeItem ? (
          <Card className="w-[300px] opacity-90 rotate-3 shadow-xl">
            <CardContent className="p-4">
              <h4 className="font-medium mb-2">{activeItem[titleColumn]}</h4>
              {activeItem[descriptionColumn] && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {activeItem[descriptionColumn]}
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
