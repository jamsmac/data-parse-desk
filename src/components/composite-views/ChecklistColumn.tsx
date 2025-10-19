import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ChecklistItem {
  text: string;
  checked: boolean;
  timestamp?: string;
  user_id?: string;
}

interface ChecklistColumnProps {
  data: {
    items: ChecklistItem[];
    completed?: number;
    total?: number;
  };
  onToggle: (itemIndex: number) => Promise<void>;
  onCompleteAll?: () => Promise<void>;
  onReset?: () => Promise<void>;
  readOnly?: boolean;
}

export function ChecklistColumn({
  data,
  onToggle,
  onCompleteAll,
  onReset,
  readOnly = false,
}: ChecklistColumnProps) {
  const [toggling, setToggling] = useState<number | null>(null);

  const items = data.items || [];
  const completed = items.filter((item) => item.checked).length;
  const total = items.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = async (index: number) => {
    if (readOnly) return;

    setToggling(index);
    try {
      await onToggle(index);
      toast.success(items[index].checked ? 'Снята отметка' : 'Отмечено');
    } catch (error) {
      toast.error('Ошибка обновления');
    } finally {
      setToggling(null);
    }
  };

  const handleCompleteAll = async () => {
    if (!onCompleteAll || readOnly) return;
    try {
      await onCompleteAll();
      toast.success('Все задачи отмечены');
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const handleReset = async () => {
    if (!onReset || readOnly) return;
    try {
      await onReset();
      toast.success('Чеклист сброшен');
    } catch (error) {
      toast.error('Ошибка сброса');
    }
  };

  return (
    <div className="space-y-2 p-2">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {completed} из {total} выполнено
          </span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Checklist items */}
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-1.5 rounded transition-colors ${
              item.checked ? 'bg-muted/50' : 'hover:bg-muted/30'
            }`}
          >
            <Checkbox
              checked={item.checked}
              onCheckedChange={() => handleToggle(index)}
              disabled={readOnly || toggling === index}
              className="mt-0.5"
            />
            <span
              className={`flex-1 text-sm ${
                item.checked ? 'line-through text-muted-foreground' : ''
              }`}
            >
              {item.text}
            </span>
            {item.checked && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />}
            {!item.checked && <Circle className="h-4 w-4 text-muted-foreground mt-0.5" />}
          </div>
        ))}
      </div>

      {/* Actions */}
      {!readOnly && (completed < total || completed > 0) && (
        <div className="flex items-center gap-2 pt-2 border-t">
          {completed < total && onCompleteAll && (
            <Button size="sm" variant="outline" onClick={handleCompleteAll} className="flex-1">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Отметить все
            </Button>
          )}
          {completed > 0 && onReset && (
            <Button size="sm" variant="outline" onClick={handleReset} className="flex-1">
              <RotateCcw className="h-3 w-3 mr-1" />
              Сбросить
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
