import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Activity as ActivityIcon,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Share2,
  Database,
  Table2,
  BarChart3,
  FileText,
} from 'lucide-react';
import { Activity } from '@/types/auth';

export interface ActivityFeedProps {
  activities: Activity[];
  limit?: number;
}

const ACTION_ICONS = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  import: Upload,
  export: Download,
  share: Share2,
};

const ENTITY_ICONS = {
  database: Database,
  row: Table2,
  column: Table2,
  chart: BarChart3,
  report: FileText,
};

const ACTION_LABELS = {
  create: 'создал(а)',
  update: 'обновил(а)',
  delete: 'удалил(а)',
  import: 'импортировал(а)',
  export: 'экспортировал(а)',
  share: 'поделился(лась)',
};

const ENTITY_LABELS = {
  database: 'база данных',
  row: 'запись',
  column: 'колонка',
  chart: 'график',
  report: 'отчет',
};

export function ActivityFeed({ activities, limit }: ActivityFeedProps) {
  const displayActivities = limit ? activities.slice(0, limit) : activities;

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return email?.substring(0, 2).toUpperCase() || '??';
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const activityDate = new Date(date);
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} д назад`;
    return activityDate.toLocaleDateString('ru-RU');
  };

  const getActionColor = (action: Activity['action']) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300';
      case 'update':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300';
      case 'delete':
        return 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300';
      case 'import':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300';
      case 'export':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300';
      case 'share':
        return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ActivityIcon className="h-5 w-5" />
          Лента активности
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayActivities.length > 0 ? (
          <ScrollArea className={limit ? 'h-[400px]' : 'h-[600px]'}>
            <div className="space-y-4 pr-4">
              {displayActivities.map((activity) => {
                const ActionIcon = ACTION_ICONS[activity.action];
                const EntityIcon = ENTITY_ICONS[activity.entity_type];

                return (
                  <div key={activity.id} className="flex gap-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={activity.user.avatar_url} />
                        <AvatarFallback>
                          {getInitials(activity.user.full_name, activity.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center ${getActionColor(
                          activity.action
                        )}`}
                      >
                        <ActionIcon className="h-3 w-3" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">
                              {activity.user.full_name || activity.user.email}
                            </span>{' '}
                            <span className="text-muted-foreground">
                              {ACTION_LABELS[activity.action]}
                            </span>{' '}
                            <span className="font-medium">
                              {ENTITY_LABELS[activity.entity_type]}
                            </span>
                            {activity.entity_name && (
                              <>
                                {' '}
                                <span className="text-muted-foreground">«</span>
                                <span className="font-medium">{activity.entity_name}</span>
                                <span className="text-muted-foreground">»</span>
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {EntityIcon && <EntityIcon className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {activity.changes && Object.keys(activity.changes).length > 0 && (
                        <div className="mt-2 p-2 bg-secondary/50 rounded text-xs space-y-1">
                          {Object.entries(activity.changes).map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-muted-foreground">{key}:</span>
                              <span className="font-mono flex-1 break-all">
                                {typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <ActivityIcon className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>Нет активности</p>
            <p className="text-sm">История действий появится здесь</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
