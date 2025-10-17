/**
 * Компонент настроек безопасности
 * Управление паролем, 2FA, сессиями и API ключами
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassCard } from '@/components/aurora/layouts/GlassCard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NotificationPreferences } from './NotificationPreferences';
import {
  Key,
  Lock,
  Shield,
  ShieldCheck,
  AlertCircle,
  Monitor,
  Smartphone,
  Globe,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Plus,
  LogOut,
  Bell
} from 'lucide-react';

export function SecuritySettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Состояние для смены пароля
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Состояние для API ключей
  const [apiKeys, setApiKeys] = useState([
    { id: '1', name: 'Production API', key: 'vhd_live_abc123...', created: '2024-01-15', lastUsed: '2024-03-10' },
    { id: '2', name: 'Development API', key: 'vhd_test_def456...', created: '2024-02-20', lastUsed: '2024-03-12' }
  ]);

  // Состояние для активных сессий
  const [sessions, setSessions] = useState([
    { id: '1', device: 'Chrome on Windows', location: 'Moscow, Russia', lastActive: '5 мин назад', current: true },
    { id: '2', device: 'Safari on iPhone', location: 'Saint Petersburg, Russia', lastActive: '2 часа назад', current: false },
    { id: '3', device: 'Firefox on Linux', location: 'Novosibirsk, Russia', lastActive: '1 день назад', current: false }
  ]);

  // Обработчик смены пароля
  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Пароль должен быть не менее 8 символов');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Пароль успешно изменен');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Ошибка при смене пароля');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Обработчик включения 2FA
  const handle2FAToggle = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      // Здесь должна быть логика включения 2FA
      setTwoFactorEnabled(enabled);
      toast.success(enabled ? '2FA включена' : '2FA отключена');
    } catch (error) {
      toast.error('Ошибка при изменении настроек 2FA');
    } finally {
      setIsLoading(false);
    }
  };

  // Генерация нового API ключа
  const generateApiKey = () => {
    const newKey = `vhd_live_${Math.random().toString(36).substring(2, 15)}`;
    const newApiKey = {
      id: Date.now().toString(),
      name: `API Key ${apiKeys.length + 1}`,
      key: newKey,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Никогда'
    };
    setApiKeys([...apiKeys, newApiKey]);
    toast.success('Новый API ключ создан');
  };

  // Удаление API ключа
  const deleteApiKey = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
    toast.success('API ключ удален');
  };

  // Завершение сессии
  const terminateSession = (id: string) => {
    setSessions(sessions.filter(session => session.id !== id));
    toast.success('Сессия завершена');
  };

  // Завершение всех сессий
  const terminateAllSessions = () => {
    setSessions(sessions.filter(session => session.current));
    toast.success('Все сессии, кроме текущей, завершены');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="password" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="password">Пароль</TabsTrigger>
          <TabsTrigger value="2fa">2FA</TabsTrigger>
          <TabsTrigger value="sessions">Сессии</TabsTrigger>
          <TabsTrigger value="api">API ключи</TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Push
          </TabsTrigger>
        </TabsList>

        {/* Вкладка смены пароля */}
        <TabsContent value="password" className="space-y-4">
          <GlassCard intensity="weak" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Смена пароля</h3>
                  <p className="text-sm text-muted-foreground">
                    Обновите ваш пароль для повышения безопасности
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Текущий пароль</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Новый пароль</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Минимум 8 символов, включая буквы и цифры
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Подтвердите новый пароль</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    disabled={isLoading}
                  />
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword}
                  className="w-full sm:w-auto"
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Изменить пароль
                </Button>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Вкладка 2FA */}
        <TabsContent value="2fa" className="space-y-4">
          <GlassCard intensity="weak" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Двухфакторная аутентификация</h3>
                    <p className="text-sm text-muted-foreground">
                      Дополнительный уровень защиты вашего аккаунта
                    </p>
                  </div>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={handle2FAToggle}
                  disabled={isLoading}
                />
              </div>

              {twoFactorEnabled && (
                <Alert>
                  <ShieldCheck className="h-4 w-4" />
                  <AlertDescription>
                    2FA включена. Используйте приложение-аутентификатор для генерации кодов.
                  </AlertDescription>
                </Alert>
              )}

              {!twoFactorEnabled && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Включите двухфакторную аутентификацию для защиты вашего аккаунта от несанкционированного доступа.
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      Защита от взлома пароля
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      Уведомления о попытках входа
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      Резервные коды восстановления
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {/* Вкладка активных сессий */}
        <TabsContent value="sessions" className="space-y-4">
          <GlassCard intensity="weak" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Активные сессии</h3>
                    <p className="text-sm text-muted-foreground">
                      Управляйте устройствами, с которых выполнен вход
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={terminateAllSessions}
                  disabled={sessions.length <= 1}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Завершить все
                </Button>
              </div>

              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        {session.device.includes('iPhone') || session.device.includes('Android') ? (
                          <Smartphone className="h-4 w-4" />
                        ) : (
                          <Monitor className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{session.device}</p>
                          {session.current && (
                            <Badge variant="secondary" className="text-xs">
                              Текущая
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {session.location}
                          </span>
                          <span>{session.lastActive}</span>
                        </div>
                      </div>
                    </div>
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => terminateSession(session.id)}
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Вкладка API ключей */}
        <TabsContent value="api" className="space-y-4">
          <GlassCard intensity="weak" className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">API ключи</h3>
                    <p className="text-sm text-muted-foreground">
                      Управляйте ключами для доступа к API
                    </p>
                  </div>
                </div>
                <Button onClick={generateApiKey} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Создать ключ
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Храните API ключи в безопасном месте. Не делитесь ими публично.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {apiKeys.map((apiKey) => (
                  <div
                    key={apiKey.id}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{apiKey.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Создан: {apiKey.created}</span>
                          <span>Использован: {apiKey.lastUsed}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(apiKey.key);
                            toast.success('API ключ скопирован');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteApiKey(apiKey.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-xs font-mono">
                        {showApiKey ? apiKey.key : '••••••••••••••••••••••••'}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        {/* Вкладка Push-уведомлений */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}