/**
 * Компонент настроек внешнего вида
 * Управление темой, цветами Aurora, шрифтами и плотностью интерфейса
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { GlassCard } from '@/components/aurora/layouts/GlassCard';
import { toast } from 'sonner';
import {
  Palette,
  Moon,
  Sun,
  Monitor,
  Sparkles,
  Type,
  Layout,
  Eye,
  Settings,
  Check
} from 'lucide-react';

interface ThemeSettings {
  theme: 'light' | 'dark' | 'system';
  auroraGradient: string;
  fontSize: number;
  density: 'compact' | 'default' | 'comfortable';
  animations: boolean;
  glassEffect: boolean;
  fontFamily: string;
}

const AURORA_GRADIENTS = [
  { id: 'primary', name: 'Primary', colors: 'from-primary via-primary/50 to-background' },
  { id: 'ocean', name: 'Ocean', colors: 'from-blue-500 via-cyan-500 to-teal-500' },
  { id: 'sunset', name: 'Sunset', colors: 'from-orange-500 via-pink-500 to-purple-500' },
  { id: 'forest', name: 'Forest', colors: 'from-green-500 via-emerald-500 to-teal-500' },
  { id: 'nebula', name: 'Nebula', colors: 'from-purple-500 via-pink-500 to-red-500' },
  { id: 'aurora', name: 'Aurora', colors: 'from-green-400 via-blue-500 to-purple-600' },
  { id: 'cosmic', name: 'Cosmic', colors: 'from-indigo-500 via-purple-500 to-pink-500' }
];

const FONT_FAMILIES = [
  { id: 'inter', name: 'Inter', value: 'Inter, sans-serif' },
  { id: 'system', name: 'System', value: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif' },
  { id: 'roboto', name: 'Roboto', value: 'Roboto, sans-serif' },
  { id: 'opensans', name: 'Open Sans', value: 'Open Sans, sans-serif' },
  { id: 'mono', name: 'Monospace', value: 'SF Mono, Monaco, monospace' }
];

export function AppearanceSettings() {
  const [settings, setSettings] = useState<ThemeSettings>({
    theme: 'system',
    auroraGradient: 'primary',
    fontSize: 16,
    density: 'default',
    animations: true,
    glassEffect: true,
    fontFamily: 'inter'
  });

  const [previewMode, setPreviewMode] = useState(false);

  // Загрузка настроек из localStorage при монтировании
  useEffect(() => {
    const savedSettings = localStorage.getItem('appearanceSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Применение темы
  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }

    setSettings({ ...settings, theme });
    saveSettings({ ...settings, theme });
  };

  // Применение размера шрифта
  const applyFontSize = (size: number) => {
    document.documentElement.style.setProperty('--base-font-size', `${size}px`);
    setSettings({ ...settings, fontSize: size });
    saveSettings({ ...settings, fontSize: size });
  };

  // Применение семейства шрифтов
  const applyFontFamily = (fontId: string) => {
    const font = FONT_FAMILIES.find(f => f.id === fontId);
    if (font) {
      document.documentElement.style.setProperty('--font-family', font.value);
      setSettings({ ...settings, fontFamily: fontId });
      saveSettings({ ...settings, fontFamily: fontId });
    }
  };

  // Применение плотности интерфейса
  const applyDensity = (density: 'compact' | 'default' | 'comfortable') => {
    const root = document.documentElement;
    root.setAttribute('data-density', density);
    setSettings({ ...settings, density });
    saveSettings({ ...settings, density });
  };

  // Сохранение настроек
  const saveSettings = (newSettings: ThemeSettings) => {
    localStorage.setItem('appearanceSettings', JSON.stringify(newSettings));
    toast.success('Настройки оформления сохранены');
  };

  // Сброс настроек
  const resetSettings = () => {
    const defaultSettings: ThemeSettings = {
      theme: 'system',
      auroraGradient: 'primary',
      fontSize: 16,
      density: 'default',
      animations: true,
      glassEffect: true,
      fontFamily: 'inter'
    };

    setSettings(defaultSettings);
    applyTheme(defaultSettings.theme);
    applyFontSize(defaultSettings.fontSize);
    applyFontFamily(defaultSettings.fontFamily);
    applyDensity(defaultSettings.density);

    localStorage.removeItem('appearanceSettings');
    toast.success('Настройки сброшены к значениям по умолчанию');
  };

  return (
    <div className="space-y-6">
      {/* Тема */}
      <GlassCard intensity="weak" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Тема оформления</h3>
              <p className="text-sm text-muted-foreground">
                Выберите светлую или темную тему
              </p>
            </div>
          </div>

          <RadioGroup
            value={settings.theme}
            onValueChange={(value) => applyTheme(value as 'light' | 'dark' | 'system')}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="cursor-pointer">
                <div className={`p-4 rounded-lg border-2 transition-colors ${
                  settings.theme === 'light' ? 'border-primary' : 'border-border'
                }`}>
                  <RadioGroupItem value="light" className="sr-only" />
                  <div className="flex items-center gap-3">
                    <Sun className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Светлая</p>
                      <p className="text-xs text-muted-foreground">Всегда светлая тема</p>
                    </div>
                  </div>
                </div>
              </label>

              <label className="cursor-pointer">
                <div className={`p-4 rounded-lg border-2 transition-colors ${
                  settings.theme === 'dark' ? 'border-primary' : 'border-border'
                }`}>
                  <RadioGroupItem value="dark" className="sr-only" />
                  <div className="flex items-center gap-3">
                    <Moon className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Темная</p>
                      <p className="text-xs text-muted-foreground">Всегда темная тема</p>
                    </div>
                  </div>
                </div>
              </label>

              <label className="cursor-pointer">
                <div className={`p-4 rounded-lg border-2 transition-colors ${
                  settings.theme === 'system' ? 'border-primary' : 'border-border'
                }`}>
                  <RadioGroupItem value="system" className="sr-only" />
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Системная</p>
                      <p className="text-xs text-muted-foreground">Следовать настройкам ОС</p>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </RadioGroup>
        </div>
      </GlassCard>

      {/* Aurora градиенты */}
      <GlassCard intensity="weak" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Aurora градиент</h3>
              <p className="text-sm text-muted-foreground">
                Выберите цветовую схему фона
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AURORA_GRADIENTS.map((gradient) => (
              <button
                key={gradient.id}
                onClick={() => {
                  setSettings({ ...settings, auroraGradient: gradient.id });
                  saveSettings({ ...settings, auroraGradient: gradient.id });
                }}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  settings.auroraGradient === gradient.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`h-12 rounded bg-gradient-to-br ${gradient.colors} mb-2`} />
                <p className="text-sm font-medium">{gradient.name}</p>
                {settings.auroraGradient === gradient.id && (
                  <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Типография */}
      <GlassCard intensity="weak" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Type className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Типография</h3>
              <p className="text-sm text-muted-foreground">
                Настройте шрифты и размеры текста
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="font-family">Семейство шрифтов</Label>
              <Select
                value={settings.fontFamily}
                onValueChange={applyFontFamily}
              >
                <SelectTrigger id="font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem key={font.id} value={font.id}>
                      <span style={{ fontFamily: font.value }}>{font.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="font-size">
                Размер шрифта: {settings.fontSize}px
              </Label>
              <Slider
                id="font-size"
                min={12}
                max={20}
                step={1}
                value={[settings.fontSize]}
                onValueChange={([value]) => applyFontSize(value)}
                className="mt-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>12px</span>
                <span>16px</span>
                <span>20px</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Интерфейс */}
      <GlassCard intensity="weak" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layout className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Интерфейс</h3>
              <p className="text-sm text-muted-foreground">
                Настройте плотность и эффекты интерфейса
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="density">Плотность интерфейса</Label>
              <RadioGroup
                value={settings.density}
                onValueChange={(value) => applyDensity(value as 'compact' | 'default' | 'comfortable')}
              >
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="compact" />
                    <span className="text-sm">Компактный</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="default" />
                    <span className="text-sm">Стандартный</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <RadioGroupItem value="comfortable" />
                    <span className="text-sm">Просторный</span>
                  </label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="animations">Анимации</Label>
                  <p className="text-xs text-muted-foreground">
                    Плавные переходы и анимации элементов
                  </p>
                </div>
                <Switch
                  id="animations"
                  checked={settings.animations}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, animations: checked });
                    saveSettings({ ...settings, animations: checked });
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="glass-effect">Эффект стекла</Label>
                  <p className="text-xs text-muted-foreground">
                    Размытие и прозрачность в стиле Aurora
                  </p>
                </div>
                <Switch
                  id="glass-effect"
                  checked={settings.glassEffect}
                  onCheckedChange={(checked) => {
                    setSettings({ ...settings, glassEffect: checked });
                    saveSettings({ ...settings, glassEffect: checked });
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Кнопки действий */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setPreviewMode(!previewMode)}
        >
          <Eye className="mr-2 h-4 w-4" />
          {previewMode ? 'Скрыть превью' : 'Показать превью'}
        </Button>

        <Button
          variant="outline"
          onClick={resetSettings}
        >
          <Settings className="mr-2 h-4 w-4" />
          Сбросить настройки
        </Button>
      </div>

      {/* Превью */}
      {previewMode && (
        <GlassCard intensity="weak" className="p-6">
          <div className="space-y-4">
            <h4 className="font-semibold">Предпросмотр настроек</h4>
            <div
              className="p-4 rounded-lg border"
              style={{
                fontFamily: FONT_FAMILIES.find(f => f.id === settings.fontFamily)?.value,
                fontSize: `${settings.fontSize}px`
              }}
            >
              <p className="mb-2">
                Это пример текста с выбранными настройками шрифта.
              </p>
              <p className="text-muted-foreground">
                Вторичный текст для демонстрации иерархии.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}