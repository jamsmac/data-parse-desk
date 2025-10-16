import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getDatabaseActivities,
  getUserActivities,
  getAllActivities,
  logActivity,
  getEntityActivities,
  getFilteredActivities,
  getActivityStats,
  subscribeToActivities,
} from '@/api/activityAPI';
import type { Activity } from '@/types/auth';

/**
 * Hook для работы с активностью базы данных
 */
export function useActivity(databaseId: string, options?: { limit?: number }) {
  const queryClient = useQueryClient();
  const { limit = 50 } = options || {};

  // Получение активности
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activities', databaseId, limit],
    queryFn: () => getDatabaseActivities(databaseId, limit),
    enabled: !!databaseId,
  });

  // Получение статистики
  const { data: stats } = useQuery({
    queryKey: ['activities', 'stats', databaseId],
    queryFn: () => getActivityStats(databaseId),
    enabled: !!databaseId,
  });

  // Логирование активности
  const logActivityMutation = useMutation({
    mutationFn: (params: {
      action: Activity['action'];
      entityType: Activity['entity_type'];
      entityId: string;
      entityName?: string;
      changes?: Record<string, unknown>;
    }) =>
      logActivity(
        databaseId,
        params.action,
        params.entityType,
        params.entityId,
        params.entityName,
        params.changes
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['activities', 'stats', databaseId] });
    },
  });

  // Real-time подписка
  useEffect(() => {
    if (!databaseId) return;

    const subscription = subscribeToActivities(databaseId, (newActivity) => {
      queryClient.setQueryData<Activity[]>(
        ['activities', databaseId, limit],
        (old = []) => [newActivity, ...old].slice(0, limit)
      );
      queryClient.invalidateQueries({ queryKey: ['activities', 'stats', databaseId] });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [databaseId, limit, queryClient]);

  return {
    activities,
    stats,
    isLoading,
    error,
    logActivity: logActivityMutation.mutateAsync,
  };
}

/**
 * Hook для работы с активностью пользователя
 */
export function useUserActivity(options?: { limit?: number }) {
  const { limit = 50 } = options || {};

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activities', 'user', limit],
    queryFn: () => getUserActivities(limit),
  });

  return {
    activities,
    isLoading,
    error,
  };
}

/**
 * Hook для работы с активностью конкретной сущности
 */
export function useEntityActivity(
  entityType: Activity['entity_type'],
  entityId: string
) {
  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activities', 'entity', entityType, entityId],
    queryFn: () => getEntityActivities(entityType, entityId),
    enabled: !!entityType && !!entityId,
  });

  return {
    activities,
    isLoading,
    error,
  };
}

/**
 * Hook для работы с фильтрованной активностью
 */
export function useFilteredActivity(
  databaseId: string,
  filters: {
    action?: Activity['action'];
    entityType?: Activity['entity_type'];
    startDate?: string;
    endDate?: string;
  },
  options?: { limit?: number }
) {
  const { limit = 50 } = options || {};

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activities', 'filtered', databaseId, filters, limit],
    queryFn: () => getFilteredActivities(databaseId, filters, limit),
    enabled: !!databaseId,
  });

  return {
    activities,
    isLoading,
    error,
  };
}

/**
 * Hook для получения глобальной активности
 */
export function useAllActivities(options?: { limit?: number }) {
  const { limit = 50 } = options || {};

  const { data: activities = [], isLoading, error } = useQuery({
    queryKey: ['activities', 'all', limit],
    queryFn: () => getAllActivities(limit),
  });

  return {
    activities,
    isLoading,
    error,
  };
}
