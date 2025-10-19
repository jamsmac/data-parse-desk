import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Check, X } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ColumnType, TableSchema } from '@/types/database';

export interface CellEditorProps {
  column: TableSchema;
  value: any;
  onSave: (value: any) => void;
  onCancel: () => void;
  selectOptions?: string[];
  relationOptions?: Array<{ id: string; label: string }>;
}

export default function CellEditor({
  column,
  value: initialValue,
  onSave,
  onCancel,
  selectOptions = [],
  relationOptions = [],
}: CellEditorProps) {
  const columnType = column.column_type;
  const columnName = column.column_name;
  const [value, setValue] = useState(initialValue);
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const validate = (val: any): boolean => {
    switch (columnType) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValidEmail = !val || emailRegex.test(val);
        setIsValid(isValidEmail);
        setErrorMessage(isValidEmail ? '' : 'Некорректный email');
        return isValidEmail;

      case 'url':
        const urlRegex = /^https?:\/\/.+/;
        const isValidUrl = !val || urlRegex.test(val);
        setIsValid(isValidUrl);
        setErrorMessage(isValidUrl ? '' : 'URL должен начинаться с http:// или https://');
        return isValidUrl;

      case 'phone':
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        const cleanPhone = String(val || '').replace(/\s/g, '');
        const isValidPhone = !val || (phoneRegex.test(val) && cleanPhone.length >= 7);
        setIsValid(isValidPhone);
        setErrorMessage(isValidPhone ? '' : 'Некорректный номер телефона');
        return isValidPhone;

      case 'number':
        const isValidNumber = !val || !isNaN(parseFloat(val));
        setIsValid(isValidNumber);
        setErrorMessage(isValidNumber ? '' : 'Должно быть числом');
        return isValidNumber;

      default:
        setIsValid(true);
        setErrorMessage('');
        return true;
    }
  };

  const handleSave = () => {
    if (validate(value)) {
      let processedValue = value;

      // Обработка типов данных
      switch (columnType) {
        case 'number':
          processedValue = value ? parseFloat(value) : null;
          break;
        case 'boolean':
          processedValue = Boolean(value);
          break;
        case 'date':
          processedValue = value ? new Date(value).toISOString() : null;
          break;
      }

      onSave(processedValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  // Render different editors based on column type
  const renderEditor = () => {
    switch (columnType) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Введите ${columnName.toLowerCase()}...`}
            autoFocus
            className={!isValid ? 'border-destructive' : ''}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => {
              setValue(e.target.value);
              validate(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="0"
            autoFocus
            className={!isValid ? 'border-destructive' : ''}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value || ''}
            onChange={(e) => {
              setValue(e.target.value);
              validate(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="email@example.com"
            autoFocus
            className={!isValid ? 'border-destructive' : ''}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => {
              setValue(e.target.value);
              validate(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="https://example.com"
            autoFocus
            className={!isValid ? 'border-destructive' : ''}
          />
        );

      case 'phone':
        return (
          <Input
            type="tel"
            value={value || ''}
            onChange={(e) => {
              setValue(e.target.value);
              validate(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder="+7 (xxx) xxx-xx-xx"
            autoFocus
            className={!isValid ? 'border-destructive' : ''}
          />
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP', { locale: ru }) : 'Выберите дату'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => setValue(date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'boolean':
        return (
          <div className="flex items-center justify-between p-2 border rounded-md">
            <span className="text-sm">{value ? 'Да' : 'Нет'}</span>
            <Switch
              checked={Boolean(value)}
              onCheckedChange={setValue}
            />
          </div>
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите значение" />
            </SelectTrigger>
            <SelectContent>
              {selectOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi_select':
        return (
          <div className="space-y-2">
            {selectOptions.map((option) => {
              const isSelected = Array.isArray(value) && value.includes(option);
              return (
                <div key={option} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={option}
                    checked={isSelected}
                    onChange={(e) => {
                      const newValue = Array.isArray(value) ? [...value] : [];
                      if (e.target.checked) {
                        newValue.push(option);
                      } else {
                        const index = newValue.indexOf(option);
                        if (index > -1) newValue.splice(index, 1);
                      }
                      setValue(newValue);
                    }}
                    className="rounded"
                  />
                  <label htmlFor={option} className="text-sm">
                    {option}
                  </label>
                </div>
              );
            })}
          </div>
        );

      case 'relation':
        return (
          <Select value={value || ''} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Выберите связанную запись" />
            </SelectTrigger>
            <SelectContent>
              {relationOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <Input
              type="file"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    // Import supabase client
                    const { supabase } = await import('@/integrations/supabase/client');
                    
                    // Get user ID for folder structure
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('Not authenticated');

                    // Upload to Supabase Storage
                    const fileName = `${user.id}/${Date.now()}-${file.name}`;
                    const { data, error } = await supabase.storage
                      .from('cell-files')
                      .upload(fileName, file);

                    if (error) throw error;

                    // Get public URL
                    const { data: { publicUrl } } = supabase.storage
                      .from('cell-files')
                      .getPublicUrl(data.path);

                    setValue({ name: file.name, url: publicUrl, path: data.path });
                    setIsValid(true);
                  } catch (error) {
                    console.error('File upload error:', error);
                    setErrorMessage('Ошибка загрузки файла');
                    setIsValid(false);
                  }
                }
              }}
              autoFocus
            />
            {value?.url && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>📎 {value.name}</span>
                {value.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                  <img src={value.url} alt={value.name} className="h-20 w-20 object-cover rounded" />
                )}
              </div>
            )}
          </div>
        );

      case 'formula':
      case 'rollup':
      case 'lookup':
        return (
          <div className="p-2 border rounded-md bg-muted text-sm text-muted-foreground">
            Вычисляемое поле (только для чтения)
            <div className="mt-1 font-mono">{value || 'Нет данных'}</div>
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Введите ${columnName.toLowerCase()}...`}
            autoFocus
          />
        );
    }
  };

  // Вычисляемые поля нельзя редактировать
  const isReadOnly = ['formula', 'rollup', 'lookup'].includes(columnType);

  return (
    <div className="space-y-2">
      {renderEditor()}
      
      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {!isReadOnly && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isValid}
            className="gap-1"
          >
            <Check className="h-3 w-3" />
            Сохранить
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            className="gap-1"
          >
            <X className="h-3 w-3" />
            Отмена
          </Button>
        </div>
      )}
    </div>
  );
}

export { CellEditor };
