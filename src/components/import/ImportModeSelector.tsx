import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Database, FileText } from 'lucide-react';

interface ImportModeSelectorProps {
  value: 'data' | 'schema_only';
  onChange: (value: 'data' | 'schema_only') => void;
}

export const ImportModeSelector = ({ value, onChange }: ImportModeSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label>Режим импорта</Label>
      <RadioGroup value={value} onValueChange={onChange as any}>
        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
          <RadioGroupItem value="data" id="data" />
          <Label htmlFor="data" className="flex items-center gap-2 cursor-pointer flex-1">
            <Database className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Импорт данных</p>
              <p className="text-xs text-muted-foreground">Загрузить структуру и данные</p>
            </div>
          </Label>
        </div>
        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
          <RadioGroupItem value="schema_only" id="schema_only" />
          <Label htmlFor="schema_only" className="flex items-center gap-2 cursor-pointer flex-1">
            <FileText className="h-4 w-4 text-primary" />
            <div>
              <p className="font-medium">Только схема</p>
              <p className="text-xs text-muted-foreground">Загрузить только структуру таблицы</p>
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};
