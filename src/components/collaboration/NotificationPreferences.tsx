import React, { useState } from 'react';
import {
  Bell,
  Save,
  Volume2,
  VolumeX,
  Smartphone,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { NotificationSettings } from '@/types/auth';

interface NotificationPreferencesProps {
  settings: NotificationSettings;
  onSave?: (settings: NotificationSettings) => Promise<void>;
}

export const NotificationPreferences: React.FC<
  NotificationPreferencesProps
> = ({ settings: initialSettings, onSave }) => {
  const { toast } = useToast();
  const [settings, setSettings] =
    useState<NotificationSettings>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Обновить настройки
  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
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
        description: 'Предпочтения уведомлений обновлены',
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

  // Сбросить к значениям по умолчанию
  const handleReset = () => {
    setSettings(initialSettings);
    setHasChanges(false);
    toast({
      title: 'Настройки сброшены',
      description: 'Восстановлены исходные значения',
    });
  };

  // Отключить все уведомления
  const handleDisableAll = () => {
    setSettings({
      ...settings,
      email_notifications: false,
      push_notifications: false,
      comment_notifications: false,
      mention_notifications: false,
      share_notifications: false,
      update_notifications: false,
    });
    setHasChanges(true);
    toast({
      title: 'Все уведомления отключены',
      description: 'Вы не будете получать уведомления',
    });
  };

  // Включить все уведомления
  const handleEnableAll = () => {
    setSettings({
      ...settings,
      email_notifications: true,
      push_notifications: true,
      comment_notifications: true,
      mention_notifications: true,
      share_notifications: true,
      update_notifications: true,
    });
    setHasChanges(true);
    toast({
      title: 'Все уведомления включены',
      description: 'Вы будете получать все типы уведомлений',
    });
  };

  const allEnabled =
    settings.email_notifications &&
    settings.push_notifications &&
    settings.comment_notifications &&
    settings.mention_notifications &&
    settings.share_notifications &&
    settings.update_notifications;

  const allDisabled =
    !settings.email_notifications &&
    !settings.push_notifications &&
    !settings.comment_notifications &&
    !settings.mention_notifications &&
    !settings.share_notifications &&
    !settings.update_notifications;

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Настройки уведомлений</h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisableAll}
            disabled={allDisabled}
            className="gap-2"
          >
            <VolumeX className="h-4 w-4" />
            Отключить все
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnableAll}
            disabled={allEnabled}
            className="gap-2"
          >
            <Volume2 className="h-4 w-4" />
            Включить все
          </Button>
        </div>
      </div>

      <Tabs defaultValue="channels" className="space-y-4">
        <TabsList>
          <TabsTrigger value="channels">Каналы</TabsTrigger>
          <TabsTrigger value="events">События</TabsTrigger>
          <TabsTrigger value="frequency">Частота</TabsTrigger>
        </TabsList>

        {/* Вкладка: Каналы */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Каналы уведомлений</CardTitle>
              <CardDescription>
                Выберите, как вы хотите получать уведомления
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="email-notifications">
                      Email-уведомления
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Получать уведомления на почту
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-notifications"
                  checked={settings.email_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting('email_notifications', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <Smartphone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="space-y-0.5">
                    <Label htmlFor="push-notifications">
                      Push-уведомления
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Уведомления в браузере и на устройстве
                    </p>
                  </div>
                </div>
                <Switch
                  id="push-notifications"
                  checked={settings.push_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting('push_notifications', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: События */}
        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Типы событий</CardTitle>
              <CardDescription>
                Выберите, о каких событиях вы хотите получать уведомления
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="comment-notifications">Комментарии</Label>
                  <p className="text-sm text-muted-foreground">
                    Новые комментарии к вашим записям
                  </p>
                </div>
                <Switch
                  id="comment-notifications"
                  checked={settings.comment_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting('comment_notifications', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mention-notifications">Упоминания</Label>
                  <p className="text-sm text-muted-foreground">
                    Когда кто-то упоминает вас в комментарии
                  </p>
                </div>
                <Switch
                  id="mention-notifications"
                  checked={settings.mention_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting('mention_notifications', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="share-notifications">Общий доступ</Label>
                  <p className="text-sm text-muted-foreground">
                    Когда с вами делятся базой данных
                  </p>
                </div>
                <Switch
                  id="share-notifications"
                  checked={settings.share_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting('share_notifications', checked)
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="update-notifications">Обновления</Label>
                  <p className="text-sm text-muted-foreground">
                    Изменения в базах данных и записях
                  </p>
                </div>
                <Switch
                  id="update-notifications"
                  checked={settings.update_notifications}
                  onCheckedChange={(checked) =>
                    updateSetting('update_notifications', checked)
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Вкладка: Частота */}
        <TabsContent value="frequency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Частота уведомлений</CardTitle>
              <CardDescription>
                Как часто вы хотите получать сводки уведомлений
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                    settings.frequency === 'instant'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => updateSetting('frequency', 'instant')}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">Мгновенно</Label>
                      <p className="text-sm text-muted-foreground">
                        Получать уведомления сразу после события
                      </p>
                    </div>
                    {settings.frequency === 'instant' && (
                      <Badge>Выбрано</Badge>
                    )}
                  </div>
                </div>

                <div
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                    settings.frequency === 'daily'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => updateSetting('frequency', 'daily')}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">Ежедневная сводка</Label>
                      <p className="text-sm text-muted-foreground">
                        Получать сводку всех уведомлений один раз в день
                      </p>
                    </div>
                    {settings.frequency === 'daily' && (
                      <Badge>Выбрано</Badge>
                    )}
                  </div>
                </div>

                <div
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                    settings.frequency === 'weekly'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => updateSetting('frequency', 'weekly')}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="text-base">Еженедельная сводка</Label>
                      <p className="text-sm text-muted-foreground">
                        Получать сводку всех уведомлений один раз в неделю
                      </p>
                    </div>
                    {settings.frequency === 'weekly' && (
                      <Badge>Выбрано</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  );
};
