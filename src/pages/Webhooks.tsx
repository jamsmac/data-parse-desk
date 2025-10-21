import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Webhook, History, Settings } from 'lucide-react';
import { WebhookList } from '@/components/webhooks/WebhookList';
import { WebhookFormDialog } from '@/components/webhooks/WebhookFormDialog';
import { WebhookLogs } from '@/components/webhooks/WebhookLogs';
import { WebhookEvents } from '@/components/webhooks/WebhookEvents';

export default function Webhooks() {
  const { user } = useAuth();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any>(null);

  const { data: webhooks, refetch: refetchWebhooks } = useQuery({
    queryKey: ['webhooks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['webhook-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: webhooks } = await supabase
        .from('webhooks')
        .select('id, is_active')
        .eq('user_id', user.id);

      const { data: logs } = await supabase
        .from('webhook_logs')
        .select('success, webhook_id')
        .in('webhook_id', (webhooks || []).map(w => w.id))
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const total = webhooks?.length || 0;
      const active = webhooks?.filter(w => w.is_active).length || 0;
      const callsLast24h = logs?.length || 0;
      const successRate = logs?.length
        ? ((logs.filter(l => l.success).length / logs.length) * 100).toFixed(1)
        : '0';

      return { total, active, callsLast24h, successRate };
    },
    enabled: !!user?.id,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Webhooks</h1>
              <p className="text-muted-foreground">
                Настройте webhooks для интеграции с внешними сервисами
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать Webhook
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Всего Webhooks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Активных
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Вызовов за 24ч
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.callsLast24h}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.successRate}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="webhooks" className="w-full">
          <TabsList>
            <TabsTrigger value="webhooks">
              <Webhook className="h-4 w-4 mr-2" />
              Мои Webhooks
            </TabsTrigger>
            <TabsTrigger value="logs">
              <History className="h-4 w-4 mr-2" />
              История
            </TabsTrigger>
            <TabsTrigger value="events">
              <Settings className="h-4 w-4 mr-2" />
              Доступные события
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="mt-6">
            <WebhookList
              webhooks={webhooks || []}
              onEdit={(webhook) => {
                setSelectedWebhook(webhook);
                setShowCreateDialog(true);
              }}
              onRefresh={refetchWebhooks}
            />
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <WebhookLogs webhookId={null} />
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            <WebhookEvents />
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <WebhookFormDialog
          open={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            setSelectedWebhook(null);
          }}
          webhook={selectedWebhook}
          onSuccess={() => {
            setShowCreateDialog(false);
            setSelectedWebhook(null);
            refetchWebhooks();
          }}
        />
      </main>
    </div>
  );
}
