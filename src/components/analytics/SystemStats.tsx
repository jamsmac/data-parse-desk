import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartWrapper, LazyBarChart, LazyLineChart, LazyPieChart, Bar, Line, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from '@/components/charts/LazyChart';
import { Database, FileUp, Zap, TrendingUp, DollarSign, Activity } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export const SystemStats = () => {
  const { user } = useAuth();

  // Получаем статистику по кредитам
  const { data: creditsData } = useQuery({
    queryKey: ['user-credits-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Получаем историю транзакций
  const { data: transactions } = useQuery({
    queryKey: ['credit-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Получаем статистику по AI запросам
  const { data: aiRequests } = useQuery({
    queryKey: ['ai-requests-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('ai_requests')
        .select('agent_type, status, credits_used, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Получаем статистику по импортам
  const { data: uploadStats } = useQuery({
    queryKey: ['upload-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('upload_log')
        .select('*')
        .eq('user_id', user.id)
        .order('upload_date', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Получаем статистику по базам данных
  const { data: databaseStats } = useQuery({
    queryKey: ['database-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, totalRows: 0 };
      
      const { data: databases } = await supabase
        .from('databases')
        .select('id')
        .eq('user_id', user.id);
      
      if (!databases || databases.length === 0) {
        return { total: 0, totalRows: 0 };
      }

      const { count } = await supabase
        .from('table_data')
        .select('*', { count: 'exact', head: true })
        .in('database_id', databases.map(d => d.id));

      return {
        total: databases.length,
        totalRows: count || 0,
      };
    },
    enabled: !!user?.id,
  });

  // Подготовка данных для графиков
  const aiRequestsByType = aiRequests?.reduce((acc: any[], req) => {
    const existing = acc.find(item => item.name === req.agent_type);
    if (existing) {
      existing.value += 1;
      existing.credits += Number(req.credits_used || 0);
    } else {
      acc.push({
        name: req.agent_type,
        value: 1,
        credits: Number(req.credits_used || 0),
      });
    }
    return acc;
  }, []) || [];

  const uploadTrend = uploadStats?.slice(0, 7).reverse().map(log => ({
    date: new Date(log.upload_date).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
    files: 1,
    rows: log.new_records || 0,
  })) || [];

  const creditsTrend = transactions?.slice(0, 10).reverse().map(tx => ({
    date: new Date(tx.created_at).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
    amount: Number(tx.amount),
    type: tx.transaction_type,
  })) || [];

  const totalCredits = (creditsData?.free_credits || 0) + (creditsData?.paid_credits || 0);
  const totalSpent = creditsData?.total_credits_used || 0;
  const totalAiRequests = aiRequests?.length || 0;
  const successfulAiRequests = aiRequests?.filter(r => r.status === 'completed').length || 0;

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Доступно кредитов</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredits.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Использовано: {totalSpent.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Баз данных</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{databaseStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Всего записей: {databaseStats?.totalRows || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI запросов</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAiRequests}</div>
            <p className="text-xs text-muted-foreground">
              Успешных: {successfulAiRequests} ({totalAiRequests > 0 ? Math.round((successfulAiRequests / totalAiRequests) * 100) : 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Загружено файлов</CardTitle>
            <FileUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uploadStats?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Успешных: {uploadStats?.filter(u => u.status === 'success').length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI запросы по типам */}
        {aiRequestsByType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>AI запросы по типам</CardTitle>
              <CardDescription>Распределение использования AI агентов</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <ResponsiveContainer width="100%" height={300}>
                  <LazyPieChart>
                    <Pie
                      data={aiRequestsByType}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {aiRequestsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </LazyPieChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </CardContent>
          </Card>
        )}

        {/* Тренд загрузок */}
        {uploadTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Импорт данных</CardTitle>
              <CardDescription>Последние 7 дней</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <ResponsiveContainer width="100%" height={300}>
                  <LazyBarChart data={uploadTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="rows" fill="hsl(var(--primary))" name="Записей" />
                  </LazyBarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </CardContent>
          </Card>
        )}

        {/* Тренд кредитов */}
        {creditsTrend.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>История кредитов</CardTitle>
              <CardDescription>Последние транзакции</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartWrapper height={300}>
                <ResponsiveContainer width="100%" height={300}>
                  <LazyLineChart data={creditsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(var(--primary))"
                      name="Кредиты"
                      strokeWidth={2}
                    />
                  </LazyLineChart>
                </ResponsiveContainer>
              </ChartWrapper>
            </CardContent>
          </Card>
        )}

        {/* Расход кредитов по агентам */}
        {aiRequestsByType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Расход кредитов AI</CardTitle>
              <CardDescription>По типам агентов</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aiRequestsByType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="credits" fill="hsl(var(--accent))" name="Кредитов" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
