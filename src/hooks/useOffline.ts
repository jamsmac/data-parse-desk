import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '@/utils/offlineStorage';

interface OfflineState {
  isOnline: boolean;
  isOfflineReady: boolean;
  pendingChanges: number;
  isSyncing: boolean;
  lastSyncTime: number | null;
}

/**
 * Hook for managing offline state and synchronization
 */
export function useOffline() {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isOfflineReady: false,
    pendingChanges: 0,
    isSyncing: false,
    lastSyncTime: null,
  });

  // Initialize offline storage
  useEffect(() => {
    const initOfflineStorage = async () => {
      try {
        await offlineStorage.init();
        const count = await offlineStorage.getPendingChangesCount();
        setState((prev) => ({
          ...prev,
          isOfflineReady: true,
          pendingChanges: count,
        }));
      } catch (error) {
        console.error('Failed to initialize offline storage:', error);
      }
    };

    initOfflineStorage();
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('useOffline: Network status changed to ONLINE');
      setState((prev) => ({ ...prev, isOnline: true }));
      // Auto-sync when coming back online
      syncPendingChanges();
    };

    const handleOffline = () => {
      console.log('useOffline: Network status changed to OFFLINE');
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync pending changes to server
  const syncPendingChanges = useCallback(async () => {
    if (!state.isOnline || state.isSyncing) return;

    setState((prev) => ({ ...prev, isSyncing: true }));

    try {
      const pendingChanges = await offlineStorage.getPendingChanges();
      console.log(`useOffline: Syncing ${pendingChanges.length} pending changes`);

      let syncedCount = 0;
      let errorCount = 0;

      for (const change of pendingChanges) {
        try {
          // TODO: Implement actual sync logic based on operation type
          // For now, just mark as synced
          await offlineStorage.markChangeSynced(change.id);
          await offlineStorage.deletePendingChange(change.id);
          syncedCount++;
        } catch (error) {
          console.error(`Failed to sync change ${change.id}:`, error);
          errorCount++;
        }
      }

      const remainingCount = await offlineStorage.getPendingChangesCount();

      setState((prev) => ({
        ...prev,
        isSyncing: false,
        pendingChanges: remainingCount,
        lastSyncTime: Date.now(),
      }));

      console.log(`useOffline: Sync completed. Synced: ${syncedCount}, Errors: ${errorCount}, Remaining: ${remainingCount}`);
    } catch (error) {
      console.error('useOffline: Sync failed:', error);
      setState((prev) => ({ ...prev, isSyncing: false }));
    }
  }, [state.isOnline, state.isSyncing]);

  // Cache data for offline use
  const cacheData = useCallback(async (databaseId: string, data: any[]) => {
    try {
      await offlineStorage.cacheTableData(databaseId, data);
      console.log(`useOffline: Cached ${data.length} rows for offline access`);
    } catch (error) {
      console.error('useOffline: Failed to cache data:', error);
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback(async (databaseId: string): Promise<any[]> => {
    try {
      const data = await offlineStorage.getCachedTableData(databaseId);
      console.log(`useOffline: Retrieved ${data.length} cached rows`);
      return data;
    } catch (error) {
      console.error('useOffline: Failed to get cached data:', error);
      return [];
    }
  }, []);

  // Add pending change
  const addPendingChange = useCallback(async (
    operation: 'insert' | 'update' | 'delete',
    table: string,
    data: any,
    originalData?: any
  ) => {
    try {
      const changeId = await offlineStorage.addPendingChange({
        operation,
        table,
        data,
        originalData,
      });

      const count = await offlineStorage.getPendingChangesCount();
      setState((prev) => ({ ...prev, pendingChanges: count }));

      console.log(`useOffline: Added pending ${operation} on ${table}`);
      return changeId;
    } catch (error) {
      console.error('useOffline: Failed to add pending change:', error);
      throw error;
    }
  }, []);

  // Clear all offline data
  const clearOfflineData = useCallback(async () => {
    try {
      await offlineStorage.clearAll();
      setState((prev) => ({ ...prev, pendingChanges: 0 }));
      console.log('useOffline: Cleared all offline data');
    } catch (error) {
      console.error('useOffline: Failed to clear offline data:', error);
    }
  }, []);

  // Get storage estimate
  const getStorageInfo = useCallback(async () => {
    return await offlineStorage.getStorageEstimate();
  }, []);

  return {
    ...state,
    syncPendingChanges,
    cacheData,
    getCachedData,
    addPendingChange,
    clearOfflineData,
    getStorageInfo,
  };
}
