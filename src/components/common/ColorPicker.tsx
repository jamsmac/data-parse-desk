import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Красный', value: '#ef4444' },
  { name: 'Оранжевый', value: '#f97316' },
  { name: 'Янтарный', value: '#f59e0b' },
  { name: 'Желтый', value: '#eab308' },
  { name: 'Лаймовый', value: '#84cc16' },
  { name: 'Зеленый', value: '#22c55e' },
  { name: 'Изумрудный', value: '#10b981' },
  { name: 'Бирюзовый', value: '#14b8a6' },
  { name: 'Голубой', value: '#06b6d4' },
  { name: 'Синий', value: '#3b82f6' },
  { name: 'Индиго', value: '#6366f1' },
  { name: 'Фиолетовый', value: '#8b5cf6' },
  { name: 'Пурпурный', value: '#a855f7' },
  { name: 'Розовый', value: '#ec4899' },
  { name: 'Малиновый', value: '#f43f5e' },
  { name: 'Серый', value: '#6b7280' },
  { name: 'Черный', value: '#1f2937' },
  { name: 'Белый', value: '#f9fafb' },
];

const GRADIENT_PRESETS = [
  { name: 'Закат', value: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
  { name: 'Океан', value: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' },
  { name: 'Лес', value: 'linear-gradient(135deg, #84cc16 0%, #22c55e 100%)' },
  { name: 'Космос', value: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' },
  { name: 'Рассвет', value: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' },
  { name: 'Аврора', value: 'linear-gradient(135deg, #14b8a6 0%, #a855f7 100%)' },
];

interface ColorPickerProps {
  value?: string;
  onChange: (color: string) => void;
  className?: string;
  showGradients?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value = '#3b82f6',
  onChange,
  className,
  showGradients = false,
}) => {
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'gradients'>(
    'presets'
  );

  const handleSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (newColor: string) => {
    setCustomColor(newColor);
    onChange(newColor);
  };

  const isGradient = value?.startsWith('linear-gradient');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-start', className)}
        >
          <div
            className="mr-2 h-4 w-4 rounded border"
            style={{
              background: value || '#3b82f6',
            }}
          />
          <span className="truncate">
            {isGradient
              ? 'Градиент'
              : PRESET_COLORS.find((c) => c.value === value)?.name || value}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="space-y-4 p-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b pb-2">
            <Button
              variant={activeTab === 'presets' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('presets')}
              className="flex-1"
            >
              Палитра
            </Button>
            <Button
              variant={activeTab === 'custom' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('custom')}
              className="flex-1"
            >
              Свой цвет
            </Button>
            {showGradients && (
              <Button
                variant={activeTab === 'gradients' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('gradients')}
                className="flex-1"
              >
                Градиенты
              </Button>
            )}
          </div>

          {/* Preset Colors */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-6 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleSelect(color.value)}
                  className={cn(
                    'h-10 w-10 rounded-md border-2 transition-all hover:scale-110',
                    value === color.value
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-transparent hover:border-gray-300'
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {value === color.value && (
                    <Check className="h-4 w-4 mx-auto text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Custom Color */}
          {activeTab === 'custom' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Выберите цвет</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="h-10 w-20 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Предпросмотр</Label>
                <div
                  className="h-20 w-full rounded-md border"
                  style={{ backgroundColor: customColor }}
                />
              </div>

              {/* Common Colors Quick Access */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Быстрый доступ
                </Label>
                <div className="grid grid-cols-8 gap-1">
                  {PRESET_COLORS.slice(0, 16).map((color) => (
                    <button
                      key={color.value}
                      onClick={() => handleCustomColorChange(color.value)}
                      className="h-6 w-6 rounded border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Gradients */}
          {activeTab === 'gradients' && showGradients && (
            <div className="space-y-2">
              {GRADIENT_PRESETS.map((gradient) => (
                <button
                  key={gradient.name}
                  onClick={() => handleSelect(gradient.value)}
                  className={cn(
                    'w-full h-12 rounded-md border-2 transition-all hover:scale-105 relative overflow-hidden',
                    value === gradient.value
                      ? 'border-primary ring-2 ring-primary ring-offset-2'
                      : 'border-transparent hover:border-gray-300'
                  )}
                  style={{ background: gradient.value }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white font-medium drop-shadow-md">
                      {gradient.name}
                    </span>
                    {value === gradient.value && (
                      <Check className="ml-2 h-4 w-4 text-white drop-shadow-md" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Отмена
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Применить
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
