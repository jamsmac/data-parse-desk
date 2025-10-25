/**
 * usePresence Hook - Real-time User Presence Tracking
 *
 * Fixed version with:
 * - Memory leak prevention
 * - Reconnection logic
 * - Cleanup on unmount
 * - Debounced cursor updates
 */

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

interface PresenceUpdate {
  view?: string;
  rowId?: string;
  cellColumn?: string;
  cursorX?: number;
  cursorY?: number;
  status?: 'active' | 'idle' | 'away';
}

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const IDLE_TIMEOUT = 120000; // 2 minutes
const CURSOR_THROTTLE = 100; // 100ms between cursor updates

/**
 * Hook for real-time user presence tracking
 */
export function usePresence(context: PresenceContext) {
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);

  // Refs to prevent memory leaks
  const mountedRef = useRef(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cursorThrottleRef = useRef<NodeJS.Timeout | null>(null);
  const cursorPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Stable reference to context values
  const contextRef = useRef(context);
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  /**
   * Update presence on server
   * Uses mounted check to prevent updates after unmount
   */
  const updatePresence = useCallback(async (updates: PresenceUpdate = {}) => {
    if (!mountedRef.current || !contextRef.current.databaseId) {
      return;
    }

    try {
      await supabase.rpc('update_presence', {
        p_project_id: contextRef.current.projectId || null,
        p_database_id: contextRef.current.databaseId,
        p_current_view: updates.view || contextRef.current.view || null,
        p_current_row_id: updates.rowId || contextRef.current.rowId || null,
        p_current_cell_column: updates.cellColumn || contextRef.current.cellColumn || null,
        p_cursor_x: updates.cursorX !== undefined ? updates.cursorX : cursorPositionRef.current.x,
        p_cursor_y: updates.cursorY !== undefined ? updates.cursorY : cursorPositionRef.current.y,
        p_status: updates.status || 'active',
      });
    } catch (error) {
      if (mountedRef.current) {
        console.error('Failed to update presence:', error);
      }
    }
  }, []);

  /**
   * Track cursor position with throttling
   */
  const updateCursor = useCallback((x: number, y: number) => {
    cursorPositionRef.current = { x, y };

    // Throttle cursor updates
    if (cursorThrottleRef.current) {
      return;
    }

    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
      if (mountedRef.current) {
        updatePresence({ cursorX: x, cursorY: y });
      }
    }, CURSOR_THROTTLE);
  }, [updatePresence]);

  /**
   * Fetch active users with mounted check
   */
  const fetchActiveUsers = useCallback(async () => {
    if (!mountedRef.current || !contextRef.current.databaseId) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_active_users', {
        p_database_id: contextRef.current.databaseId,
        p_max_idle_minutes: 5,
      });

      if (error) throw error;

      if (mountedRef.current) {
        setActiveUsers(data || []);
      }
    } catch (error) {
      if (mountedRef.current) {
        console.error('Failed to fetch active users:', error);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * Setup realtime subscription with reconnection logic
   */
  useEffect(() => {
    if (!context.databaseId) {
      return;
    }

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectDelay = 2000;

    const setupChannel = () => {
      if (!mountedRef.current) {
        return;
      }

      const channel = supabase
        .channel(`presence:${context.databaseId}`, {
          config: {
            broadcast: { self: false },
            presence: { key: 'user_id' },
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_presence',
            filter: `database_id=eq.${context.databaseId}`,
          },
          (payload) => {
            if (mountedRef.current) {
              console.log('Presence update:', payload);
              fetchActiveUsers();
            }
          }
        )
        .subscribe((status) => {
          if (!mountedRef.current) {
            return;
          }

          if (status === 'SUBSCRIBED') {
            console.log('Presence subscription active');
            reconnectAttempts = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error('Presence subscription error:', status);

            // Attempt reconnection with exponential backoff
            if (reconnectAttempts < maxReconnectAttempts) {
              const delay = reconnectDelay * Math.pow(2, reconnectAttempts);
              reconnectAttempts++;

              setTimeout(() => {
                if (mountedRef.current && channelRef.current) {
                  console.log(`Attempting reconnection (${reconnectAttempts}/${maxReconnectAttempts})...`);
                  channelRef.current.unsubscribe();
                  setupChannel();
                }
              }, delay);
            }
          }
        });

      channelRef.current = channel;
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [context.databaseId, fetchActiveUsers]);

  /**
   * Initial presence update and fetch
   */
  useEffect(() => {
    if (context.databaseId) {
      updatePresence();
      fetchActiveUsers();
    }
  }, [context.databaseId, updatePresence, fetchActiveUsers]);

  /**
   * Heartbeat to keep presence alive
   */
  useEffect(() => {
    if (!context.databaseId) {
      return;
    }

    const heartbeat = setInterval(() => {
      if (mountedRef.current) {
        updatePresence({ status: 'active' });
      }
    }, HEARTBEAT_INTERVAL);

    heartbeatRef.current = heartbeat;

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    };
  }, [context.databaseId, updatePresence]);

  /**
   * Track user activity with idle detection
   */
  useEffect(() => {
    const resetIdleTimer = () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }

      // Set status to idle after inactivity
      idleTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          updatePresence({ status: 'idle' });
        }
      }, IDLE_TIMEOUT);
    };

    const handleActivity = () => {
      if (mountedRef.current) {
        updatePresence({ status: 'active' });
        resetIdleTimer();
      }
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

      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [updatePresence]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      mountedRef.current = false;

      // Clear all timers
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      if (cursorThrottleRef.current) {
        clearTimeout(cursorThrottleRef.current);
      }

      // Set status to away when leaving
      if (context.databaseId) {
        // Fire and forget - don't wait for response
        supabase.rpc('update_presence', {
          p_project_id: context.projectId || null,
          p_database_id: context.databaseId,
          p_current_view: null,
          p_current_row_id: null,
          p_current_cell_column: null,
          p_cursor_x: null,
          p_cursor_y: null,
          p_status: 'away',
        }).catch(console.error);
      }
    };
  }, [context.databaseId, context.projectId]);

  /**
   * Get users editing a specific cell
   */
  const getUsersEditingCell = useCallback((column: string, rowId: string): UserPresence[] => {
    return activeUsers.filter(
      (user) =>
        user.current_cell_column === column &&
        user.current_row_id === rowId &&
        user.status === 'active'
    );
  }, [activeUsers]);

  /**
   * Get users viewing a specific row
   */
  const getUsersViewingRow = useCallback((rowId: string): UserPresence[] => {
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
