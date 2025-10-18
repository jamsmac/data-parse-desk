import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: any;
  columnType: string;
  onSave: (value: any) => void;
  onCancel: () => void;
}

export function EditableCell({ value, columnType, onSave, onCancel }: EditableCellProps) {
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSave(editValue);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      onSave(editValue);
    }
  };

  const handleBlur = () => {
    onSave(editValue);
  };

  // Text input
  if (columnType === 'text' || columnType === 'string') {
    return (
      <Input
        ref={inputRef}
        value={editValue || ''}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="h-8 text-sm"
      />
    );
  }

  // Number input
  if (columnType === 'number' || columnType === 'integer' || columnType === 'decimal') {
    return (
      <Input
        ref={inputRef}
        type="number"
        value={editValue || ''}
        onChange={(e) => setEditValue(e.target.value ? parseFloat(e.target.value) : null)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="h-8 text-sm"
      />
    );
  }

  // Boolean checkbox
  if (columnType === 'boolean') {
    return (
      <div className="flex items-center h-8">
        <Checkbox
          checked={editValue === true}
          onCheckedChange={(checked) => {
            setEditValue(checked);
            onSave(checked);
          }}
        />
      </div>
    );
  }

  // Date picker
  if (columnType === 'date' || columnType === 'datetime') {
    const dateValue = editValue ? new Date(editValue) : undefined;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-8 w-full justify-start text-left text-sm font-normal',
              !dateValue && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={dateValue}
            onSelect={(date) => {
              setEditValue(date?.toISOString());
              onSave(date?.toISOString());
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Default text input
  return (
    <Input
      ref={inputRef}
      value={editValue || ''}
      onChange={(e) => setEditValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="h-8 text-sm"
    />
  );
}
