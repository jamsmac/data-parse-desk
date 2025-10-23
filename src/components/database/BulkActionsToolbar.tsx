import React from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Copy, Edit2, X } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onClear: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onDelete,
  onDuplicate,
  onEdit,
  onClear,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-primary text-primary-foreground shadow-lg rounded-lg px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{selectedCount}</span>
          <span className="text-sm">
            {selectedCount === 1 ? 'запись выбрана' :
             selectedCount < 5 ? 'записи выбрано' :
             'записей выбрано'}
          </span>
        </div>

        <div className="h-6 w-px bg-primary-foreground/20" />

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onEdit}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Редактировать
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4 mr-2" />
            Дублировать
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить
          </Button>
        </div>

        <div className="h-6 w-px bg-primary-foreground/20" />

        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
