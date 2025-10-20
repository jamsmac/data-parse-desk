import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, AtSign, FileEdit, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function TelegramNotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Create default preferences if not exist
      if (!data) {
        const { data: newPrefs, error: createError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: user.id,
            telegram_enabled: false,
            mentions_enabled: true,
            comments_enabled: true,
            email_enabled: true,
            reports_enabled: true,
          })
          .select()
          .single();

        if (createError) throw createError;
        return newPrefs;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (updates: Partial<typeof preferences>) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Настройки сохранены');
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  const handleToggle = (field: string, value: boolean) => {
    updatePreferencesMutation.mutate({ [field]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Уведомления в Telegram
        </CardTitle>
        <CardDescription>
          Настройте типы уведомлений, которые вы хотите получать в Telegram
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="space-y-0.5">
            <Label className="text-base">Telegram уведомления</Label>
            <p className="text-sm text-muted-foreground">
              Получать уведомления через Telegram бот
            </p>
          </div>
          <Switch
            checked={preferences?.telegram_enabled || false}
            onCheckedChange={(checked) => handleToggle('telegram_enabled', checked)}
            disabled={updatePreferencesMutation.isPending}
          />
        </div>

        {/* Individual notification types */}
        <div className="space-y-4 opacity-100 transition-opacity" style={{ 
          opacity: preferences?.telegram_enabled ? 1 : 0.5 
        }}>
          {/* Mentions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <AtSign className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <Label>Упоминания</Label>
                <p className="text-sm text-muted-foreground">
                  Когда вас упоминают в комментариях
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.mentions_enabled || false}
              onCheckedChange={(checked) => handleToggle('mentions_enabled', checked)}
              disabled={!preferences?.telegram_enabled || updatePreferencesMutation.isPending}
            />
          </div>

          {/* Comments */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-secondary" />
              </div>
              <div className="space-y-0.5">
                <Label>Комментарии</Label>
                <p className="text-sm text-muted-foreground">
                  Новые комментарии в ваших базах данных
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.comments_enabled || false}
              onCheckedChange={(checked) => handleToggle('comments_enabled', checked)}
              disabled={!preferences?.telegram_enabled || updatePreferencesMutation.isPending}
            />
          </div>

          {/* Data changes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <FileEdit className="h-5 w-5 text-accent-foreground" />
              </div>
              <div className="space-y-0.5">
                <Label>Изменения данных</Label>
                <p className="text-sm text-muted-foreground">
                  Когда другие пользователи редактируют данные
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.email_enabled || false}
              onCheckedChange={(checked) => handleToggle('email_enabled', checked)}
              disabled={!preferences?.telegram_enabled || updatePreferencesMutation.isPending}
            />
          </div>
        </div>

        {!preferences?.telegram_enabled && (
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            💡 Включите Telegram уведомления, чтобы получать оповещения в реальном времени
          </div>
        )}
      </CardContent>
    </Card>
  );
}
