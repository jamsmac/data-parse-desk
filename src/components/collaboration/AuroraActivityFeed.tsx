/**
 * Aurora ActivityFeed - Лента активности с Aurora эффектами
 */

import { motion, AnimatePresence } from 'framer-motion';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from '@/components/aurora/core/GlassCard';
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
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { Activity } from '@/types/auth';

export interface AuroraActivityFeedProps {
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

const ACTION_COLORS = {
  create: {
    bg: 'from-green-500/20 to-emerald-500/20',
    text: 'text-green-400',
    ring: 'ring-green-500/30',
    glow: 'shadow-green-500/20',
  },
  update: {
    bg: 'from-blue-500/20 to-cyan-500/20',
    text: 'text-blue-400',
    ring: 'ring-blue-500/30',
    glow: 'shadow-blue-500/20',
  },
  delete: {
    bg: 'from-red-500/20 to-pink-500/20',
    text: 'text-red-400',
    ring: 'ring-red-500/30',
    glow: 'shadow-red-500/20',
  },
  import: {
    bg: 'from-purple-500/20 to-violet-500/20',
    text: 'text-purple-400',
    ring: 'ring-purple-500/30',
    glow: 'shadow-purple-500/20',
  },
  export: {
    bg: 'from-orange-500/20 to-amber-500/20',
    text: 'text-orange-400',
    ring: 'ring-orange-500/30',
    glow: 'shadow-orange-500/20',
  },
  share: {
    bg: 'from-cyan-500/20 to-teal-500/20',
    text: 'text-cyan-400',
    ring: 'ring-cyan-500/30',
    glow: 'shadow-cyan-500/20',
  },
};

export function AuroraActivityFeed({ activities, limit }: AuroraActivityFeedProps) {
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

  return (
    <GlassCard variant="elevated" intensity="medium" className="overflow-hidden">
      <GlassCardHeader className="relative">
        <div className="absolute -top-2 -left-2 w-40 h-40 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-3xl" />
        <GlassCardTitle gradient className="flex items-center gap-2 relative z-10">
          <TrendingUp className="h-5 w-5" />
          Лента активности
          {activities.length > 0 && (
            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
              {activities.length}
            </Badge>
          )}
        </GlassCardTitle>
      </GlassCardHeader>

      <GlassCardContent>
        {displayActivities.length > 0 ? (
          <ScrollArea className={limit ? 'h-[400px]' : 'h-[600px]'}>
            <div className="space-y-3 pr-4">
              <AnimatePresence mode="popLayout">
                {displayActivities.map((activity, index) => {
                  const ActionIcon = ACTION_ICONS[activity.action];
                  const EntityIcon = ENTITY_ICONS[activity.entity_type];
                  const colors = ACTION_COLORS[activity.action];

                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      className="group relative"
                    >
                      {/* Hover glow effect */}
                      <div className={`absolute inset-0 bg-gradient-to-r ${colors.bg} rounded-lg opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />

                      <div className="relative flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
                        {/* Avatar with action badge */}
                        <div className="relative flex-shrink-0">
                          <Avatar className={`h-10 w-10 ring-2 ${colors.ring}`}>
                            <AvatarImage src={activity.user.avatar_url} />
                            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white text-xs">
                              {getInitials(activity.user.full_name, activity.user.email)}
                            </AvatarFallback>
                          </Avatar>

                          {/* Action icon badge */}
                          <div
                            className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center bg-gradient-to-br ${colors.bg} ring-2 ring-gray-900 ${colors.glow} shadow-lg`}
                          >
                            <ActionIcon className={`h-3 w-3 ${colors.text}`} />
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-relaxed">
                                <span className="font-medium text-gray-200">
                                  {activity.user.full_name || activity.user.email}
                                </span>{' '}
                                <span className="text-gray-400">
                                  {ACTION_LABELS[activity.action]}
                                </span>{' '}
                                <span className="font-medium text-gray-200">
                                  {ENTITY_LABELS[activity.entity_type]}
                                </span>
                                {activity.entity_name && (
                                  <>
                                    {' '}
                                    <span className="text-gray-400">«</span>
                                    <span className={`font-medium ${colors.text}`}>
                                      {activity.entity_name}
                                    </span>
                                    <span className="text-gray-400">»</span>
                                  </>
                                )}
                              </p>

                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {formatDate(activity.created_at)}
                                </span>
                                {EntityIcon && (
                                  <>
                                    <span className="text-gray-600">•</span>
                                    <EntityIcon className="h-3 w-3 text-gray-500" />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Changes details */}
                          {activity.changes && Object.keys(activity.changes).length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="mt-2 p-2 rounded bg-black/20 border border-white/5 backdrop-blur-sm space-y-1"
                            >
                              {Object.entries(activity.changes).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-2 text-xs">
                                  <span className="text-gray-400 font-medium min-w-[80px]">
                                    {key}:
                                  </span>
                                  <span className="font-mono text-cyan-400 flex-1 break-all">
                                    {typeof value === 'object'
                                      ? JSON.stringify(value)
                                      : String(value)}
                                  </span>
                                </div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </ScrollArea>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-cyan-500/5 rounded-lg blur-2xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-cyan-500/20 mb-4">
                <ActivityIcon className="h-10 w-10 text-purple-400" />
              </div>
              <p className="text-gray-400 font-medium mb-1">Нет активности</p>
              <p className="text-sm text-gray-500">История действий появится здесь</p>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-purple-400">
                <Sparkles className="h-3 w-3" />
                <span>Начните работу с базой данных</span>
              </div>
            </div>
          </motion.div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
