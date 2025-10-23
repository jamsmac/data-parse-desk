/**
 * Comprehensive tests for SyncQueue utility
 * Tests for offline-to-online data synchronization
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SyncQueueManager } from '../syncQueue';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('../offlineStorage', () => ({
  offlineStorage: {
    getPendingChanges: vi.fn(),
    addPendingChange: vi.fn(),
    markChangeSynced: vi.fn(),
    deletePendingChange: vi.fn(),
  },
}));

import { supabase } from '@/integrations/supabase/client';
import { offlineStorage } from '../offlineStorage';

// ============================================================================
// Test Setup
// ============================================================================

describe('SyncQueueManager', () => {
  let syncQueue: SyncQueueManager;
  let originalNavigator: Navigator;

  beforeEach(() => {
    // Create fresh instance
    syncQueue = new SyncQueueManager();

    // Reset all mocks
    vi.clearAllMocks();

    // Save original navigator
    originalNavigator = global.navigator;

    // Mock navigator.onLine
    Object.defineProperty(global, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Restore navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  // ============================================================================
  // Basic Functionality Tests
  // ============================================================================

  describe('Basic functionality', () => {
    it('should create instance', () => {
      expect(syncQueue).toBeDefined();
      expect(syncQueue.syncing).toBe(false);
    });

    it('should track syncing state', () => {
      expect(syncQueue.syncing).toBe(false);
    });

    it('should allow registering sync callbacks', () => {
      const callback = vi.fn();
      syncQueue.onSyncComplete(callback);

      // Callback is registered (will be called after sync)
      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // SyncAll Tests
  // ============================================================================

  describe('syncAll', () => {
    it('should return early if already syncing', async () => {
      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([
        {
          id: '1',
          operation: 'insert',
          table: 'test',
          data: {},
          timestamp: Date.now(),
          synced: false,
        },
      ]);

      // Start first sync
      const promise1 = syncQueue.syncAll();

      // Try to start second sync while first is running
      const result2 = await syncQueue.syncAll();

      expect(result2.success).toBe(false);
      expect(result2.syncedCount).toBe(0);

      await promise1;
    });

    it('should return early if offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        writable: true,
      });

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(offlineStorage.getPendingChanges).not.toHaveBeenCalled();
    });

    it('should return success if no pending changes', async () => {
      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([]);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(0);
    });

    it('should sync pending changes in order (oldest first)', async () => {
      const changes = [
        {
          id: '1',
          operation: 'insert' as const,
          table: 'test',
          data: { id: '1' },
          timestamp: 300,
          synced: false,
        },
        {
          id: '2',
          operation: 'update' as const,
          table: 'test',
          data: { id: '2' },
          timestamp: 100,
          synced: false,
        },
        {
          id: '3',
          operation: 'delete' as const,
          table: 'test',
          data: { id: '3' },
          timestamp: 200,
          synced: false,
        },
      ];

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue(changes);

      // Mock supabase operations
      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: {}, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: {}, error: null }),
          }),
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(3);
      expect(result.failedCount).toBe(0);

      // Verify sorted by timestamp
      expect(offlineStorage.markChangeSynced).toHaveBeenNthCalledWith(1, '2'); // timestamp 100
      expect(offlineStorage.markChangeSynced).toHaveBeenNthCalledWith(2, '3'); // timestamp 200
      expect(offlineStorage.markChangeSynced).toHaveBeenNthCalledWith(3, '1'); // timestamp 300
    });

    it('should call sync callbacks after completion', async () => {
      // Need at least one change for callbacks to be called
      const change = {
        id: '1',
        operation: 'insert' as const,
        table: 'test',
        data: { id: '1' },
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      // Register callbacks before sync
      syncQueue.onSyncComplete(callback1);
      syncQueue.onSyncComplete(callback2);

      const result = await syncQueue.syncAll();

      // Verify callbacks were called with result
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback1).toHaveBeenCalledWith(result);
      expect(callback2).toHaveBeenCalledWith(result);

      expect(result).toEqual({
        success: true,
        syncedCount: 1,
        failedCount: 0,
        errors: [],
      });
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(offlineStorage.getPendingChanges).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain('Storage error');
    });
  });

  // ============================================================================
  // INSERT Operation Tests
  // ============================================================================

  describe('syncInsert', () => {
    it('should sync INSERT operation successfully', async () => {
      const change = {
        id: '1',
        operation: 'insert' as const,
        table: 'test_table',
        data: { id: '1', name: 'Test' },
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(mockInsert).toHaveBeenCalledWith({ id: '1', name: 'Test' });
    });

    it('should handle INSERT errors', async () => {
      const change = {
        id: '1',
        operation: 'insert' as const,
        table: 'test_table',
        data: { id: '1' },
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Duplicate key' },
      });
      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].error).toContain('Duplicate key');
    });
  });

  // ============================================================================
  // UPDATE Operation Tests
  // ============================================================================

  describe('syncUpdate', () => {
    it('should sync UPDATE operation successfully', async () => {
      const change = {
        id: '1',
        operation: 'update' as const,
        table: 'test_table',
        data: { id: '1', name: 'Updated' },
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const mockEq = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith({ id: '1', name: 'Updated' });
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    it('should require id field for UPDATE', async () => {
      const change = {
        id: '1',
        operation: 'update' as const,
        table: 'test_table',
        data: { name: 'No ID' }, // Missing id field
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].error).toContain('requires id field');
    });

    it('should handle conflict detection with originalData', async () => {
      const change = {
        id: '1',
        operation: 'update' as const,
        table: 'test_table',
        data: { id: '1', name: 'Updated' },
        originalData: { id: '1', name: 'Original', updated_at: '2024-01-01T00:00:00Z' },
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      // Server has newer version
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: '1', name: 'Server Version', updated_at: '2024-01-02T00:00:00Z' },
        error: null,
      });

      const mockEqForSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqForSelect });
      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
      } as any);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].error).toContain('Conflict');
    });

    it('should convert to INSERT if record does not exist', async () => {
      const change = {
        id: '1',
        operation: 'update' as const,
        table: 'test_table',
        data: { id: '1', name: 'Updated' },
        originalData: { id: '1', name: 'Original' },
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Record not found
      });

      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockEqForSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqForSelect });

      vi.mocked(supabase.from).mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      } as any);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(mockInsert).toHaveBeenCalledWith({ id: '1', name: 'Updated' });
    });
  });

  // ============================================================================
  // DELETE Operation Tests
  // ============================================================================

  describe('syncDelete', () => {
    it('should sync DELETE operation successfully', async () => {
      const change = {
        id: '1',
        operation: 'delete' as const,
        table: 'test_table',
        data: { id: '1' },
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const mockEq = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
      expect(mockEq).toHaveBeenCalledWith('id', '1');
    });

    it('should require id field for DELETE', async () => {
      const change = {
        id: '1',
        operation: 'delete' as const,
        table: 'test_table',
        data: {}, // Missing id field
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].error).toContain('requires id field');
    });

    it('should succeed if record already deleted on server', async () => {
      const change = {
        id: '1',
        operation: 'delete' as const,
        table: 'test_table',
        data: { id: '1' },
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const mockEq = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Record not found
      });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
    });
  });

  // ============================================================================
  // Queue Change Tests
  // ============================================================================

  describe('queueChange', () => {
    it('should queue an INSERT change', async () => {
      vi.mocked(offlineStorage.addPendingChange).mockResolvedValue('change-1');

      const changeId = await syncQueue.queueChange('insert', 'test_table', {
        id: '1',
        name: 'Test',
      });

      expect(changeId).toBe('change-1');
      expect(offlineStorage.addPendingChange).toHaveBeenCalledWith({
        operation: 'insert',
        table: 'test_table',
        data: { id: '1', name: 'Test' },
        originalData: undefined,
      });
    });

    it('should queue an UPDATE change with originalData', async () => {
      vi.mocked(offlineStorage.addPendingChange).mockResolvedValue('change-2');

      const changeId = await syncQueue.queueChange(
        'update',
        'test_table',
        { id: '1', name: 'Updated' },
        { id: '1', name: 'Original' }
      );

      expect(changeId).toBe('change-2');
      expect(offlineStorage.addPendingChange).toHaveBeenCalledWith({
        operation: 'update',
        table: 'test_table',
        data: { id: '1', name: 'Updated' },
        originalData: { id: '1', name: 'Original' },
      });
    });

    it('should queue a DELETE change', async () => {
      vi.mocked(offlineStorage.addPendingChange).mockResolvedValue('change-3');

      const changeId = await syncQueue.queueChange('delete', 'test_table', {
        id: '1',
      });

      expect(changeId).toBe('change-3');
      expect(offlineStorage.addPendingChange).toHaveBeenCalledWith({
        operation: 'delete',
        table: 'test_table',
        data: { id: '1' },
        originalData: undefined,
      });
    });

    it('should auto-sync if online and not syncing', async () => {
      vi.mocked(offlineStorage.addPendingChange).mockResolvedValue('change-1');
      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([]);

      vi.useFakeTimers();

      await syncQueue.queueChange('insert', 'test', { id: '1' });

      // Fast forward timer
      vi.advanceTimersByTime(1000);

      // Wait for async operations
      await vi.waitFor(() => {
        expect(offlineStorage.getPendingChanges).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should not auto-sync if offline', async () => {
      Object.defineProperty(global.navigator, 'onLine', {
        value: false,
        writable: true,
      });

      vi.mocked(offlineStorage.addPendingChange).mockResolvedValue('change-1');
      vi.useFakeTimers();

      await syncQueue.queueChange('insert', 'test', { id: '1' });

      vi.advanceTimersByTime(2000);

      expect(offlineStorage.getPendingChanges).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // ============================================================================
  // Clear Queue Tests
  // ============================================================================

  describe('clearQueue', () => {
    it('should clear all pending changes', async () => {
      const changes = [
        {
          id: '1',
          operation: 'insert' as const,
          table: 'test',
          data: {},
          timestamp: Date.now(),
          synced: false,
        },
        {
          id: '2',
          operation: 'update' as const,
          table: 'test',
          data: {},
          timestamp: Date.now(),
          synced: false,
        },
      ];

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue(changes);

      await syncQueue.clearQueue();

      expect(offlineStorage.deletePendingChange).toHaveBeenCalledTimes(2);
      expect(offlineStorage.deletePendingChange).toHaveBeenNthCalledWith(1, '1');
      expect(offlineStorage.deletePendingChange).toHaveBeenNthCalledWith(2, '2');
    });

    it('should handle empty queue', async () => {
      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([]);

      await syncQueue.clearQueue();

      expect(offlineStorage.deletePendingChange).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle unknown operation type', async () => {
      const change = {
        id: '1',
        operation: 'unknown' as any,
        table: 'test',
        data: {},
        timestamp: Date.now(),
        synced: false,
      };

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue([change]);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0].error).toContain('Unknown operation');
    });

    it('should handle partial sync (some succeed, some fail)', async () => {
      const changes = [
        {
          id: '1',
          operation: 'insert' as const,
          table: 'test',
          data: { id: '1' },
          timestamp: 1,
          synced: false,
        },
        {
          id: '2',
          operation: 'update' as const,
          table: 'test',
          data: {}, // Missing id - will fail
          timestamp: 2,
          synced: false,
        },
        {
          id: '3',
          operation: 'delete' as const,
          table: 'test',
          data: { id: '3' },
          timestamp: 3,
          synced: false,
        },
      ];

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue(changes);

      const mockEq = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
        delete: mockDelete,
      } as any);

      const result = await syncQueue.syncAll();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].id).toBe('2');
    });

    it('should continue processing after individual failures', async () => {
      const changes = [
        {
          id: '1',
          operation: 'insert' as const,
          table: 'test',
          data: { id: '1' },
          timestamp: 1,
          synced: false,
        },
        {
          id: '2',
          operation: 'insert' as const,
          table: 'test',
          data: { id: '2' },
          timestamp: 2,
          synced: false,
        },
      ];

      vi.mocked(offlineStorage.getPendingChanges).mockResolvedValue(changes);

      let callCount = 0;
      const mockInsert = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First insert fails
          return Promise.resolve({ data: null, error: { message: 'Error' } });
        }
        // Second insert succeeds
        return Promise.resolve({ data: {}, error: null });
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await syncQueue.syncAll();

      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });
  });
});
