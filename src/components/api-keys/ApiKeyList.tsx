import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Copy, Trash2, Calendar, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ApiKeyListProps {
  apiKeys: any[];
}

export function ApiKeyList({ apiKeys }: ApiKeyListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'Статус обновлён',
        description: 'Статус API ключа успешно изменён',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось обновить статус',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast({
        title: 'Ключ удалён',
        description: 'API ключ успешно удалён',
      });
    },
    onError: (error) => {
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось удалить ключ',
        variant: 'destructive',
      });
    },
  });

  const handleCopyKey = (keyPrefix: string) => {
    navigator.clipboard.writeText(keyPrefix);
    toast({
      title: 'Скопировано',
      description: 'Префикс API ключа скопирован в буфер обмена',
    });
  };

  const handleToggle = (id: string, currentStatus: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleDelete = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этот API ключ? Это действие нельзя отменить.')) {
      deleteMutation.mutate(id);
    }
  };

  const getPermissionsBadges = (permissions: any) => {
    const badges = [];

    if (permissions?.databases?.read) badges.push('DB Read');
    if (permissions?.databases?.write) badges.push('DB Write');
    if (permissions?.databases?.delete) badges.push('DB Delete');
    if (permissions?.rows?.read) badges.push('Rows Read');
    if (permissions?.rows?.write) badges.push('Rows Write');
    if (permissions?.rows?.delete) badges.push('Rows Delete');

    return badges;
  };

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>У вас пока нет API ключей</p>
        <p className="text-sm mt-2">Создайте первый ключ для начала работы с API</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {apiKeys.map((apiKey) => (
        <Card key={apiKey.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{apiKey.name}</h3>
                  <Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
                    {apiKey.is_active ? 'Активен' : 'Неактивен'}
                  </Badge>
                  {apiKey.expires_at && new Date(apiKey.expires_at) < new Date() && (
                    <Badge variant="destructive">Истёк</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={apiKey.is_active}
                    onCheckedChange={() => handleToggle(apiKey.id, apiKey.is_active)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleCopyKey(apiKey.key_prefix)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Копировать префикс
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(apiKey.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Key Prefix */}
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                  {apiKey.key_prefix}***************************
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopyKey(apiKey.key_prefix)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {/* Permissions */}
              <div className="flex flex-wrap gap-1">
                {getPermissionsBadges(apiKey.permissions).map((badge) => (
                  <Badge key={badge} variant="outline" className="text-xs">
                    {badge}
                  </Badge>
                ))}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  Создан: {format(new Date(apiKey.created_at), 'dd MMM yyyy', { locale: ru })}
                </div>
                {apiKey.last_used_at && (
                  <div className="flex items-center gap-2">
                    <Activity className="h-3 w-3" />
                    Последнее использование: {format(new Date(apiKey.last_used_at), 'dd MMM yyyy HH:mm', { locale: ru })}
                  </div>
                )}
                {apiKey.expires_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Истекает: {format(new Date(apiKey.expires_at), 'dd MMM yyyy', { locale: ru })}
                  </div>
                )}
              </div>

              {/* Rate Limit */}
              <div className="text-sm text-muted-foreground">
                Rate limit: {apiKey.rate_limit} запросов/час
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
