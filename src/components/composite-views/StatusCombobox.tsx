import { useState } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronsUpDown, Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface StatusOption {
  value: string;
  label: string;
  color: string;
}

interface StatusComboboxProps {
  value: string;
  options: StatusOption[];
  columnId: string;
  onChange: (newValue: string) => Promise<void>;
  onCreateNew?: (newLabel: string, newColor: string) => Promise<void>;
  readOnly?: boolean;
}

export function StatusCombobox({
  value,
  options,
  columnId,
  onChange,
  onCreateNew,
  readOnly = false
}: StatusComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const currentOption = options.find(opt => opt.value === value) || {
    value,
    label: value,
    color: '#gray'
  };

  // Get recent statuses
  const { data: recentStatuses } = useQuery({
    queryKey: ['recent-statuses', columnId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_recent_statuses', {
        p_user_id: user.id,
        p_column_id: columnId,
        p_days: 7,
        p_limit: 5
      });

      if (error) {
        console.error('Error fetching recent statuses:', error);
        return [];
      }

      return data || [];
    },
    enabled: !readOnly
  });

  // Track status usage
  const trackUsageMutation = useMutation({
    mutationFn: async (statusValue: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('status_usage_history')
        .insert({
          user_id: user.id,
          column_id: columnId,
          status_value: statusValue
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recent-statuses', columnId] });
    }
  });

  const handleSelect = async (selectedValue: string) => {
    if (readOnly) return;

    try {
      await onChange(selectedValue);
      await trackUsageMutation.mutateAsync(selectedValue);
      toast.success('Статус обновлён');
      setOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Ошибка обновления статуса');
    }
  };

  const handleCreateNew = async () => {
    if (!search.trim() || !onCreateNew) return;

    // Check if already exists
    if (options.find(opt => opt.label.toLowerCase() === search.toLowerCase())) {
      toast.error('Такой статус уже существует');
      return;
    }

    // Generate random color
    const colors = [
      '#3b82f6', // blue
      '#22c55e', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    try {
      await onCreateNew(search, randomColor);
      toast.success(`Создан новый статус: ${search}`);
      setSearch('');
      setOpen(false);
    } catch (error) {
      console.error('Error creating new status:', error);
      toast.error('Ошибка создания статуса');
    }
  };

  // Filter options by search
  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  // Get recent status options
  const recentOptions = recentStatuses
    ?.map(recent => options.find(opt => opt.value === recent.status_value))
    .filter((opt): opt is StatusOption => opt !== undefined)
    .filter(opt => opt.value !== value) // Exclude current value
    .slice(0, 3) || [];

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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
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
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Поиск статуса..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {onCreateNew ? (
                <Button
                  onClick={handleCreateNew}
                  variant="ghost"
                  className="w-full justify-start"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Создать "{search}"
                </Button>
              ) : (
                <div className="py-6 text-center text-sm">
                  Статус не найден
                </div>
              )}
            </CommandEmpty>

            {/* Recent statuses */}
            {recentOptions.length > 0 && !search && (
              <CommandGroup heading="Недавно использованные">
                {recentOptions.map(option => (
                  <CommandItem
                    key={`recent-${option.value}`}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <Clock className="mr-2 h-4 w-4 text-gray-400" />
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
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* All statuses */}
            <CommandGroup heading={recentOptions.length > 0 && !search ? 'Все статусы' : undefined}>
              {filteredOptions.map(option => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={handleSelect}
                >
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
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
