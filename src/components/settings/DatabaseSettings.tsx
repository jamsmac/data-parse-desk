/**
 * Компонент настроек базы данных
 * Управление параметрами по умолчанию для новых баз данных,
 * лимитами и автосохранением
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { GlassCard } from '@/components/aurora/layouts/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Database,
  Save,
  Settings,
  AlertCircle,
  HardDrive,
  Columns,
  Rows,
  Clock,
  Download,
  Upload,
  Trash2,
  Shield,
  Zap,
  Info
} from 'lucide-react';

interface DatabaseDefaults {
  defaultColumnType: string;
  defaultRowLimit: number;
  defaultColumnLimit: number;
  autoSaveInterval: number; // в секундах
  autoSaveEnabled: boolean;
  enableVersioning: boolean;
  compressionEnabled: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'never';
  retentionDays: number;
  defaultImportBatchSize: number;
  allowDuplicates: boolean;
  cacheEnabled: boolean;
  cacheSize: number; // в МБ
}

export function DatabaseSettings() {
  const [defaults, setDefaults] = useState<DatabaseDefaults>({
    defaultColumnType: 'text',
    defaultRowLimit: 10000,
    defaultColumnLimit: 50,
    autoSaveInterval: 30,
    autoSaveEnabled: true,
    enableVersioning: true,
    compressionEnabled: false,
    backupFrequency: 'weekly',
    retentionDays: 30,
    defaultImportBatchSize: 1000,
    allowDuplicates: false,
    cacheEnabled: true,
    cacheSize: 100
  });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0); // в МБ
  const [storageLimit] = useState(5000); // 5 ГБ лимит

  // Загрузка настроек из localStorage
  useEffect(() => {
    const savedDefaults = localStorage.getItem('databaseDefaults');
    if (savedDefaults) {
      setDefaults(JSON.parse(savedDefaults));
    }

    // Имитация загрузки информации о хранилище
    const calculateStorage = () => {
      const used = Math.floor(Math.random() * 2000) + 500; // 500-2500 МБ
      setStorageUsed(used);
    };
    calculateStorage();
  }, []);

  // Сохранение настроек
  const saveSettings = () => {
    localStorage.setItem('databaseDefaults', JSON.stringify(defaults));
    toast.success('Настройки базы данных сохранены');
  };

  // Сброс настроек
  const resetSettings = () => {
    const defaultSettings: DatabaseDefaults = {
      defaultColumnType: 'text',
      defaultRowLimit: 10000,
      defaultColumnLimit: 50,
      autoSaveInterval: 30,
      autoSaveEnabled: true,
      enableVersioning: true,
      compressionEnabled: false,
      backupFrequency: 'weekly',
      retentionDays: 30,
      defaultImportBatchSize: 1000,
      allowDuplicates: false,
      cacheEnabled: true,
      cacheSize: 100
    };

    setDefaults(defaultSettings);
    localStorage.removeItem('databaseDefaults');
    toast.success('Настройки сброшены к значениям по умолчанию');
  };

  // Экспорт всех данных
  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      // Имитация экспорта
      await new Promise(resolve => setTimeout(resolve, 2000));

      // В реальном приложении здесь был бы вызов API для экспорта
      const exportData = {
        databases: [],
        settings: defaults,
        exportDate: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vhdata-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Данные успешно экспортированы');
    } catch (error) {
      toast.error('Ошибка при экспорте данных');
    } finally {
      setIsExporting(false);
    }
  };

  // Импорт данных
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // В реальном приложении здесь был бы вызов API для импорта
      if (data.settings) {
        setDefaults(data.settings);
        localStorage.setItem('databaseDefaults', JSON.stringify(data.settings));
      }

      toast.success('Данные успешно импортированы');
    } catch (error) {
      toast.error('Ошибка при импорте данных');
    } finally {
      setIsImporting(false);
    }
  };

  // Очистка кэша
  const handleClearCache = () => {
    // В реальном приложении здесь был бы вызов API
    toast.success('Кэш успешно очищен');
  };

  // Процент использования хранилища
  const storagePercentage = (storageUsed / storageLimit) * 100;

  return (
    <div className="space-y-6">
      {/* Настройки по умолчанию */}
      <GlassCard intensity="weak" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Настройки по умолчанию</h3>
              <p className="text-sm text-muted-foreground">
                Параметры для новых баз данных
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Тип колонки по умолчанию */}
            <div className="space-y-2">
              <Label htmlFor="default-column-type">Тип колонки по умолчанию</Label>
              <Select
                value={defaults.defaultColumnType}
                onValueChange={(value) => setDefaults({ ...defaults, defaultColumnType: value })}
              >
                <SelectTrigger id="default-column-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Текст</SelectItem>
                  <SelectItem value="number">Число</SelectItem>
                  <SelectItem value="date">Дата</SelectItem>
                  <SelectItem value="boolean">Логический</SelectItem>
                  <SelectItem value="select">Выбор</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Размер пакета импорта */}
            <div className="space-y-2">
              <Label htmlFor="import-batch-size">
                Размер пакета при импорте: {defaults.defaultImportBatchSize} строк
              </Label>
              <Slider
                id="import-batch-size"
                min={100}
                max={5000}
                step={100}
                value={[defaults.defaultImportBatchSize]}
                onValueChange={([value]) =>
                  setDefaults({ ...defaults, defaultImportBatchSize: value })
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>100</span>
                <span>2500</span>
                <span>5000</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Лимиты */}
      <GlassCard intensity="weak" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Лимиты и ограничения</h3>
              <p className="text-sm text-muted-foreground">
                Максимальные значения для баз данных
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Лимит строк */}
            <div className="space-y-2">
              <Label htmlFor="row-limit">
                <Rows className="inline-block mr-2 h-4 w-4" />
                Максимум строк: {defaults.defaultRowLimit.toLocaleString()}
              </Label>
              <Slider
                id="row-limit"
                min={1000}
                max={100000}
                step={1000}
                value={[defaults.defaultRowLimit]}
                onValueChange={([value]) =>
                  setDefaults({ ...defaults, defaultRowLimit: value })
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1K</span>
                <span>50K</span>
                <span>100K</span>
              </div>
            </div>

            {/* Лимит колонок */}
            <div className="space-y-2">
              <Label htmlFor="column-limit">
                <Columns className="inline-block mr-2 h-4 w-4" />
                Максимум колонок: {defaults.defaultColumnLimit}
              </Label>
              <Slider
                id="column-limit"
                min={10}
                max={200}
                step={10}
                value={[defaults.defaultColumnLimit]}
                onValueChange={([value]) =>
                  setDefaults({ ...defaults, defaultColumnLimit: value })
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>10</span>
                <span>100</span>
                <span>200</span>
              </div>
            </div>
          </div>

          {/* Настройки дубликатов */}
          <div className="flex items-center justify-between pt-2">
            <div className="space-y-0.5">
              <Label htmlFor="allow-duplicates">Разрешить дубликаты</Label>
              <p className="text-xs text-muted-foreground">
                Разрешить импорт дублирующихся записей
              </p>
            </div>
            <Switch
              id="allow-duplicates"
              checked={defaults.allowDuplicates}
              onCheckedChange={(checked) =>
                setDefaults({ ...defaults, allowDuplicates: checked })
              }
            />
          </div>
        </div>
      </GlassCard>

      {/* Автосохранение и резервное копирование */}
      <GlassCard intensity="weak" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Save className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Автосохранение и резервное копирование</h3>
              <p className="text-sm text-muted-foreground">
                Защита данных и восстановление
              </p>
            </div>
          </div>

          {/* Автосохранение */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autosave">Автосохранение</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматически сохранять изменения
                </p>
              </div>
              <Switch
                id="autosave"
                checked={defaults.autoSaveEnabled}
                onCheckedChange={(checked) =>
                  setDefaults({ ...defaults, autoSaveEnabled: checked })
                }
              />
            </div>

            {defaults.autoSaveEnabled && (
              <div className="space-y-2">
                <Label htmlFor="autosave-interval">
                  <Clock className="inline-block mr-2 h-4 w-4" />
                  Интервал: каждые {defaults.autoSaveInterval} сек
                </Label>
                <Slider
                  id="autosave-interval"
                  min={5}
                  max={120}
                  step={5}
                  value={[defaults.autoSaveInterval]}
                  onValueChange={([value]) =>
                    setDefaults({ ...defaults, autoSaveInterval: value })
                  }
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Резервное копирование */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="backup-frequency">Частота резервного копирования</Label>
              <Select
                value={defaults.backupFrequency}
                onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'never') =>
                  setDefaults({ ...defaults, backupFrequency: value })
                }
              >
                <SelectTrigger id="backup-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Ежедневно</SelectItem>
                  <SelectItem value="weekly">Еженедельно</SelectItem>
                  <SelectItem value="monthly">Ежемесячно</SelectItem>
                  <SelectItem value="never">Никогда</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="retention-days">
                Хранить резервные копии: {defaults.retentionDays} дней
              </Label>
              <Slider
                id="retention-days"
                min={7}
                max={90}
                step={1}
                value={[defaults.retentionDays]}
                onValueChange={([value]) =>
                  setDefaults({ ...defaults, retentionDays: value })
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>7 дней</span>
                <span>30 дней</span>
                <span>90 дней</span>
              </div>
            </div>
          </div>

          {/* Версионирование */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="versioning">Версионирование</Label>
              <p className="text-xs text-muted-foreground">
                Сохранять историю изменений данных
              </p>
            </div>
            <Switch
              id="versioning"
              checked={defaults.enableVersioning}
              onCheckedChange={(checked) =>
                setDefaults({ ...defaults, enableVersioning: checked })
              }
            />
          </div>
        </div>
      </GlassCard>

      {/* Производительность и кэш */}
      <GlassCard intensity="weak" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Производительность и хранилище</h3>
              <p className="text-sm text-muted-foreground">
                Оптимизация работы с данными
              </p>
            </div>
          </div>

          {/* Использование хранилища */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Использование хранилища</span>
              <span className="font-medium">
                {(storageUsed / 1024).toFixed(2)} ГБ / {(storageLimit / 1024).toFixed(0)} ГБ
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  storagePercentage > 80 ? 'bg-red-500' :
                  storagePercentage > 60 ? 'bg-yellow-500' : 'bg-primary'
                }`}
                style={{ width: `${storagePercentage}%` }}
              />
            </div>
            {storagePercentage > 80 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Использовано более 80% доступного хранилища. Рассмотрите возможность очистки старых данных.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Настройки кэша */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="cache">Кэширование</Label>
                <p className="text-xs text-muted-foreground">
                  Ускорение загрузки часто используемых данных
                </p>
              </div>
              <Switch
                id="cache"
                checked={defaults.cacheEnabled}
                onCheckedChange={(checked) =>
                  setDefaults({ ...defaults, cacheEnabled: checked })
                }
              />
            </div>

            {defaults.cacheEnabled && (
              <div className="space-y-2">
                <Label htmlFor="cache-size">
                  Размер кэша: {defaults.cacheSize} МБ
                </Label>
                <Slider
                  id="cache-size"
                  min={50}
                  max={500}
                  step={50}
                  value={[defaults.cacheSize]}
                  onValueChange={([value]) =>
                    setDefaults({ ...defaults, cacheSize: value })
                  }
                />
                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>50 МБ</span>
                    <span>250 МБ</span>
                    <span>500 МБ</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Очистить кэш
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Сжатие данных */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="compression">Сжатие данных</Label>
              <p className="text-xs text-muted-foreground">
                Уменьшить размер хранимых данных (может замедлить работу)
              </p>
            </div>
            <Switch
              id="compression"
              checked={defaults.compressionEnabled}
              onCheckedChange={(checked) =>
                setDefaults({ ...defaults, compressionEnabled: checked })
              }
            />
          </div>
        </div>
      </GlassCard>

      {/* Экспорт и импорт данных */}
      <GlassCard intensity="weak" className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Управление данными</h3>
              <p className="text-sm text-muted-foreground">
                Экспорт и импорт всех данных
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Экспорт всех данных */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Экспорт данных</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Скачать все базы данных и настройки в JSON формате
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleExportAll}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                    Экспорт...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Экспортировать все данные
                  </>
                )}
              </Button>
            </div>

            {/* Импорт данных */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Импорт данных</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Загрузить ранее экспортированные данные
              </p>
              <Label htmlFor="import-file" className="cursor-pointer">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isImporting}
                  asChild
                >
                  <span>
                    {isImporting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                        Импорт...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Импортировать данные
                      </>
                    )}
                  </span>
                </Button>
              </Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Экспорт включает все базы данных, схемы, данные и настройки.
              Файл может быть большим в зависимости от объема данных.
            </AlertDescription>
          </Alert>
        </div>
      </GlassCard>

      {/* Кнопки действий */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={resetSettings}
        >
          <Settings className="mr-2 h-4 w-4" />
          Сбросить настройки
        </Button>

        <Button onClick={saveSettings}>
          <Save className="mr-2 h-4 w-4" />
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
}