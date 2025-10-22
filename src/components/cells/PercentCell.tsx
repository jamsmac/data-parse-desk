/**
 * PercentCell - Percentage display with progress bar
 * Supports color schemes: default, success, warning, danger
 */

import { PercentConfig } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PercentCellProps {
  value?: number | null;  // Percentage value (0-100 or min-max)
  config: PercentConfig;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

export function PercentCell({
  value = 0,
  config,
  onChange,
  readonly = false
}: PercentCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(value || 0));

  const min = config.min ?? 0;
  const max = config.max ?? 100;
  const showProgressBar = config.show_progress_bar ?? true;
  const colorScheme = config.color_scheme || 'default';

  // Clamp value between min and max
  const clampedValue = Math.max(min, Math.min(max, value || 0));
  const percentage = ((clampedValue - min) / (max - min)) * 100;

  const getColorClass = () => {
    switch (colorScheme) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'danger':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getProgressColor = () => {
    switch (colorScheme) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'danger':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const handleBlur = () => {
    if (!onChange) {
      setEditing(false);
      return;
    }

    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setInputValue(String(value || 0));
      setEditing(false);
    }
  };

  if (readonly || !onChange) {
    return (
      <div className="flex items-center gap-2 w-full">
        {showProgressBar && (
          <div className="flex-1 min-w-[60px]">
            <Progress
              value={percentage}
              className="h-2"
              indicatorClassName={getProgressColor()}
            />
          </div>
        )}
        <span className={cn("text-sm font-semibold whitespace-nowrap", getColorClass())}>
          {clampedValue.toFixed(1)}%
        </span>
      </div>
    );
  }

  if (editing) {
    return (
      <Input
        type="number"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step={0.1}
        className="h-8 w-20"
        autoFocus
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn(
        "flex items-center gap-2 w-full cursor-pointer hover:bg-accent p-1 rounded transition-colors",
        "min-h-[2rem]"
      )}
    >
      {showProgressBar && (
        <div className="flex-1 min-w-[60px]">
          <Progress
            value={percentage}
            className="h-2"
            indicatorClassName={getProgressColor()}
          />
        </div>
      )}
      <span className={cn("text-sm font-semibold whitespace-nowrap", getColorClass())}>
        {clampedValue.toFixed(1)}%
      </span>
    </div>
  );
}
