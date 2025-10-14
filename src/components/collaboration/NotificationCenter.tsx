import React, { useState } from 'react';
import {
  Bell,
  Check,
  Trash2,
  Filter,
  MoreVertical,
  MessageSquare,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import type { Notification } from '@/types/auth';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead?: (notificationId: string) => Promise<void>;
  onMarkAllAsRead?: () => Promise<void>;
  onDelete?: (notificationId: string) => Promise<void>;
  onDeleteAll?: () => Promise<void>;
}

const notificationTypeIcons: Record<Notification['type'], React.ReactNode> = {
  comment: <MessageSquare className="h-4 w-4" />,
  mention: <MessageSquare className="h-4 w-4" />,
  share: <MessageSquare className="h-4 w-4" />,
  update: <Info className="h-4 w-4" />,
  system: <Info className="h-4 w-4" />,
  success: <CheckCircle2 className="h-4 w-4" />,
  warning: <AlertCircle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />,
  info: <Info className="h-4 w-4" />,
};

const notificationTypeColors: Record<
  Notification['type'],
  string
> = {
  comment: 'text-blue-600 dark:text-blue-400',
  mention: 'text-purple-600 dark:text-purple-400',
  share: 'text-green-600 dark:text-green-400',
  update: 'text-blue-600 dark:text-blue-400',
  system: 'text-gray-600 dark:text-gray-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-gray-600 dark:text-gray-400',
};

const notificationTypeLabels: Record<Notification['type'], string> = {
  comment: 'Комментарий',
  mention: 'Упоминание',
  share: 'Общий доступ',
  update: 'Обновление',
  system: 'Системное',
  success: 'Успех',
  warning: 'Предупреждение',
  error: 'Ошибка',
  info: 'Информация',
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onDeleteAll,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<Notification['type'] | 'all'>('all');

  // Фильтрация уведомлений
  const filteredNotifications = notifications.filter((notification) => {
    if (activeTab === 'unread' && notification.is_read) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

  // Счётчик непрочитанных
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Форматирование времени
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Отметить как прочитанное
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await onMarkAsRead?.(notificationId);
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отметить уведомление',
        variant: 'destructive',
      });
    }
  };

  // Отметить все как прочитанные
  const handleMarkAllAsRead = async () => {
    try {
      await onMarkAllAsRead?.();
      toast({
        title: 'Готово',
        description: 'Все уведомления отмечены как прочитанные',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отметить уведомления',
        variant: 'destructive',
      });
    }
  };

  // Удалить уведомление
  const handleDelete = async (notificationId: string) => {
    try {
      await onDelete?.(notificationId);
      toast({
        title: 'Удалено',
        description: 'Уведомление удалено',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить уведомление',
        variant: 'destructive',
      });
    }
  };

  // Удалить все уведомления
  const handleDeleteAll = async () => {
    try {
      await onDeleteAll?.();
      toast({
        title: 'Готово',
        description: 'Все уведомления удалены',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить уведомления',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Заголовок */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Уведомления</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 min-w-[20px] px-1">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                {typeFilter === 'all'
                  ? 'Все типы'
                  : notificationTypeLabels[typeFilter]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                Все типы
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {Object.entries(notificationTypeLabels).map(([type, label]) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() =>
                    setTypeFilter(type as Notification['type'])
                  }
                >
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                <Check className="mr-2 h-4 w-4" />
                Отметить все как прочитанные
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDeleteAll}
                disabled={notifications.length === 0}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить все
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Вкладки */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'all' | 'unread')}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <div className="border-b px-4">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="all" className="gap-2">
              Все
              <Badge variant="secondary">{notifications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="unread" className="gap-2">
              Непрочитанные
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="all"
          className="flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <NotificationList
            notifications={filteredNotifications}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            formatTime={formatTime}
          />
        </TabsContent>

        <TabsContent
          value="unread"
          className="flex-1 overflow-hidden data-[state=active]:flex data-[state=active]:flex-col"
        >
          <NotificationList
            notifications={filteredNotifications}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            formatTime={formatTime}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  formatTime: (date: string) => string;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onDelete,
  formatTime,
}) => {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div className="space-y-2">
          <Bell className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Нет уведомлений</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="divide-y">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`group relative flex gap-3 p-4 transition-colors hover:bg-muted/50 ${
              !notification.is_read ? 'bg-muted/30' : ''
            }`}
          >
            {/* Индикатор непрочитанного */}
            {!notification.is_read && (
              <div className="absolute left-2 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-blue-600" />
            )}

            {/* Иконка типа */}
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${
                notificationTypeColors[notification.type]
              }`}
            >
              {notificationTypeIcons[notification.type]}
            </div>

            {/* Контент */}
            <div className="flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {!notification.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkAsRead(notification.id)}
                      title="Отметить как прочитанное"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(notification.id)}
                    title="Удалить"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {notificationTypeLabels[notification.type]}
                </Badge>
                <span>•</span>
                <span>{formatTime(notification.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
