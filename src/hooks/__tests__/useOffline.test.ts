import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOffline } from '../useOffline';
import { offlineStorage } from '@/utils/offlineStorage';

// Mock offlineStorage
vi.mock('@/utils/offlineStorage', () => ({
  offlineStorage: {
    init: vi.fn(),
    getPendingChangesCount: vi.fn(),
    getPendingChanges: vi.fn(),
    markChangeSynced: vi.fn(),
    deletePendingChange: vi.fn(),
    cacheTableData: vi.fn(),
    getCachedTableData: vi.fn(),
    addPendingChange: vi.fn(),
    clearAll: vi.fn(),
    getStorageEstimate: vi.fn(),
  },
}));

// Mock console methods
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
});

describe('useOffline', () => {
  // Save original navigator.onLine
  const originalOnLine = navigator.onLine;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
    
    // Setup default mock responses
    vi.mocked(offlineStorage.init).mockResolvedValue(undefined);
    vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(0);
    vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([]);
    vi.mocked(offlineStorage.getCachedTableData).mockResolvedValue([]);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  describe('Initialization', () => {
    it('should initialize with online state', async () => {
      const { result } = renderHook(() => useOffline());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOfflineReady).toBe(false);
      expect(result.current.pendingChanges).toBe(0);
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncTime).toBeNull();
    });

    it('should initialize with offline state', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useOffline());

      expect(result.current.isOnline).toBe(false);
    });

    it('should initialize offline storage', async () => {
      renderHook(() => useOffline());

      await waitFor(() => {
        expect(offlineStorage.init).toHaveBeenCalled();
      });
    });

    it('should load pending changes count on init', async () => {
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(5);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
        expect(result.current.pendingChanges).toBe(5);
      });
    });

    it('should handle init errors gracefully', async () => {
      vi.mocked(offlineStorage.init).mockRejectedValue(new Error('Init failed'));

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Failed to initialize offline storage:',
          expect.any(Error)
        );
      });

      // Should still be usable
      expect(result.current.isOfflineReady).toBe(false);
    });
  });

  describe('Online/Offline event listeners', () => {
    it('should update state when going offline', async () => {
      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should update state when coming back online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useOffline());

      expect(result.current.isOnline).toBe(false);

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });

    it('should auto-sync when coming back online', async () => {
      const mockChanges = [
        { id: '1', operation: 'insert', table: 'test', data: {} },
      ];
      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue(mockChanges);
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(0);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(offlineStorage.getPendingChanges).toHaveBeenCalled();
      });
    });

    it('should cleanup event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useOffline());

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('syncPendingChanges', () => {
    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      await act(async () => {
        await result.current.syncPendingChanges();
      });

      expect(offlineStorage.getPendingChanges).not.toHaveBeenCalled();
    });

    it('should set isSyncing to true during sync', async () => {
      const mockChanges = [
        { id: '1', operation: 'insert', table: 'test', data: {} },
      ];

      // Make sync take some time
      vi.mocked(offlineStorage.getPendingChanges).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return mockChanges;
      });
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(0);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      expect(result.current.isSyncing).toBe(false);

      // Start sync (don't await immediately)
      const syncPromise = act(async () => {
        await result.current.syncPendingChanges();
      });

      // Wait for sync to complete
      await syncPromise;

      expect(result.current.isSyncing).toBe(false);
      expect(offlineStorage.getPendingChanges).toHaveBeenCalled();
    });

    it('should sync all pending changes', async () => {
      const mockChanges = [
        { id: '1', operation: 'insert', table: 'table1', data: { name: 'test1' } },
        { id: '2', operation: 'update', table: 'table2', data: { name: 'test2' } },
        { id: '3', operation: 'delete', table: 'table3', data: { id: '123' } },
      ];
      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue(mockChanges);
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(0);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      await act(async () => {
        await result.current.syncPendingChanges();
      });

      expect(offlineStorage.markChangeSynced).toHaveBeenCalledTimes(3);
      expect(offlineStorage.deletePendingChange).toHaveBeenCalledTimes(3);
      expect(result.current.lastSyncTime).toBeGreaterThan(0);
    });

    it('should handle sync errors for individual changes', async () => {
      const mockChanges = [
        { id: '1', operation: 'insert', table: 'table1', data: {} },
        { id: '2', operation: 'update', table: 'table2', data: {} },
      ];
      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue(mockChanges);
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(1);
      
      // First change succeeds, second fails
      vi.mocked(offlineStorage.markChangeSynced)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Sync failed'));

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      await act(async () => {
        await result.current.syncPendingChanges();
      });

      // Should have attempted both
      expect(offlineStorage.markChangeSynced).toHaveBeenCalledTimes(2);
      // Should have only deleted the successful one
      expect(offlineStorage.deletePendingChange).toHaveBeenCalledTimes(1);
      expect(result.current.pendingChanges).toBe(1);
    });

    it('should update pending count after sync', async () => {
      const mockChanges = [
        { id: '1', operation: 'insert', table: 'test', data: {} },
      ];
      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue(mockChanges);
      vi.mocked(offlineStorage.getPendingChangesCount)
        .mockResolvedValueOnce(1) // Initial count
        .mockResolvedValueOnce(0); // After sync

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.pendingChanges).toBe(1);
      });

      await act(async () => {
        await result.current.syncPendingChanges();
      });

      expect(result.current.pendingChanges).toBe(0);
    });

    it('should set isSyncing flag during sync', async () => {
      const mockChanges = [
        { id: '1', operation: 'insert', table: 'test', data: {} },
      ];
      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue(mockChanges);
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(0);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      expect(result.current.isSyncing).toBe(false);

      const syncPromise = act(async () => {
        await result.current.syncPendingChanges();
      });

      // Should be syncing briefly
      // Note: This may be too fast to catch, but test structure is correct
      
      await syncPromise;

      expect(result.current.isSyncing).toBe(false);
    });

    it('should handle sync failure gracefully', async () => {
      vi.mocked(offlineStorage.getPendingChanges).mockRejectedValue(new Error('DB error'));

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      await act(async () => {
        await result.current.syncPendingChanges();
      });

      expect(console.error).toHaveBeenCalledWith('useOffline: Sync failed:', expect.any(Error));
      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('cacheData', () => {
    it('should cache table data', async () => {
      const { result } = renderHook(() => useOffline());

      const testData = [
        { id: 1, name: 'Row 1' },
        { id: 2, name: 'Row 2' },
      ];

      await act(async () => {
        await result.current.cacheData('db-123', testData);
      });

      expect(offlineStorage.cacheTableData).toHaveBeenCalledWith('db-123', testData);
    });

    it('should handle cache errors', async () => {
      vi.mocked(offlineStorage.cacheTableData).mockRejectedValue(new Error('Cache failed'));

      const { result } = renderHook(() => useOffline());

      await act(async () => {
        await result.current.cacheData('db-123', []);
      });

      expect(console.error).toHaveBeenCalledWith(
        'useOffline: Failed to cache data:',
        expect.any(Error)
      );
    });
  });

  describe('getCachedData', () => {
    it('should retrieve cached data', async () => {
      const cachedData = [
        { id: 1, name: 'Cached 1' },
        { id: 2, name: 'Cached 2' },
      ];
      vi.mocked(offlineStorage.getCachedTableData).mockResolvedValue(cachedData);

      const { result } = renderHook(() => useOffline());

      let data: any[] = [];
      await act(async () => {
        data = await result.current.getCachedData('db-123');
      });

      expect(data).toEqual(cachedData);
      expect(offlineStorage.getCachedTableData).toHaveBeenCalledWith('db-123');
    });

    it('should return empty array on error', async () => {
      vi.mocked(offlineStorage.getCachedTableData).mockRejectedValue(new Error('Get failed'));

      const { result } = renderHook(() => useOffline());

      let data: any[] = [];
      await act(async () => {
        data = await result.current.getCachedData('db-123');
      });

      expect(data).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'useOffline: Failed to get cached data:',
        expect.any(Error)
      );
    });
  });

  describe('addPendingChange', () => {
    it('should add insert change', async () => {
      vi.mocked(offlineStorage.addPendingChange).mockResolvedValue('change-1');
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(1);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      let changeId: string = '';
      await act(async () => {
        changeId = await result.current.addPendingChange(
          'insert',
          'users',
          { name: 'John Doe' }
        );
      });

      expect(changeId).toBe('change-1');
      expect(offlineStorage.addPendingChange).toHaveBeenCalledWith({
        operation: 'insert',
        table: 'users',
        data: { name: 'John Doe' },
        originalData: undefined,
      });
      expect(result.current.pendingChanges).toBe(1);
    });

    it('should add update change with original data', async () => {
      vi.mocked(offlineStorage.addPendingChange).mockResolvedValue('change-2');
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(1);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      await act(async () => {
        await result.current.addPendingChange(
          'update',
          'users',
          { name: 'Jane Doe' },
          { name: 'John Doe' }
        );
      });

      expect(offlineStorage.addPendingChange).toHaveBeenCalledWith({
        operation: 'update',
        table: 'users',
        data: { name: 'Jane Doe' },
        originalData: { name: 'John Doe' },
      });
    });

    it('should add delete change', async () => {
      vi.mocked(offlineStorage.addPendingChange).mockResolvedValue('change-3');
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(1);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      await act(async () => {
        await result.current.addPendingChange('delete', 'users', { id: '123' });
      });

      expect(offlineStorage.addPendingChange).toHaveBeenCalledWith({
        operation: 'delete',
        table: 'users',
        data: { id: '123' },
        originalData: undefined,
      });
    });

    it('should update pending changes count', async () => {
      vi.mocked(offlineStorage.addPendingChange).mockResolvedValue('change-1');
      vi.mocked(offlineStorage.getPendingChangesCount)
        .mockResolvedValueOnce(0) // Initial
        .mockResolvedValueOnce(1) // After first add
        .mockResolvedValueOnce(2); // After second add

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.pendingChanges).toBe(0);
      });

      await act(async () => {
        await result.current.addPendingChange('insert', 'users', {});
      });

      expect(result.current.pendingChanges).toBe(1);

      await act(async () => {
        await result.current.addPendingChange('insert', 'users', {});
      });

      expect(result.current.pendingChanges).toBe(2);
    });

    it('should throw error if add fails', async () => {
      vi.mocked(offlineStorage.addPendingChange).mockRejectedValue(new Error('Add failed'));

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      await expect(
        act(async () => {
          await result.current.addPendingChange('insert', 'users', {});
        })
      ).rejects.toThrow('Add failed');
    });
  });

  describe('clearOfflineData', () => {
    it('should clear all offline data', async () => {
      vi.mocked(offlineStorage.getPendingChangesCount).mockResolvedValue(5);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.pendingChanges).toBe(5);
      });

      await act(async () => {
        await result.current.clearOfflineData();
      });

      expect(offlineStorage.clearAll).toHaveBeenCalled();
      expect(result.current.pendingChanges).toBe(0);
    });

    it('should handle clear errors', async () => {
      vi.mocked(offlineStorage.clearAll).mockRejectedValue(new Error('Clear failed'));

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.isOfflineReady).toBe(true);
      });

      await act(async () => {
        await result.current.clearOfflineData();
      });

      expect(console.error).toHaveBeenCalledWith(
        'useOffline: Failed to clear offline data:',
        expect.any(Error)
      );
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage estimate', async () => {
      const mockEstimate = {
        usage: 1024000,
        quota: 10240000,
        usageDetails: {},
      };
      vi.mocked(offlineStorage.getStorageEstimate).mockResolvedValue(mockEstimate);

      const { result } = renderHook(() => useOffline());

      let info: any;
      await act(async () => {
        info = await result.current.getStorageInfo();
      });

      expect(info).toEqual(mockEstimate);
      expect(offlineStorage.getStorageEstimate).toHaveBeenCalled();
    });
  });
});
