import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Activity, Database, Users, FileText } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

const COLORS = ['#1E40AF', '#3B82F6', '#60A5FA', '#93C5FD', '#DBEAFE'];

export default function AdvancedAnalytics() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<string>('all');

  // Fetch projects
  const { data: projects } = useQuery({
    queryKey: ['projects', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_archived', false);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch overall stats
  const { data: stats } = useQuery({
    queryKey: ['advanced-stats', user?.id, selectedProject],
    queryFn: async () => {
      const projectFilter = selectedProject === 'all' 
        ? projects?.map(p => p.id) || []
        : [selectedProject];

      if (projectFilter.length === 0) return null;

      // Get databases count
      const { count: databaseCount } = await supabase
        .from('databases')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectFilter);

      // Get table data count
      const { count: recordCount } = await supabase
        .from('table_data')
        .select('*', { count: 'exact', head: true });

      // Get ai requests
      const { count: aiRequestCount } = await supabase
        .from('ai_requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Get activity
      const { count: activityCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectFilter);

      return {
        databases: databaseCount || 0,
        records: recordCount || 0,
        aiRequests: aiRequestCount || 0,
        activities: activityCount || 0,
      };
    },
    enabled: !!user?.id && !!projects,
  });

  // Mock data for charts (replace with real data later)
  const dailyActivity = [
    { date: 'Пн', records: 45, imports: 12 },
    { date: 'Вт', records: 52, imports: 8 },
    { date: 'Ср', records: 38, imports: 15 },
    { date: 'Чт', records: 68, imports: 20 },
    { date: 'Пт', records: 75, imports: 18 },
    { date: 'Сб', records: 42, imports: 5 },
    { date: 'Вс', records: 28, imports: 3 },
  ];

  const projectDistribution = projects?.slice(0, 5).map((p, idx) => ({
    name: p.name,
    value: Math.floor(Math.random() * 100) + 20,
    color: COLORS[idx % COLORS.length],
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Advanced Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Глубокий анализ данных и метрики производительности
            </p>
          </div>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все проекты</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего таблиц</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.databases || 0}</div>
              <p className="text-xs text-muted-foreground">В выбранных проектах</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Всего записей</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.records?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">Во всех таблицах</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI запросов</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.aiRequests || 0}</div>
              <p className="text-xs text-muted-foreground">За всё время</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Активность</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activities || 0}</div>
              <p className="text-xs text-muted-foreground">Действий за месяц</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="activity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="activity">Активность</TabsTrigger>
            <TabsTrigger value="distribution">Распределение</TabsTrigger>
            <TabsTrigger value="performance">Производительность</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ежедневная активность</CardTitle>
                <CardDescription>
                  Записи и импорты за последнюю неделю
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="records" fill="#1E40AF" name="Записи" />
                    <Bar dataKey="imports" fill="#60A5FA" name="Импорты" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Распределение по проектам</CardTitle>
                <CardDescription>
                  Топ-5 проектов по количеству данных
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Метрики производительности</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Здесь будут отображаться метрики производительности системы
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
