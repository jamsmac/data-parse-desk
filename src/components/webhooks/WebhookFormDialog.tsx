import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface WebhookFormDialogProps {
  open: boolean;
  onClose: () => void;
  webhook?: any;
  onSuccess: () => void;
}

export function WebhookFormDialog({ open, onClose, webhook, onSuccess }: WebhookFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    url: '',
    secret_key: '',
    events: [] as string[],
    is_active: true,
    retry_enabled: true,
    max_retries: 3,
    timeout_ms: 30000,
    headers: '{}',
  });

  const { data: availableEvents } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .order('event_type');

      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (webhook) {
      setFormData({
        name: webhook.name || '',
        url: webhook.url || '',
        secret_key: webhook.secret_key || '',
        events: webhook.events || [],
        is_active: webhook.is_active ?? true,
        retry_enabled: webhook.retry_enabled ?? true,
        max_retries: webhook.max_retries || 3,
        timeout_ms: webhook.timeout_ms || 30000,
        headers: JSON.stringify(webhook.headers || {}, null, 2),
      });
    } else {
      setFormData({
        name: '',
        url: '',
        secret_key: '',
        events: [],
        is_active: true,
        retry_enabled: true,
        max_retries: 3,
        timeout_ms: 30000,
        headers: '{}',
      });
    }
  }, [webhook]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    // Validation
    if (!formData.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите название webhook',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.url.trim() || !formData.url.match(/^https?:\/\//)) {
      toast({
        title: 'Ошибка',
        description: 'Введите корректный URL (http:// или https://)',
        variant: 'destructive',
      });
      return;
    }

    if (formData.events.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите хотя бы одно событие',
        variant: 'destructive',
      });
      return;
    }

    let parsedHeaders;
    try {
      parsedHeaders = JSON.parse(formData.headers);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Некорректный JSON в заголовках',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const webhookData = {
        name: formData.name,
        url: formData.url,
        secret_key: formData.secret_key || null,
        events: formData.events,
        is_active: formData.is_active,
        retry_enabled: formData.retry_enabled,
        max_retries: formData.max_retries,
        timeout_ms: formData.timeout_ms,
        headers: parsedHeaders,
        user_id: user.id,
      };

      if (webhook?.id) {
        // Update existing webhook
        const { error } = await supabase
          .from('webhooks')
          .update(webhookData)
          .eq('id', webhook.id);

        if (error) throw error;

        toast({
          title: 'Webhook обновлён',
        });
      } else {
        // Create new webhook
        const { error } = await supabase
          .from('webhooks')
          .insert(webhookData);

        if (error) throw error;

        toast({
          title: 'Webhook создан',
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Webhook save error:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось сохранить webhook',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEvent = (eventType: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventType)
        ? prev.events.filter(e => e !== eventType)
        : [...prev.events, eventType],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{webhook ? 'Редактировать' : 'Создать'} Webhook</DialogTitle>
          <DialogDescription>
            Настройте webhook для получения уведомлений о событиях в вашем проекте
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Название</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My Webhook"
              />
            </div>

            <div>
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com/webhook"
              />
              <p className="text-xs text-muted-foreground mt-1">
                POST запросы будут отправляться на этот URL
              </p>
            </div>

            <div>
              <Label htmlFor="secret">Secret Key (опционально)</Label>
              <Input
                id="secret"
                type="password"
                value={formData.secret_key}
                onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                placeholder="your-secret-key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Используется для генерации HMAC подписи в заголовке X-Webhook-Signature
              </p>
            </div>
          </div>

          {/* Events */}
          <div>
            <Label>События</Label>
            <ScrollArea className="h-48 border rounded-md p-4 mt-2">
              <div className="space-y-3">
                {availableEvents?.map((event) => (
                  <div key={event.event_type} className="flex items-start space-x-2">
                    <Checkbox
                      id={event.event_type}
                      checked={formData.events.includes(event.event_type)}
                      onCheckedChange={() => toggleEvent(event.event_type)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={event.event_type}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {event.event_type}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Активен</Label>
                <p className="text-xs text-muted-foreground">
                  Webhook будет получать события
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Повторные попытки</Label>
                <p className="text-xs text-muted-foreground">
                  Автоматически повторять при ошибке
                </p>
              </div>
              <Switch
                checked={formData.retry_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, retry_enabled: checked })}
              />
            </div>

            {formData.retry_enabled && (
              <div>
                <Label htmlFor="maxRetries">Максимум попыток</Label>
                <Input
                  id="maxRetries"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.max_retries}
                  onChange={(e) => setFormData({ ...formData, max_retries: parseInt(e.target.value) || 3 })}
                />
              </div>
            )}

            <div>
              <Label htmlFor="timeout">Timeout (мс)</Label>
              <Input
                id="timeout"
                type="number"
                min="1000"
                max="60000"
                step="1000"
                value={formData.timeout_ms}
                onChange={(e) => setFormData({ ...formData, timeout_ms: parseInt(e.target.value) || 30000 })}
              />
            </div>

            <div>
              <Label htmlFor="headers">Дополнительные заголовки (JSON)</Label>
              <Textarea
                id="headers"
                value={formData.headers}
                onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                rows={4}
                className="font-mono text-sm"
                placeholder='{"Authorization": "Bearer token"}'
              />
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Webhook будет получать POST запросы с JSON payload. Все запросы включают заголовки:
              X-Webhook-Event, X-Webhook-ID, X-Webhook-Delivery и опционально X-Webhook-Signature.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : webhook ? 'Обновить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
