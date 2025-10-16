import { supabase } from '@/integrations/supabase/client';
import type { Activity } from '@/types/auth';

/**
 * API для работы с активностью (журнал действий)
 */

// Получить активность для конкретной базы данных
export async function getDatabaseActivities(
  databaseId: string,
  limit = 50
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role
      )
    `)
    .eq('database_id', databaseId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching database activities:', error);
    throw error;
  }

  return data || [];
}

// Получить всю активность пользователя
export async function getUserActivities(limit = 50): Promise<Activity[]> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role
      )
    `)
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching user activities:', error);
    throw error;
  }

  return data || [];
}

// Получить глобальную активность (все базы данных пользователя)
export async function getAllActivities(limit = 50): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role
      )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching all activities:', error);
    throw error;
  }

  return data || [];
}

// Логировать активность
export async function logActivity(
  databaseId: string,
  action: Activity['action'],
  entityType: Activity['entity_type'],
  entityId: string,
  entityName?: string,
  changes?: Record<string, any>
): Promise<Activity> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: user.user.id,
      database_id: databaseId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      changes,
    })
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role
      )
    `)
    .single();

  if (error) {
    console.error('Error logging activity:', error);
    throw error;
  }

  return data;
}

// Получить активность по конкретной сущности
export async function getEntityActivities(
  entityType: Activity['entity_type'],
  entityId: string
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role
      )
    `)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching entity activities:', error);
    throw error;
  }

  return data || [];
}

// Получить активность с фильтрацией
export async function getFilteredActivities(
  databaseId: string,
  filters: {
    action?: Activity['action'];
    entityType?: Activity['entity_type'];
    startDate?: string;
    endDate?: string;
  },
  limit = 50
): Promise<Activity[]> {
  let query = supabase
    .from('activities')
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role
      )
    `)
    .eq('database_id', databaseId);

  if (filters.action) {
    query = query.eq('action', filters.action);
  }

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching filtered activities:', error);
    throw error;
  }

  return data || [];
}

// Подписаться на активность (real-time)
export function subscribeToActivities(
  databaseId: string,
  callback: (activity: Activity) => void
) {
  return supabase
    .channel(`activities:${databaseId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activities',
        filter: `database_id=eq.${databaseId}`,
      },
      (payload) => {
        callback(payload.new as Activity);
      }
    )
    .subscribe();
}

// Удалить старые записи активности (для очистки)
export async function deleteOldActivities(daysToKeep = 90): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const { error } = await supabase
    .from('activities')
    .delete()
    .lt('created_at', cutoffDate.toISOString());

  if (error) {
    console.error('Error deleting old activities:', error);
    throw error;
  }
}

// Получить статистику активности
export async function getActivityStats(
  databaseId: string,
  days = 30
): Promise<{
  totalActions: number;
  actionsByType: Record<Activity['action'], number>;
  activeUsers: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('activities')
    .select('action, user_id')
    .eq('database_id', databaseId)
    .gte('created_at', startDate.toISOString());

  if (error) {
    console.error('Error fetching activity stats:', error);
    throw error;
  }

  const totalActions = data?.length || 0;
  const actionsByType: Record<Activity['action'], number> = {
    create: 0,
    update: 0,
    delete: 0,
    import: 0,
    export: 0,
    share: 0,
  };
  const uniqueUsers = new Set<string>();

  data?.forEach((activity) => {
    actionsByType[activity.action as Activity['action']]++;
    uniqueUsers.add(activity.user_id);
  });

  return {
    totalActions,
    actionsByType,
    activeUsers: uniqueUsers.size,
  };
}
