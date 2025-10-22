import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import RelationPicker from '@/components/relations/RelationPicker';
import { resolveRelationSingle, getDisplayValue } from '@/utils/relationResolver';
import { ExternalLink } from 'lucide-react';

interface RelationCellProps {
  value: string | null;
  relationId: string;
  targetDatabaseId: string;
  displayColumn: string;
  onChange: (value: string | null) => void;
  readOnly?: boolean;
  resolvedValue?: string; // Pre-resolved display value from auto-loading
  resolvedData?: any; // Full resolved record data
}

export function RelationCell({
  value,
  relationId,
  targetDatabaseId,
  displayColumn,
  onChange,
  readOnly,
  resolvedValue,
  resolvedData,
}: RelationCellProps) {
  const [displayValue, setDisplayValue] = useState<string>(resolvedValue || '');
  const [showPicker, setShowPicker] = useState(false);

  // Use pre-resolved value if available, otherwise fetch
  useEffect(() => {
    if (resolvedValue) {
      // Already resolved by useTableData hook
      setDisplayValue(resolvedValue);
    } else if (value) {
      // Fallback: load manually
      loadDisplayValue();
    } else {
      setDisplayValue('');
    }
  }, [value, resolvedValue]);

  const loadDisplayValue = async () => {
    if (!value || !targetDatabaseId) return;

    const record = await resolveRelationSingle(targetDatabaseId, value, displayColumn);
    const display = getDisplayValue(record, displayColumn);
    setDisplayValue(display);
  };

  if (readOnly) {
    return (
      <div className="flex items-center gap-2">
        <span>{displayValue || '-'}</span>
        {value && (
          <Button variant="ghost" size="sm">
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  // RelationPicker needs proper props - simplified for now
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowPicker(true)}
      className="w-full justify-start"
    >
      {displayValue || 'Select...'}
    </Button>
  );
}