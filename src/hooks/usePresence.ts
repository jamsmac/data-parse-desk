import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UserPresence {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  current_view: string | null;
  current_row_id: string | null;
  current_cell_column: string | null;
  cursor_x: number | null;
  cursor_y: number | null;
  status: 'active' | 'idle' | 'away';
  last_seen_at: string;
}

interface PresenceContext {
  projectId?: string;
  databaseId?: string;
  view?: string;
  rowId?: string;
  cellColumn?: string;
}

/**
 * Hook for real-time user presence tracking
 */
export function usePresence(context: PresenceContext) {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const cursorPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update presence on server
  const updatePresence = useCallback(async (
    updates: Partial<{
      view: string;
      rowId: string;
      cellColumn: string;
      cursorX: number;
      cursorY: number;
      status: 'active' | 'idle' | 'away';
    }> = {}
  ) => {
    if (!context.databaseId) return;

    try {
      await supabase.rpc('update_presence', {
        p_project_id: context.projectId || null,
        p_database_id: context.databaseId,
        p_current_view: updates.view || context.view || null,
        p_current_row_id: updates.rowId || context.rowId || null,
        p_current_cell_column: updates.cellColumn || context.cellColumn || null,
        p_cursor_x: updates.cursorX !== undefined ? updates.cursorX : cursorPositionRef.current.x,
        p_cursor_y: updates.cursorY !== undefined ? updates.cursorY : cursorPositionRef.current.y,
        p_status: updates.status || 'active',
      });
    } catch (error) {
      console.error('Failed to update presence:', error);
    }
  }, [context]);

  // Track cursor position
  const updateCursor = useCallback((x: number, y: number) => {
    cursorPositionRef.current = { x, y };
    // Throttled update (only send every 100ms)
    updatePresence({ cursorX: x, cursorY: y });
  }, [updatePresence]);

  // Fetch active users
  const fetchActiveUsers = useCallback(async () => {
    if (!context.databaseId) return;

    try {
      const { data, error } = await supabase.rpc('get_active_users', {
        p_database_id: context.databaseId,
        p_max_idle_minutes: 5,
      });

      if (error) throw error;
      setActiveUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch active users:', error);
    } finally {
      setLoading(false);
    }
  }, [context.databaseId]);

  // Setup realtime subscription
  useEffect(() => {
    if (!context.databaseId) return;

    const channel = supabase
      .channel(`presence:${context.databaseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `database_id=eq.${context.databaseId}`,
        },
        (payload) => {
          console.log('Presence update:', payload);
          // Refetch active users when presence changes
          fetchActiveUsers();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [context.databaseId, fetchActiveUsers]);

  // Initial presence update and fetch
  useEffect(() => {
    updatePresence();
    fetchActiveUsers();
  }, [context.databaseId]);

  // Heartbeat to keep presence alive
  useEffect(() => {
    if (!context.databaseId) return;

    // Update presence every 30 seconds
    const heartbeat = setInterval(() => {
      updatePresence({ status: 'active' });
    }, 30000);

    heartbeatRef.current = heartbeat;

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [context.databaseId, updatePresence]);

  // Track user activity (keyboard, mouse)
  useEffect(() => {
    let idleTimeout: NodeJS.Timeout;

    const resetIdleTimer = () => {
      if (idleTimeout) clearTimeout(idleTimeout);

      // Set status to idle after 2 minutes of inactivity
      idleTimeout = setTimeout(() => {
        updatePresence({ status: 'idle' });
      }, 120000);
    };

    const handleActivity = () => {
      updatePresence({ status: 'active' });
      resetIdleTimer();
    };

    // Listen for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    resetIdleTimer();

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (idleTimeout) clearTimeout(idleTimeout);
    };
  }, [updatePresence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Set status to away when leaving
      if (context.databaseId) {
        updatePresence({ status: 'away' });
      }
    };
  }, [context.databaseId]);

  // Get users editing a specific cell
  const getUsersEditingCell = useCallback((column: string, rowId: string) => {
    return activeUsers.filter(
      (user) =>
        user.current_cell_column === column &&
        user.current_row_id === rowId &&
        user.status === 'active'
    );
  }, [activeUsers]);

  // Get users viewing a specific row
  const getUsersViewingRow = useCallback((rowId: string) => {
    return activeUsers.filter(
      (user) =>
        user.current_row_id === rowId &&
        user.status === 'active'
    );
  }, [activeUsers]);

  return {
    activeUsers,
    loading,
    updatePresence,
    updateCursor,
    getUsersEditingCell,
    getUsersViewingRow,
  };
}
