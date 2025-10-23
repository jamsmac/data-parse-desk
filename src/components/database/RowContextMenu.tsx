import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Copy,
  Trash2,
  Edit2,
  Eye,
  History,
  Files,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface RowContextMenuProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onView?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
  onInsertAbove?: () => void;
  onInsertBelow?: () => void;
  disabled?: boolean;
}

export function RowContextMenu({
  children,
  onEdit,
  onView,
  onDuplicate,
  onDelete,
  onHistory,
  onInsertAbove,
  onInsertBelow,
  disabled = false,
}: RowContextMenuProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onView && (
          <>
            <ContextMenuItem onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              Просмотр
              <ContextMenuShortcut>Enter</ContextMenuShortcut>
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {onEdit && (
          <ContextMenuItem onClick={onEdit}>
            <Edit2 className="mr-2 h-4 w-4" />
            Редактировать
            <ContextMenuShortcut>E</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {onDuplicate && (
          <ContextMenuItem onClick={onDuplicate}>
            <Files className="mr-2 h-4 w-4" />
            Дублировать
            <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {onHistory && (
          <ContextMenuItem onClick={onHistory}>
            <History className="mr-2 h-4 w-4" />
            История изменений
            <ContextMenuShortcut>H</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {(onInsertAbove || onInsertBelow) && <ContextMenuSeparator />}

        {onInsertAbove && (
          <ContextMenuItem onClick={onInsertAbove}>
            <ArrowUp className="mr-2 h-4 w-4" />
            Вставить строку выше
            <ContextMenuShortcut>Ctrl+Shift+↑</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {onInsertBelow && (
          <ContextMenuItem onClick={onInsertBelow}>
            <ArrowDown className="mr-2 h-4 w-4" />
            Вставить строку ниже
            <ContextMenuShortcut>Ctrl+Shift+↓</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
              <ContextMenuShortcut>Del</ContextMenuShortcut>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
