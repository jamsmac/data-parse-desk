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
}

export function RelationCell({
  value,
  relationId,
  targetDatabaseId,
  displayColumn,
  onChange,
  readOnly,
}: RelationCellProps) {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (value) {
      loadDisplayValue();
    } else {
      setDisplayValue('');
    }
  }, [value]);

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