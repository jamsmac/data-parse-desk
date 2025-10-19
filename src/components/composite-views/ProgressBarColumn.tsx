import { useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ProgressBarColumnProps {
  data: {
    value: number;
    auto_calculate?: boolean;
    source_checklist?: string;
  };
  onChange: (newValue: number) => Promise<void>;
  readOnly?: boolean;
}

export function ProgressBarColumn({ data, onChange, readOnly = false }: ProgressBarColumnProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.value.toString());

  const progress = Math.min(100, Math.max(0, data.value));

  const getProgressColor = (value: number) => {
    if (value < 30) return 'bg-red-500';
    if (value < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSave = async () => {
    const newValue = parseInt(editValue);
    if (isNaN(newValue) || newValue < 0 || newValue > 100) {
      toast.error('Значение должно быть от 0 до 100');
      return;
    }

    try {
      await onChange(newValue);
      setEditing(false);
      toast.success('Прогресс обновлён');
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const handleCancel = () => {
    setEditValue(data.value.toString());
    setEditing(false);
  };

  if (editing && !readOnly) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          max="100"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-20"
          autoFocus
        />
        <span className="text-sm text-muted-foreground">%</span>
        <Button size="sm" variant="ghost" onClick={handleSave}>
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={handleCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 group">
      <div className="flex-1 space-y-1">
        <Progress value={progress} className="h-3" />
        {data.auto_calculate && data.source_checklist && (
          <p className="text-xs text-muted-foreground">
            Авто-расчёт из {data.source_checklist}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium min-w-[3rem] text-right">{progress}%</span>
        {!readOnly && !data.auto_calculate && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
