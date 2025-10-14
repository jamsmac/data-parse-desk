import React, { useState } from 'react';
import { Mail, Save, TestTube, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export interface EmailSettingsData {
  enabled: boolean;
  email: string;
  frequency: 'instant' | 'daily' | 'weekly' | 'never';
  daily_digest_time?: string;
  weekly_digest_day?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  include_comments: boolean;
  include_mentions: boolean;
  include_updates: boolean;
  include_shares: boolean;
  include_reports: boolean;
}

interface EmailSettingsProps {
  settings: EmailSettingsData;
  onSave?: (settings: EmailSettingsData) => Promise<void>;
  onTestEmail?: (email: string) => Promise<void>;
}

export const EmailSettings: React.FC<EmailSettingsProps> = ({
  settings: initialSettings,
  onSave,
  onTestEmail,
}) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<EmailSettingsData>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const weekDayLabels: Record<string, string> = {
    monday: 'Понедельник',
    tuesday: 'Вторник',
    wednesday: 'Среда',
    thursday: 'Четверг',
    friday: 'Пятница',
    saturday: 'Суббота',
    sunday: 'Воскресенье',
  };

  // Обновить настройки
  const updateSetting = <K extends keyof EmailSettingsData>(
    key: K,
    value: EmailSettingsData[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Сохранить настройки
  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave?.(settings);
      toast({
        title: 'Настройки сохранены',
        description: 'Email-уведомления настроены успешно',
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить настройки',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Отправить тестовое письмо
  const handleTestEmail = async () => {
    if (!settings.email) {
      toast({
        title: 'Ошибка',
        description: 'Укажите email адрес',
        variant: 'destructive',
      });
      return;
    }

    setTestingEmail(true);
    try {
      await onTestEmail?.(settings.email);
      toast({
        title: 'Тестовое письмо отправлено',
        description: `Проверьте почту ${settings.email}`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить тестовое письмо',
        variant: 'destructive',
      });
    } finally {
      setTestingEmail(false);
    }
  };

  // Сбросить к значениям по умолчанию
  const handleReset = () => {
    setSettings(initialSettings);
    setHasChanges(false);
    toast({
      title: 'Настройки сброшены',
      description: 'Восстановлены исходные значения',
    });
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Email-уведомления</h2>
        </div>
        {hasChanges && (
          <Alert className="w-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>У вас есть несохранённые изменения</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Основные настройки */}
      <Card>
        <CardHeader>
          <CardTitle>Основные настройки</CardTitle>
          <CardDescription>
            Управление email-уведомлениями и частотой отправки
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Включить/выключить */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-enabled">Email-уведомления</Label>
              <p className="text-sm text-muted-foreground">
                Получать уведомления на электронную почту
              </p>
            </div>
            <Switch
              id="email-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => updateSetting('enabled', checked)}
            />
          </div>

          <Separator />

          {/* Email адрес */}
          <div className="space-y-2">
            <Label htmlFor="email-address">Email адрес</Label>
            <div className="flex gap-2">
              <Input
                id="email-address"
                type="email"
                placeholder="user@example.com"
                value={settings.email}
                onChange={(e) => updateSetting('email', e.target.value)}
                disabled={!settings.enabled}
              />
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={!settings.enabled || testingEmail || !settings.email}
                className="gap-2"
              >
                <TestTube className="h-4 w-4" />
                {testingEmail ? 'Отправка...' : 'Тест'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              На этот адрес будут отправляться все email-уведомления
            </p>
          </div>

          <Separator />

          {/* Частота отправки */}
          <div className="space-y-2">
            <Label htmlFor="email-frequency">Частота отправки</Label>
            <Select
              value={settings.frequency}
              onValueChange={(value) =>
                updateSetting('frequency', value as EmailSettingsData['frequency'])
              }
              disabled={!settings.enabled}
            >
              <SelectTrigger id="email-frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Мгновенно</SelectItem>
                <SelectItem value="daily">Ежедневная сводка</SelectItem>
                <SelectItem value="weekly">Еженедельная сводка</SelectItem>
                <SelectItem value="never">Никогда</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {settings.frequency === 'instant' &&
                'Уведомления отправляются сразу после события'}
              {settings.frequency === 'daily' &&
                'Получать сводку всех уведомлений один раз в день'}
              {settings.frequency === 'weekly' &&
                'Получать сводку всех уведомлений один раз в неделю'}
              {settings.frequency === 'never' &&
                'Email-уведомления отключены'}
            </p>
          </div>

          {/* Настройки ежедневной сводки */}
          {settings.frequency === 'daily' && (
            <div className="space-y-2">
              <Label htmlFor="daily-time">Время отправки</Label>
              <Input
                id="daily-time"
                type="time"
                value={settings.daily_digest_time || '09:00'}
                onChange={(e) =>
                  updateSetting('daily_digest_time', e.target.value)
                }
                disabled={!settings.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Ежедневная сводка будет отправляться в указанное время
              </p>
            </div>
          )}

          {/* Настройки еженедельной сводки */}
          {settings.frequency === 'weekly' && (
            <div className="space-y-2">
              <Label htmlFor="weekly-day">День недели</Label>
              <Select
                value={settings.weekly_digest_day || 'monday'}
                onValueChange={(value) =>
                  updateSetting(
                    'weekly_digest_day',
                    value as EmailSettingsData['weekly_digest_day']
                  )
                }
                disabled={!settings.enabled}
              >
                <SelectTrigger id="weekly-day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(weekDayLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Еженедельная сводка будет отправляться в этот день
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Типы уведомлений */}
      <Card>
        <CardHeader>
          <CardTitle>Типы уведомлений</CardTitle>
          <CardDescription>
            Выберите, какие события будут отправляться по email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-comments">Комментарии</Label>
              <p className="text-sm text-muted-foreground">
                Новые комментарии к вашим записям
              </p>
            </div>
            <Switch
              id="include-comments"
              checked={settings.include_comments}
              onCheckedChange={(checked) =>
                updateSetting('include_comments', checked)
              }
              disabled={!settings.enabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-mentions">Упоминания</Label>
              <p className="text-sm text-muted-foreground">
                Когда кто-то упоминает вас в комментарии
              </p>
            </div>
            <Switch
              id="include-mentions"
              checked={settings.include_mentions}
              onCheckedChange={(checked) =>
                updateSetting('include_mentions', checked)
              }
              disabled={!settings.enabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-updates">Обновления</Label>
              <p className="text-sm text-muted-foreground">
                Изменения в базах данных и записях
              </p>
            </div>
            <Switch
              id="include-updates"
              checked={settings.include_updates}
              onCheckedChange={(checked) =>
                updateSetting('include_updates', checked)
              }
              disabled={!settings.enabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-shares">Общий доступ</Label>
              <p className="text-sm text-muted-foreground">
                Когда с вами делятся базой данных
              </p>
            </div>
            <Switch
              id="include-shares"
              checked={settings.include_shares}
              onCheckedChange={(checked) =>
                updateSetting('include_shares', checked)
              }
              disabled={!settings.enabled}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="include-reports">Отчёты</Label>
              <p className="text-sm text-muted-foreground">
                Запланированные отчёты и экспорты
              </p>
            </div>
            <Switch
              id="include-reports"
              checked={settings.include_reports}
              onCheckedChange={(checked) =>
                updateSetting('include_reports', checked)
              }
              disabled={!settings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Действия */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={loading || !hasChanges}
        >
          Сбросить
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading || !hasChanges}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {loading ? 'Сохранение...' : 'Сохранить изменения'}
        </Button>
      </div>

      {/* Информация */}
      {settings.enabled && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Email-уведомления включены. Вы будете получать уведомления на{' '}
            <strong>{settings.email}</strong>
            {settings.frequency === 'instant' && ' мгновенно'}
            {settings.frequency === 'daily' &&
              ` ежедневно в ${settings.daily_digest_time}`}
            {settings.frequency === 'weekly' &&
              ` еженедельно по ${weekDayLabels[settings.weekly_digest_day || 'monday'].toLowerCase()}ам`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
