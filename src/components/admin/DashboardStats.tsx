import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Database, Brain, Coins, TrendingUp, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  total_projects: number;
  total_databases: number;
  total_ai_requests: number;
  ai_requests_today: number;
  total_credits_used: number;
  credits_used_today: number;
  avg_credits_per_user: number;
}

export function DashboardStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_stats");
      if (error) throw error;
      return data[0] as Stats;
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Всего пользователей",
      value: stats.total_users,
      icon: Users,
      description: `${stats.active_users_7d} активных за 7 дней`,
    },
    {
      title: "Проекты",
      value: stats.total_projects,
      icon: Database,
      description: `${stats.total_databases} баз данных`,
    },
    {
      title: "AI запросы",
      value: stats.total_ai_requests,
      icon: Brain,
      description: `${stats.ai_requests_today} сегодня`,
    },
    {
      title: "Использовано кредитов",
      value: stats.total_credits_used.toFixed(2),
      icon: Coins,
      description: `${stats.credits_used_today.toFixed(2)} сегодня`,
    },
    {
      title: "Средний расход кредитов",
      value: stats.avg_credits_per_user.toFixed(2),
      icon: TrendingUp,
      description: "на пользователя",
    },
    {
      title: "Активные за 30 дней",
      value: stats.active_users_30d,
      icon: Activity,
      description: `${((stats.active_users_30d / stats.total_users) * 100).toFixed(1)}% пользователей`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
