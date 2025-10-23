import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

// Import new cell components
import { ButtonCell } from '@/components/cells/ButtonCell';
import { UserCell } from '@/components/cells/UserCell';
import { RatingCell } from '@/components/cells/RatingCell';
import { DurationCell } from '@/components/cells/DurationCell';
import { PercentCell } from '@/components/cells/PercentCell';
import { BarcodeCell } from '@/components/cells/BarcodeCell';
import { QRCell } from '@/components/cells/QRCell';

type CellValue = string | number | boolean | null | Date;
type ColumnConfig = Record<string, unknown>;
type RowData = Record<string, CellValue>;

interface EditableCellProps {
  value: CellValue;
  columnType: string;
  onSave: (value: CellValue) => void;
  onCancel: () => void;
  columnConfig?: ColumnConfig;  // Config for special column types
  rowData?: RowData;  // Full row data for button actions
}

export function EditableCell({ value, columnType, onSave, onCancel, columnConfig, rowData }: EditableCellProps) {
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

  // Button cell (readonly - buttons don't need editing)
  if (columnType === 'button') {
    return (
      <ButtonCell
        value={value}
        config={columnConfig || { label: 'Action', action: 'custom' }}
        rowData={rowData}
        onAction={(action, data) => {
          console.log('Button action:', action, data);
        }}
      />
    );
  }

  // User cell
  if (columnType === 'user') {
    return (
      <UserCell
        value={value}
        users={[]} // TODO: Pass actual users list from props
        onChange={(userId) => {
          setEditValue(userId);
          onSave(userId);
        }}
      />
    );
  }

  // Rating cell
  if (columnType === 'rating') {
    return (
      <RatingCell
        value={value}
        config={columnConfig || { max_stars: 5, allow_half: false }}
        onChange={(rating) => {
          setEditValue(rating);
          onSave(rating);
        }}
      />
    );
  }

  // Duration cell
  if (columnType === 'duration') {
    return (
      <DurationCell
        value={value}
        config={columnConfig || { format: 'hh:mm:ss' }}
        onChange={(seconds) => {
          setEditValue(seconds);
          onSave(seconds);
        }}
      />
    );
  }

  // Percent cell
  if (columnType === 'percent') {
    return (
      <PercentCell
        value={value}
        config={columnConfig || { show_progress_bar: true, min: 0, max: 100 }}
        onChange={(percent) => {
          setEditValue(percent);
          onSave(percent);
        }}
      />
    );
  }

  // Barcode cell
  if (columnType === 'barcode') {
    return (
      <BarcodeCell
        value={value}
        config={columnConfig || { format: 'CODE128', display_value: true }}
        onChange={(barcodeValue) => {
          setEditValue(barcodeValue);
          onSave(barcodeValue);
        }}
      />
    );
  }

  // QR code cell
  if (columnType === 'qr') {
    return (
      <QRCell
        value={value}
        config={columnConfig || { size: 128, error_correction: 'M' }}
        onChange={(qrValue) => {
          setEditValue(qrValue);
          onSave(qrValue);
        }}
      />
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
