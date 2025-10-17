/**
 * Компонент настроек push-уведомлений
 * Управление разрешениями и типами уведомлений
 */

import { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { GlassCard } from '@/components/aurora/layouts/GlassCard';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Bell,
  BellOff,
  Database,
  Upload,
  Download,
  Link,
  AlertTriangle,
  Info,
  Users,
  TestTube,
  Loader2,
  Check,
  X,
  Smartphone
} from 'lucide-react';

export function NotificationPreferences() {
  const {
    isSupported,
    isEnabled,
    isLoading,
    permission,
    fcmToken,
    preferences,
    enableNotifications,
    disableNotifications,
    updatePreferences,
    testNotification
  } = usePushNotifications();

  const [saving, setSaving] = useState(false);

  const handleToggleNotifications = async () => {
    if (isEnabled) {
      await disableNotifications();
    } else {
      await enableNotifications();
    }
  };

  const handlePreferenceChange = async (key: string, value: boolean) => {
    setSaving(true);
    await updatePreferences({ [key]: value });
    setSaving(false);
  };

  // Статус разрешения
  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge className="bg-green-500/10 text-green-500">Разрешено</Badge>;
      case 'denied':
        return <Badge className="bg-red-500/10 text-red-500">Запрещено</Badge>;
      default:
        return <Badge className="bg-gray-500/10 text-gray-500">Не запрошено</Badge>;
    }
  };

  // Если не поддерживается
  if (!isSupported) {
    return (
      <Alert className="border-red-500/20 bg-red-500/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Push-уведомления не поддерживаются</AlertTitle>
        <AlertDescription>
          Ваш браузер не поддерживает push-уведомления. Попробуйте использовать современный браузер,
          такой как Chrome, Firefox, Safari или Edge.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и статус */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Push-уведомления</h3>
            <p className="text-sm text-muted-foreground">
              Получайте уведомления о важных событиях в реальном времени
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getPermissionBadge()}
          {isEnabled && (
            <Badge className="bg-green-500/10 text-green-500">
              <Check className="h-3 w-3 mr-1" />
              Активно
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Основной переключатель */}
      <GlassCard intensity="medium" className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="notifications-enabled" className="text-base font-medium cursor-pointer">
                Включить push-уведомления
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Разрешить браузеру показывать уведомления от VHData Platform
              </p>
            </div>
          </div>
          <Switch
            id="notifications-enabled"
            checked={isEnabled}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {/* Предупреждение если запрещено */}
        {permission === 'denied' && (
          <Alert className="mt-4 border-orange-500/20 bg-orange-500/5">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Уведомления заблокированы</AlertTitle>
            <AlertDescription>
              Вы запретили показ уведомлений для этого сайта. Чтобы включить их, измените настройки
              в браузере и обновите страницу.
            </AlertDescription>
          </Alert>
        )}

        {/* Информация о токене */}
        {isEnabled && fcmToken && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Smartphone className="h-3 w-3" />
              <span>Устройство зарегистрировано</span>
              <Badge variant="secondary" className="text-xs">
                {fcmToken.substring(0, 8)}...
              </Badge>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Типы уведомлений */}
      {isEnabled && (
        <>
          <div>
            <h4 className="text-sm font-medium mb-4">Типы уведомлений</h4>
            <GlassCard intensity="weak" className="p-4 space-y-4">
              {/* База данных клонирована */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="database-cloned" className="text-sm cursor-pointer">
                      Клонирование базы данных
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Когда клонирование базы данных завершено
                    </p>
                  </div>
                </div>
                <Switch
                  id="database-cloned"
                  checked={preferences.databaseCloned}
                  onCheckedChange={(value) => handlePreferenceChange('databaseCloned', value)}
                  disabled={saving}
                />
              </div>

              <Separator />

              {/* Импорт завершен */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="import-completed" className="text-sm cursor-pointer">
                      Импорт данных завершен
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Успешное завершение импорта файлов
                    </p>
                  </div>
                </div>
                <Switch
                  id="import-completed"
                  checked={preferences.importCompleted}
                  onCheckedChange={(value) => handlePreferenceChange('importCompleted', value)}
                  disabled={saving}
                />
              </div>

              <Separator />

              {/* Ошибка импорта */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="import-failed" className="text-sm cursor-pointer">
                      Ошибки при импорте
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Уведомления об ошибках импорта данных
                    </p>
                  </div>
                </div>
                <Switch
                  id="import-failed"
                  checked={preferences.importFailed}
                  onCheckedChange={(value) => handlePreferenceChange('importFailed', value)}
                  disabled={saving}
                />
              </div>

              <Separator />

              {/* Экспорт завершен */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="export-completed" className="text-sm cursor-pointer">
                      Экспорт данных завершен
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Готовность файлов для скачивания
                    </p>
                  </div>
                </div>
                <Switch
                  id="export-completed"
                  checked={preferences.exportCompleted}
                  onCheckedChange={(value) => handlePreferenceChange('exportCompleted', value)}
                  disabled={saving}
                />
              </div>

              <Separator />

              {/* Связи созданы */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="relation-created" className="text-sm cursor-pointer">
                      Связи между базами
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Создание новых связей между базами данных
                    </p>
                  </div>
                </div>
                <Switch
                  id="relation-created"
                  checked={preferences.relationCreated}
                  onCheckedChange={(value) => handlePreferenceChange('relationCreated', value)}
                  disabled={saving}
                />
              </div>

              <Separator />

              {/* Предупреждение о квоте */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="quota-warning" className="text-sm cursor-pointer">
                      Предупреждения о квотах
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Приближение к лимитам использования
                    </p>
                  </div>
                </div>
                <Switch
                  id="quota-warning"
                  checked={preferences.quotaWarning}
                  onCheckedChange={(value) => handlePreferenceChange('quotaWarning', value)}
                  disabled={saving}
                />
              </div>

              <Separator />

              {/* Системные обновления */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="system-update" className="text-sm cursor-pointer">
                      Системные обновления
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Важные обновления и новые функции
                    </p>
                  </div>
                </div>
                <Switch
                  id="system-update"
                  checked={preferences.systemUpdate}
                  onCheckedChange={(value) => handlePreferenceChange('systemUpdate', value)}
                  disabled={saving}
                />
              </div>

              <Separator />

              {/* Приглашения к совместной работе */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="collaboration-invite" className="text-sm cursor-pointer">
                      Приглашения к совместной работе
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Новые приглашения для совместной работы
                    </p>
                  </div>
                </div>
                <Switch
                  id="collaboration-invite"
                  checked={preferences.collaborationInvite}
                  onCheckedChange={(value) => handlePreferenceChange('collaborationInvite', value)}
                  disabled={saving}
                />
              </div>
            </GlassCard>
          </div>

          {/* Кнопка тестирования */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={testNotification}
              disabled={!isEnabled || isLoading}
            >
              <TestTube className="h-4 w-4 mr-2" />
              Отправить тестовое уведомление
            </Button>
          </div>
        </>
      )}

      {/* Индикатор сохранения */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-3 shadow-lg flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Сохранение настроек...</span>
        </div>
      )}
    </div>
  );
}