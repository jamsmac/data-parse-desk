import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function ApiUsageChart() {
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: usage = [] } = useQuery({
    queryKey: ['api-usage', user?.id],
    queryFn: async () => {
      const { data: apiKeys } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user?.id);

      if (!apiKeys || apiKeys.length === 0) return [];

      const keyIds = apiKeys.map(k => k.id);

      const { data, error } = await supabase
        .from('api_usage')
        .select('*, api_key:api_key_id(name, key_prefix)')
        .in('api_key_id', keyIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Calculate stats
  const totalRequests = usage.length;
  const successfulRequests = usage.filter(u => u.status_code >= 200 && u.status_code < 300).length;
  const failedRequests = usage.filter(u => u.status_code >= 400).length;
  const avgResponseTime = usage.length
    ? Math.round(usage.reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / usage.length)
    : 0;

  // Group by endpoint
  const endpointStats = usage.reduce((acc, u) => {
    const endpoint = u.endpoint;
    if (!acc[endpoint]) {
      acc[endpoint] = { count: 0, avgTime: 0, totalTime: 0 };
    }
    acc[endpoint].count++;
    acc[endpoint].totalTime += u.response_time_ms || 0;
    acc[endpoint].avgTime = Math.round(acc[endpoint].totalTime / acc[endpoint].count);
    return acc;
  }, {} as Record<string, { count: number; avgTime: number; totalTime: number }>);

  const topEndpoints = Object.entries(endpointStats)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего запросов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Успешных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successfulRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ошибок</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedRequests}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Среднее время</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Endpoints */}
      {topEndpoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Топ endpoints</CardTitle>
            <CardDescription>Самые популярные endpoints за последние запросы</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topEndpoints.map(([endpoint, stats]) => (
                <div key={endpoint} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm">{endpoint}</div>
                    <div className="text-xs text-muted-foreground">
                      {stats.count} запросов • {stats.avgTime}ms среднее время
                    </div>
                  </div>
                  <Badge variant="outline">{stats.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Последняя активность</CardTitle>
          <CardDescription>100 последних API запросов</CardDescription>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Нет активности</p>
              <p className="text-sm mt-1">API запросы появятся здесь после их выполнения</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {usage.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {log.status_code >= 200 && log.status_code < 300 ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.method}
                          </Badge>
                          <code className="text-xs">{log.endpoint}</code>
                        </div>
                        <Badge variant={log.status_code < 300 ? 'default' : 'destructive'}>
                          {log.status_code}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {log.response_time_ms}ms
                        </div>
                        <div>
                          API Key: {(log.api_key as any)?.key_prefix || 'Unknown'}
                        </div>
                        <div>
                          {format(new Date(log.created_at), 'dd MMM HH:mm:ss', { locale: ru })}
                        </div>
                      </div>

                      {log.ip_address && (
                        <div className="text-xs text-muted-foreground">
                          IP: {log.ip_address}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
