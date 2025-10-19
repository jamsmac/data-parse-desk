import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface StatusColumnProps {
  data: {
    value: string;
    color?: string;
    label?: string;
  };
  options: StatusOption[];
  onChange: (newValue: string) => Promise<void>;
  readOnly?: boolean;
}

export function StatusColumn({ data, options, onChange, readOnly = false }: StatusColumnProps) {
  const currentOption = options.find((opt) => opt.value === data.value) || {
    value: data.value,
    label: data.label || data.value,
    color: data.color || '#gray',
  };

  const handleChange = async (newValue: string) => {
    if (readOnly) return;

    try {
      await onChange(newValue);
      toast.success('Статус обновлён');
    } catch (error) {
      toast.error('Ошибка обновления статуса');
    }
  };

  if (readOnly) {
    return (
      <Badge
        style={{
          backgroundColor: `${currentOption.color}20`,
          color: currentOption.color,
          borderColor: currentOption.color,
        }}
        className="border"
      >
        {currentOption.label}
      </Badge>
    );
  }

  return (
    <Select value={data.value} onValueChange={handleChange}>
      <SelectTrigger className="w-full">
        <SelectValue>
          <Badge
            style={{
              backgroundColor: `${currentOption.color}20`,
              color: currentOption.color,
              borderColor: currentOption.color,
            }}
            className="border"
          >
            {currentOption.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <Badge
              style={{
                backgroundColor: `${option.color}20`,
                color: option.color,
                borderColor: option.color,
              }}
              className="border"
            >
              {option.label}
            </Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
