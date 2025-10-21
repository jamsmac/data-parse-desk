import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Key, Activity, TrendingUp, Clock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiKeyList } from '@/components/api-keys/ApiKeyList';
import { ApiKeyFormDialog } from '@/components/api-keys/ApiKeyFormDialog';
import { ApiUsageChart } from '@/components/api-keys/ApiUsageChart';
import { useToast } from '@/hooks/use-toast';

export default function ApiKeys() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: apiKeys = [] } = useQuery({
    queryKey: ['api-keys', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: stats } = useQuery({
    queryKey: ['api-stats', user?.id],
    queryFn: async () => {
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const { data: usage, error } = await supabase
        .from('api_usage')
        .select('*, api_key:api_key_id(id)')
        .gte('created_at', last30Days.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalRequests = usage?.length || 0;
      const successfulRequests = usage?.filter(u => u.status_code >= 200 && u.status_code < 300).length || 0;
      const avgResponseTime = usage?.length
        ? Math.round(usage.reduce((sum, u) => sum + (u.response_time_ms || 0), 0) / usage.length)
        : 0;

      // Get last used key
      const lastUsedKey = apiKeys.find(k => k.last_used_at)?.name || 'Нет активности';

      return {
        totalRequests,
        successfulRequests,
        avgResponseTime,
        lastUsedKey,
      };
    },
    enabled: !!user?.id && apiKeys.length > 0,
  });

  const activeKeys = apiKeys.filter(k => k.is_active).length;
  const totalKeys = apiKeys.length;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-1">
            Управление API ключами для интеграции с внешними системами
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Создать API ключ
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего ключей</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKeys}</div>
            <p className="text-xs text-muted-foreground">
              {activeKeys} активных
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Запросов (30 дней)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.successfulRequests || 0} успешных
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Среднее время ответа</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResponseTime || 0}ms</div>
            <p className="text-xs text-muted-foreground">
              За последние 30 дней
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Последний использованный</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{stats?.lastUsedKey || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              API ключ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">Мои ключи</TabsTrigger>
          <TabsTrigger value="usage">Использование</TabsTrigger>
          <TabsTrigger value="docs">Документация</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Ключи</CardTitle>
              <CardDescription>
                Создавайте и управляйте API ключами для доступа к REST API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeyList apiKeys={apiKeys} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <ApiUsageChart />
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Документация</CardTitle>
              <CardDescription>
                Как использовать REST API Data Parse Desk
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Быстрый старт</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Все запросы к API требуют API ключ в заголовке <code className="bg-muted px-1 py-0.5 rounded">x-api-key</code>:
                </p>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
{`curl -H "x-api-key: dpd_your_api_key_here" \\
  https://your-project.supabase.co/functions/v1/rest-api/databases`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Доступные endpoints</h3>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li><code className="bg-muted px-1 py-0.5 rounded">GET /databases</code> - Список баз данных</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">GET /databases/:id</code> - Получить базу данных</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">POST /databases</code> - Создать базу данных</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">PUT /databases/:id</code> - Обновить базу данных</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">DELETE /databases/:id</code> - Удалить базу данных</li>
                  <li className="mt-3"><code className="bg-muted px-1 py-0.5 rounded">GET /rows?database_id=xxx</code> - Список записей</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">POST /rows?database_id=xxx</code> - Создать запись</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">PUT /rows/:id?database_id=xxx</code> - Обновить запись</li>
                  <li><code className="bg-muted px-1 py-0.5 rounded">DELETE /rows/:id?database_id=xxx</code> - Удалить запись</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Полная документация</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Для подробной информации см.{' '}
                  <a
                    href="/docs/API_DOCUMENTATION.md"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    API Documentation
                  </a>
                  {' '}и{' '}
                  <a
                    href="/docs/openapi.json"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    OpenAPI спецификацию
                  </a>
                </p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                  Важно: Безопасность
                </h4>
                <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                  <li>• Никогда не публикуйте API ключи в публичных репозиториях</li>
                  <li>• Используйте переменные окружения для хранения ключей</li>
                  <li>• Регулярно ротируйте ключи</li>
                  <li>• Создавайте отдельные ключи для разных приложений</li>
                  <li>• Настройте минимально необходимые права для каждого ключа</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ApiKeyFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
