/**
 * Главная страница настроек VHData Platform
 * Объединяет все настройки в удобный интерфейс с табами
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GlassCard } from '@/components/aurora/layouts/GlassCard';
import { FadeIn } from '@/components/aurora/animations/FadeIn';
import ProfilePage from './ProfilePage';
import { EmailSettings } from '@/components/collaboration/EmailSettings';
import { NotificationPreferences } from '@/components/collaboration/NotificationPreferences';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { DatabaseSettings } from '@/components/settings/DatabaseSettings';
import {
  User,
  Bell,
  Mail,
  Shield,
  Palette,
  Database,
  Settings as SettingsIcon
} from 'lucide-react';

export default function Settings() {
  return (
    <FadeIn>
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <SettingsIcon className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Настройки</h1>
          </div>
          <p className="text-muted-foreground">
            Управляйте настройками вашего аккаунта и приложения
          </p>
        </div>

        {/* Табы с настройками */}
        <GlassCard
          intensity="medium"
          blur="sm"
          className="p-6"
        >
          <Tabs defaultValue="profile" className="w-full space-y-6">
            {/* Список табов */}
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto gap-2">
              <TabsTrigger
                value="profile"
                className="flex items-center gap-2 data-[state=active]:bg-primary/20"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Профиль</span>
              </TabsTrigger>

              <TabsTrigger
                value="notifications"
                className="flex items-center gap-2 data-[state=active]:bg-primary/20"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Уведомления</span>
              </TabsTrigger>

              <TabsTrigger
                value="email"
                className="flex items-center gap-2 data-[state=active]:bg-primary/20"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden sm:inline">Email</span>
              </TabsTrigger>

              <TabsTrigger
                value="security"
                className="flex items-center gap-2 data-[state=active]:bg-primary/20"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Безопасность</span>
              </TabsTrigger>

              <TabsTrigger
                value="appearance"
                className="flex items-center gap-2 data-[state=active]:bg-primary/20"
              >
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Оформление</span>
              </TabsTrigger>

              <TabsTrigger
                value="databases"
                className="flex items-center gap-2 data-[state=active]:bg-primary/20"
              >
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Базы данных</span>
              </TabsTrigger>
            </TabsList>

            {/* Содержимое табов */}
            <div className="mt-6">
              <TabsContent value="profile" className="space-y-4 animate-in fade-in-50">
                <ProfilePage />
              </TabsContent>

              <TabsContent value="notifications" className="space-y-4 animate-in fade-in-50">
                <NotificationPreferences />
              </TabsContent>

              <TabsContent value="email" className="space-y-4 animate-in fade-in-50">
                <EmailSettings />
              </TabsContent>

              <TabsContent value="security" className="space-y-4 animate-in fade-in-50">
                <SecuritySettings />
              </TabsContent>

              <TabsContent value="appearance" className="space-y-4 animate-in fade-in-50">
                <AppearanceSettings />
              </TabsContent>

              <TabsContent value="databases" className="space-y-4 animate-in fade-in-50">
                <DatabaseSettings />
              </TabsContent>
            </div>
          </Tabs>
        </GlassCard>

        {/* Подсказка */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Подсказка:</strong> Все изменения сохраняются автоматически.
            Некоторые настройки могут потребовать перезагрузки страницы для применения.
          </p>
        </div>
      </div>
    </FadeIn>
  );
}