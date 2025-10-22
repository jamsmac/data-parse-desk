import { usePresence } from '@/hooks/usePresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveUsersProps {
  projectId?: string;
  databaseId: string;
  view?: string;
  compact?: boolean;
}

export function ActiveUsers({ projectId, databaseId, view, compact = false }: ActiveUsersProps) {
  const { activeUsers, loading } = usePresence({ projectId, databaseId, view });

  if (loading) return null;

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'away':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active':
        return 'Активен';
      case 'idle':
        return 'Неактивен';
      case 'away':
        return 'Отошел';
      default:
        return 'Неизвестно';
    }
  };

  const formatLastSeen = (lastSeen: string): string => {
    const now = new Date();
    const seen = new Date(lastSeen);
    const diff = now.getTime() - seen.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return 'Только что';
    if (seconds < 300) return `${Math.floor(seconds / 60)} мин назад`;
    return 'Давно';
  };

  if (activeUsers.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center -space-x-2">
          <AnimatePresence>
            {activeUsers.slice(0, 3).map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
              >
                <Tooltip>
                  <TooltipTrigger>
                    <div className="relative">
                      <Avatar className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={user.user_avatar || undefined} alt={user.user_name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${getStatusColor(
                          user.status
                        )} border-2 border-background rounded-full`}
                        fill="currentColor"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{user.user_name}</p>
                      <p className="text-xs text-muted-foreground">{user.user_email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getStatusText(user.status)} • {formatLastSeen(user.last_seen_at)}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {activeUsers.length > 3 && (
          <Badge variant="secondary" className="text-xs">
            +{activeUsers.length - 3}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <Users className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-2 flex-1">
        <span className="text-sm font-medium">Активные пользователи:</span>
        <div className="flex items-center -space-x-2">
          <AnimatePresence>
            {activeUsers.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
              >
                <Tooltip>
                  <TooltipTrigger>
                    <div className="relative">
                      <Avatar className="h-9 w-9 border-2 border-background hover:z-10 transition-all hover:scale-110">
                        <AvatarImage src={user.user_avatar || undefined} alt={user.user_name} />
                        <AvatarFallback className="text-xs">
                          {getInitials(user.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <Circle
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 ${getStatusColor(
                          user.status
                        )} border-2 border-background rounded-full`}
                        fill="currentColor"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{user.user_name}</p>
                      <p className="text-xs text-muted-foreground">{user.user_email}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1 border-t">
                        <span>{getStatusText(user.status)}</span>
                        <span>•</span>
                        <span>{formatLastSeen(user.last_seen_at)}</span>
                      </div>
                      {user.current_view && (
                        <p className="text-xs text-muted-foreground">
                          Просматривает: {user.current_view}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <Badge variant="outline" className="ml-2">
          {activeUsers.length} {activeUsers.length === 1 ? 'пользователь' : 'пользователей'}
        </Badge>
      </div>
    </div>
  );
}
