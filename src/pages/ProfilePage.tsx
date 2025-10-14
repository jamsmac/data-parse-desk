import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  Camera,
  Save,
  Loader2,
  Key,
  Bell,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user, updateProfile, updatePassword } = useAuth();
  
  // All hooks must be at the top, before any early returns
  const [profileData, setProfileData] = useState({
    full_name: (user?.user_metadata?.full_name as string) || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Early return after all hooks
  if (!user) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Загрузка...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleProfileUpdate = async () => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      await updateProfile({ full_name: profileData.full_name });
      setSuccess('Профиль успешно обновлен');
    } catch (err: any) {
      setError(err.message || 'Ошибка обновления профиля');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    setError(null);
    setSuccess(null);

    if (passwordData.new !== passwordData.confirm) {
      setError('Новые пароли не совпадают');
      return;
    }

    if (passwordData.new.length < 8) {
      setError('Пароль должен содержать минимум 8 символов');
      return;
    }

    setIsLoading(true);

    try {
      await updatePassword(passwordData.current, passwordData.new);
      setSuccess('Пароль успешно изменен');
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      setError(err.message || 'Ошибка изменения пароля');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      owner: 'Владелец',
      admin: 'Администратор',
      editor: 'Редактор',
      viewer: 'Наблюдатель',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getInitials = (name?: string) => {
    if (!name) return user.email.substring(0, 2).toUpperCase();
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Профиль</h1>
          <p className="text-muted-foreground mt-2">
            Управление личной информацией и настройками безопасности
          </p>
        </div>

        {/* Alerts */}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Avatar Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.user_metadata?.avatar_url as string} />
                  <AvatarFallback className="text-2xl">{getInitials(user.user_metadata?.full_name as string)}</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{user.user_metadata?.full_name || user.email}</h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary">
                    <Shield className="mr-1 h-3 w-3" />
                    Пользователь
                  </Badge>
                  <Badge variant="outline">
                    <Calendar className="mr-1 h-3 w-3" />
                    С {new Date(user.created_at!).toLocaleDateString('ru-RU')}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">
              <UserIcon className="mr-2 h-4 w-4" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="security">
              <Key className="mr-2 h-4 w-4" />
              Безопасность
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Уведомления
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Личная информация</CardTitle>
                <CardDescription>
                  Обновите свою личную информацию и контактные данные
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Полное имя</Label>
                  <Input
                    id="full_name"
                    value={profileData.full_name}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    placeholder="Ваше имя"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    disabled
                    className="bg-secondary"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email нельзя изменить после регистрации
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleProfileUpdate} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Сохранить изменения
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>Информация об аккаунте</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">ID пользователя</p>
                    <p className="font-mono text-xs">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Роль</p>
                    <p className="font-medium">Пользователь</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Дата регистрации</p>
                    <p className="font-medium">
                      {new Date(user.created_at!).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Последний вход</p>
                    <p className="font-medium">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString('ru-RU')
                        : 'Н/Д'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Изменить пароль</CardTitle>
                <CardDescription>
                  Убедитесь, что ваш пароль надежный и безопасный
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Текущий пароль</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordData.current}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, current: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">Новый пароль</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordData.new}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, new: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Подтвердите новый пароль</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordData.confirm}
                    onChange={(e) =>
                      setPasswordData((prev) => ({ ...prev, confirm: e.target.value }))
                    }
                    disabled={isLoading}
                  />
                </div>

                <Button onClick={handlePasswordUpdate} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Изменение...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Изменить пароль
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Активные сессии</CardTitle>
                <CardDescription>
                  Управление устройствами, на которых выполнен вход
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Текущее устройство</p>
                      <p className="text-sm text-muted-foreground">Последняя активность: сейчас</p>
                    </div>
                    <Badge>Активно</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Настройки уведомлений</CardTitle>
                <CardDescription>
                  Управление способами получения уведомлений
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Настройки уведомлений доступны в разделе Уведомления
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
