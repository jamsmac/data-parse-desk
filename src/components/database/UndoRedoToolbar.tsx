import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UndoRedoToolbarProps {
  databaseId?: string;
}

export const UndoRedoToolbar = ({ databaseId }: UndoRedoToolbarProps) => {
  const { undo, redo, canUndo, canRedo } = useUndoRedo(databaseId);

  return (
    <div className="flex items-center gap-1 border-r pr-2 mr-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            className="h-8 w-8 p-0"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Отменить (Ctrl+Z)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            className="h-8 w-8 p-0"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Вернуть (Ctrl+Y)</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
