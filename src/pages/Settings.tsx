import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditsPanel } from '@/components/credits/CreditsPanel';
import { StorageProviderCard } from '@/components/storage/StorageProviderCard';
import { TelegramConnectionCard } from '@/components/telegram/TelegramConnectionCard';
import { Button } from '@/components/ui/button';
import { Plus, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('credits');

  const { data: storageProviders } = useQuery({
    queryKey: ['storage-providers', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('storage_providers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: telegramAccount } = useQuery({
    queryKey: ['telegram-account', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('telegram_accounts')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Настройки</h1>
          </div>
          <p className="text-muted-foreground">
            Управляйте кредитами, хранилищами и интеграциями
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credits">Кредиты</TabsTrigger>
            <TabsTrigger value="storage">Хранилища</TabsTrigger>
            <TabsTrigger value="integrations">Интеграции</TabsTrigger>
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Добавить хранилище
              </Button>
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
                    onDelete={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border rounded-lg">
                <p className="text-muted-foreground mb-4">Хранилища не подключены</p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить первое хранилище
                </Button>
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

            <TelegramConnectionCard
              isConnected={!!telegramAccount}
              username={telegramAccount?.telegram_username || undefined}
              firstName={telegramAccount?.first_name || undefined}
              linkedAt={telegramAccount?.linked_at || undefined}
              lastInteraction={telegramAccount?.last_interaction_at || undefined}
              onConnect={() => {
                // TODO: Открыть диалог подключения Telegram
                window.open('https://t.me/YOUR_BOT_NAME', '_blank');
              }}
              onDisconnect={() => {
                // TODO: Отключить Telegram
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
