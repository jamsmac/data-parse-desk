import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit2, Trash2, TestTube, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface WebhookListProps {
  webhooks: any[];
  onEdit: (webhook: any) => void;
  onRefresh: () => void;
}

export function WebhookList({ webhooks, onEdit, onRefresh }: WebhookListProps) {
  const { toast } = useToast();
  const [toggling, setToggling] = useState<string | null>(null);

  const handleToggle = async (webhookId: string, currentStatus: boolean) => {
    setToggling(webhookId);
    try {
      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: !currentStatus })
        .eq('id', webhookId);

      if (error) throw error;

      toast({
        title: !currentStatus ? 'Webhook активирован' : 'Webhook деактивирован',
      });

      onRefresh();
    } catch (error) {
      console.error('Toggle error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить статус',
        variant: 'destructive',
      });
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async (webhookId: string) => {
    if (!confirm('Удалить этот webhook? Это действие нельзя отменить.')) return;

    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId);

      if (error) throw error;

      toast({
        title: 'Webhook удалён',
      });

      onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить webhook',
        variant: 'destructive',
      });
    }
  };

  const handleTest = async (webhook: any) => {
    try {
      const { error } = await supabase.functions.invoke('trigger-webhook', {
        body: {
          event_type: 'test.ping',
          payload: {
            message: 'Test webhook from Data Parse Desk',
            webhook_id: webhook.id,
            timestamp: new Date().toISOString(),
          },
          user_id: webhook.user_id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Тестовый запрос отправлен',
        description: 'Проверьте историю для просмотра результата',
      });
    } catch (error) {
      console.error('Test error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить тестовый запрос',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Скопировано',
      description: 'URL скопирован в буфер обмена',
    });
  };

  if (!webhooks || webhooks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Нет webhooks</h3>
            <p className="text-sm text-muted-foreground">
              Создайте первый webhook для интеграции с внешними сервисами
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {webhooks.map((webhook) => (
        <Card key={webhook.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{webhook.name}</h3>
                  <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                    {webhook.is_active ? 'Активен' : 'Неактивен'}
                  </Badge>
                  {webhook.retry_enabled && (
                    <Badge variant="outline" className="text-xs">
                      Retry enabled
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <span className="font-mono bg-muted px-2 py-1 rounded">
                    {webhook.url}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(webhook.url)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(webhook.url, '_blank')}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {webhook.events.map((event: string) => (
                    <Badge key={event} variant="outline" className="text-xs">
                      {event}
                    </Badge>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  <span>Создан {format(new Date(webhook.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}</span>
                  {webhook.last_triggered_at && (
                    <span className="ml-4">
                      Последний вызов: {format(new Date(webhook.last_triggered_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={webhook.is_active}
                  onCheckedChange={() => handleToggle(webhook.id, webhook.is_active)}
                  disabled={toggling === webhook.id}
                />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleTest(webhook)}>
                      <TestTube className="mr-2 h-4 w-4" />
                      Тестировать
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(webhook)}>
                      <Edit2 className="mr-2 h-4 w-4" />
                      Редактировать
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(webhook.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
