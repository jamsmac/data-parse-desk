import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  CheckCircle2, 
  Info,
  Sparkles,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ProactiveInsightsPanelProps {
  projectId?: string;
}

interface Insight {
  id: string;
  insight_type: 'anomaly' | 'trend' | 'recommendation' | 'daily_summary' | 'weekly_summary';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

export function ProactiveInsightsPanel({ projectId }: ProactiveInsightsPanelProps) {
  const queryClient = useQueryClient();

  // Load insights
  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights', projectId],
    queryFn: async () => {
      let query = supabase
        .from('ai_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Insight[];
    },
  });

  // Mark as read
  const markAsReadMutation = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('ai_insights')
        .update({ is_read: true })
        .eq('id', insightId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
  });

  // Delete insight
  const deleteInsightMutation = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('ai_insights')
        .delete()
        .eq('id', insightId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Insight удалён');
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    },
  });

  const getInsightIcon = (type: Insight['insight_type']) => {
    switch (type) {
      case 'anomaly':
        return <AlertTriangle className="h-5 w-5" />;
      case 'trend':
        return <TrendingUp className="h-5 w-5" />;
      case 'recommendation':
        return <Lightbulb className="h-5 w-5" />;
      case 'daily_summary':
      case 'weekly_summary':
        return <Sparkles className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getSeverityBadge = (severity: Insight['severity']) => {
    const variants = {
      info: 'default',
      warning: 'secondary',
      critical: 'destructive',
    } as const;

    return (
      <Badge variant={variants[severity]}>
        {severity === 'info' ? 'Информация' : severity === 'warning' ? 'Внимание' : 'Критично'}
      </Badge>
    );
  };

  const getTypeBadge = (type: Insight['insight_type']) => {
    const labels = {
      anomaly: 'Аномалия',
      trend: 'Тренд',
      recommendation: 'Рекомендация',
      daily_summary: 'Дневная сводка',
      weekly_summary: 'Недельная сводка',
    };

    return <Badge variant="outline">{labels[type]}</Badge>;
  };

  const unreadCount = insights?.filter(i => !i.is_read).length || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Загрузка insights...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Insights
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} новых</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Автоматические аналитические инсайты на основе ваших данных
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!insights || insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Пока нет AI insights</p>
            <p className="text-sm mt-2">
              AI автоматически анализирует ваши данные и создаст insights
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {insights.map((insight) => (
                <Card 
                  key={insight.id} 
                  className={insight.is_read ? 'opacity-60' : ''}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getInsightIcon(insight.insight_type)}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{insight.title}</h4>
                            {getSeverityBadge(insight.severity)}
                            {getTypeBadge(insight.insight_type)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(insight.created_at), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!insight.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsReadMutation.mutate(insight.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteInsightMutation.mutate(insight.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{insight.description}</p>
                    
                    {/* Display trend direction */}
                    {insight.insight_type === 'trend' && insight.data?.direction && (
                      <div className="flex items-center gap-2 mt-3">
                        {insight.data.direction === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : insight.data.direction === 'down' ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <Info className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {insight.data.direction === 'up' ? 'Растущий тренд' :
                           insight.data.direction === 'down' ? 'Нисходящий тренд' :
                           'Стабильный'}
                        </span>
                      </div>
                    )}

                    {/* Display recommendation priority */}
                    {insight.insight_type === 'recommendation' && insight.data?.priority && (
                      <div className="mt-3">
                        <Badge variant={insight.data.priority === 'high' ? 'destructive' : 'secondary'}>
                          Приоритет: {insight.data.priority === 'high' ? 'Высокий' :
                                      insight.data.priority === 'medium' ? 'Средний' : 'Низкий'}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
