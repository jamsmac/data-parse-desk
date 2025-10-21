import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, Clock, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface WebhookLogsProps {
  webhookId: string | null;
}

export function WebhookLogs({ webhookId }: WebhookLogsProps) {
  const { user } = useAuth();
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  const { data: logs, refetch } = useQuery({
    queryKey: ['webhook-logs', user?.id, webhookId, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('webhook_logs')
        .select(`
          *,
          webhook:webhook_id (
            id,
            name,
            url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // Filter by webhook if specified
      if (webhookId) {
        query = query.eq('webhook_id', webhookId);
      } else {
        // Filter by user's webhooks
        const { data: userWebhooks } = await supabase
          .from('webhooks')
          .select('id')
          .eq('user_id', user.id);

        if (userWebhooks) {
          query = query.in('webhook_id', userWebhooks.map(w => w.id));
        }
      }

      // Filter by status
      if (statusFilter !== 'all') {
        query = query.eq('success', statusFilter === 'success');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const filteredLogs = logs?.filter(log =>
    searchQuery === '' ||
    log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.webhook?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusIcon = (success: boolean) => {
    if (success) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? 'default' : 'destructive'}>
        {success ? 'Success' : 'Failed'}
      </Badge>
    );
  };

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Нет истории</h3>
          <p className="text-sm text-muted-foreground">
            История вызовов webhooks будет отображаться здесь
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по событию или webhook..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="success">Успешные</SelectItem>
            <SelectItem value="failed">Ошибки</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Logs List */}
      <div className="space-y-2">
        {filteredLogs?.map((log) => (
          <Card
            key={log.id}
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setSelectedLog(log)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(log.success)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{log.event_type}</span>
                      {getStatusBadge(log.success)}
                      {log.retry_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          Retry {log.retry_count}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.webhook?.name || 'Unknown webhook'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>
                        {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss', { locale: ru })}
                      </span>
                      {log.response_time_ms && (
                        <span>{log.response_time_ms}ms</span>
                      )}
                      {log.response_status && (
                        <Badge variant="outline" className="text-xs">
                          {log.response_status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Log Details Dialog */}
      {selectedLog && (
        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Детали вызова webhook</DialogTitle>
              <DialogDescription>
                {selectedLog.webhook?.name} • {selectedLog.event_type}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Статус</h4>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedLog.success)}
                    {getStatusBadge(selectedLog.success)}
                    {selectedLog.response_status && (
                      <Badge variant="outline">HTTP {selectedLog.response_status}</Badge>
                    )}
                  </div>
                </div>

                {/* Timing */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Время</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Отправлено:</span>
                      <p className="font-mono">
                        {format(new Date(selectedLog.created_at), 'dd MMM yyyy, HH:mm:ss', { locale: ru })}
                      </p>
                    </div>
                    {selectedLog.response_time_ms && (
                      <div>
                        <span className="text-muted-foreground">Время ответа:</span>
                        <p className="font-mono">{selectedLog.response_time_ms}ms</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Request Payload */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Request Payload</h4>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
                    {JSON.stringify(selectedLog.request_payload, null, 2)}
                  </pre>
                </div>

                {/* Response */}
                {selectedLog.response_body && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Response Body</h4>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-48">
                      {selectedLog.response_body}
                    </pre>
                  </div>
                )}

                {/* Error */}
                {selectedLog.error_message && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-red-600">Error Message</h4>
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                      <p className="text-sm text-red-800 dark:text-red-200 font-mono">
                        {selectedLog.error_message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Retry Info */}
                {selectedLog.retry_count > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Retry Information</h4>
                    <p className="text-sm text-muted-foreground">
                      Попытка {selectedLog.retry_count} из максимальных
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
