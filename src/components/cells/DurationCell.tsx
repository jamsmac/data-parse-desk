/**
 * DurationCell - Time duration input/display in table cell
 * Supports formats: HH:MM:SS, HH:MM, MM:SS
 */

import { DurationConfig } from '@/types/database';
import { Input } from '@/components/ui/input';
import { Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DurationCellProps {
  value?: number | null;  // Duration in seconds
  config: DurationConfig;
  onChange?: (seconds: number) => void;
  readonly?: boolean;
}

export function DurationCell({
  value = 0,
  config,
  onChange,
  readonly = false
}: DurationCellProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const format = config.format || 'hh:mm:ss';

  useEffect(() => {
    if (editing) {
      setInputValue(formatDuration(value || 0, format));
    }
  }, [editing, value, format]);

  // Convert seconds to formatted string
  const formatDuration = (seconds: number, fmt: string): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    switch (fmt) {
      case 'hh:mm:ss':
        return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
      case 'hh:mm':
        return `${pad(hours)}:${pad(minutes)}`;
      case 'mm:ss':
        return `${pad(minutes)}:${pad(secs)}`;
      default:
        return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
  };

  // Parse formatted string to seconds
  const parseDuration = (str: string, fmt: string): number | null => {
    const parts = str.split(':').map(p => parseInt(p, 10));

    if (parts.some(isNaN)) return null;

    switch (fmt) {
      case 'hh:mm:ss':
        if (parts.length !== 3) return null;
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      case 'hh:mm':
        if (parts.length !== 2) return null;
        return parts[0] * 3600 + parts[1] * 60;
      case 'mm:ss':
        if (parts.length !== 2) return null;
        return parts[0] * 60 + parts[1];
      default:
        return null;
    }
  };

  // Get human-readable duration
  const getHumanDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  };

  const handleBlur = () => {
    if (!onChange) {
      setEditing(false);
      return;
    }

    const parsed = parseDuration(inputValue, format);
    if (parsed !== null) {
      onChange(parsed);
    } else {
      // Invalid input, revert to original value
      setInputValue(formatDuration(value || 0, format));
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setInputValue(formatDuration(value || 0, format));
      setEditing(false);
    }
  };

  const displayValue = formatDuration(value || 0, format);

  if (readonly || !onChange) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span className="font-mono">{displayValue}</span>
        <span className="text-xs text-muted-foreground">
          ({getHumanDuration(value || 0)})
        </span>
      </div>
    );
  }

  if (editing) {
    return (
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={format.toUpperCase()}
        className="h-8 w-32 font-mono"
        autoFocus
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className={cn(
        "flex items-center gap-2 text-sm cursor-pointer hover:bg-accent p-1 rounded transition-colors",
        "min-h-[2rem]"
      )}
    >
      <Clock className="h-4 w-4 text-muted-foreground" />
      <span className="font-mono">{displayValue}</span>
      <span className="text-xs text-muted-foreground">
        ({getHumanDuration(value || 0)})
      </span>
    </div>
  );
}
