import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditsPanel } from '@/components/credits/CreditsPanel';
import { StorageProviderCard } from '@/components/storage/StorageProviderCard';
import { StorageProviderDialog } from '@/components/storage/StorageProviderDialog';
import { TelegramConnectionCard } from '@/components/telegram/TelegramConnectionCard';
import { UserManagement } from '@/components/collaboration/UserManagement';
import { RoleEditor } from '@/components/collaboration/RoleEditor';
import { PermissionsMatrix } from '@/components/collaboration/PermissionsMatrix';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Settings as SettingsIcon, Bot } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [activeTab, setActiveTab] = useState('credits');

  const { data: storageProviders, refetch: refetchProviders } = useQuery({
    queryKey: ['storage-providers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('storage_providers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false});
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: telegramAccount, refetch: refetchTelegram } = useQuery({
    queryKey: ['telegram-account', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('telegram_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const handleDeleteProvider = async (id: string) => {
    try {
      const { error } = await supabase
        .from('storage_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Провайдер удален',
      });

      refetchProviders();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить провайдер',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectTelegram = async () => {
    if (!telegramAccount) return;

    try {
      const { error } = await supabase
        .from('telegram_accounts')
        .update({ is_active: false })
        .eq('id', telegramAccount.id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Telegram отключен',
      });

      refetchTelegram();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отключить Telegram',
        variant: 'destructive',
      });
    }
  };

  const handleSaveTelegramToken = async () => {
    if (!telegramBotToken.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите токен бота',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Сохраняем токен в metadata
      const { error } = await supabase
        .from('database_metadata')
        .upsert({
          user_id: user?.id,
          key: 'telegram_bot_token',
          value: telegramBotToken,
        });

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Токен Telegram бота сохранен',
      });

      setTelegramBotToken('');
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить токен',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main id="main-content" className="flex-1 container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="h-8 w-8 text-primary" aria-hidden="true" />
            <h1 className="text-3xl font-bold">Настройки</h1>
          </div>
          <p className="text-muted-foreground">
            Управляйте кредитами, хранилищами и интеграциями
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4" role="tablist" aria-label="Разделы настроек">
            <TabsTrigger value="credits">Кредиты</TabsTrigger>
            <TabsTrigger value="storage">Хранилища</TabsTrigger>
            <TabsTrigger value="integrations">Интеграции</TabsTrigger>
            <TabsTrigger value="collaboration">Команда</TabsTrigger>
          </TabsList>

          <TabsContent value="credits" className="space-y-6">
            <CreditsPanel />
          </TabsContent>

          <TabsContent value="storage" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-semibold">Внешние хранилища</h2>
                <p className="text-muted-foreground mt-1">
                  Подключите облачные хранилища для автоматического бэкапа
                </p>
              </div>
              <StorageProviderDialog onSuccess={refetchProviders} />
            </div>

            {storageProviders && storageProviders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {storageProviders.map((provider) => (
                  <StorageProviderCard
                    key={provider.id}
                    id={provider.id}
                    providerType={provider.provider_type as any}
                    name={provider.name}
                    isActive={provider.is_active || false}
                    lastSyncAt={provider.last_sync_at || undefined}
                    onConfigure={() => {}}
                    onDelete={() => handleDeleteProvider(provider.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border rounded-lg">
                <p className="text-muted-foreground mb-4">Хранилища не подключены</p>
                <StorageProviderDialog onSuccess={refetchProviders} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Интеграции</h2>
              <p className="text-muted-foreground mb-6">
                Подключите внешние сервисы для расширения функционала
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Telegram Bot
                </CardTitle>
                <CardDescription>
                  Настройте токен вашего Telegram бота для интеграции
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="telegram-token">Bot Token</Label>
                  <div className="flex gap-2">
                    <Input
                      id="telegram-token"
                      type="password"
                      placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                    />
                    <Button onClick={handleSaveTelegramToken}>
                      Сохранить
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Получите токен у{' '}
                    <a 
                      href="https://t.me/BotFather" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      @BotFather
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            <TelegramConnectionCard
              isConnected={!!telegramAccount}
              username={telegramAccount?.telegram_username || undefined}
              firstName={telegramAccount?.first_name || undefined}
              linkedAt={telegramAccount?.linked_at || undefined}
              lastInteraction={telegramAccount?.last_interaction_at || undefined}
              onConnect={() => {
                toast({
                  title: 'Инструкция',
                  description: 'Настройте бота Telegram и webhook для подключения',
                });
              }}
              onDisconnect={handleDisconnectTelegram}
            />
          </TabsContent>

          <TabsContent value="collaboration" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Управление командой</h2>
              <p className="text-muted-foreground mb-6">
                Управляйте участниками проектов, ролями и разрешениями
              </p>
            </div>

            <UserManagement
              users={[]}
              currentUserId={user?.id || ''}
              onInviteUser={async () => {}}
              onUpdateUserRole={async () => {}}
              onRemoveUser={async () => {}}
            />

            <RoleEditor
              roles={[]}
              permissions={[]}
              onCreateRole={async () => {}}
              onUpdateRole={async () => {}}
              onDeleteRole={async () => {}}
            />

            <PermissionsMatrix
              roles={[]}
              permissions={[]}
              onTogglePermission={async () => {}}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
