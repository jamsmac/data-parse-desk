import { supabase } from '@/integrations/supabase/client';
import { offlineStorage } from './offlineStorage';
import { TableRow } from '@/types/database';

interface SyncOperation {
  id: string;
  operation: 'insert' | 'update' | 'delete';
  table: string;
  data: TableRow;
  originalData?: TableRow;
  timestamp: number;
}

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Sync Queue Manager
 * Handles synchronization of offline changes to Supabase
 */
export class SyncQueueManager {
  private isSyncing = false;
  private syncCallbacks: Array<(result: SyncResult) => void> = [];

  /**
   * Add a callback to be called after sync completes
   */
  onSyncComplete(callback: (result: SyncResult) => void) {
    this.syncCallbacks.push(callback);
  }

  /**
   * Check if currently syncing
   */
  get syncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Sync all pending changes to Supabase
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      console.log('SyncQueue: Already syncing, skipping...');
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    // Check if online
    if (!navigator.onLine) {
      console.log('SyncQueue: Offline, cannot sync');
      return { success: false, syncedCount: 0, failedCount: 0, errors: [] };
    }

    this.isSyncing = true;
    console.log('SyncQueue: Starting sync...');

    try {
      const pendingChanges = await offlineStorage.getPendingChanges();
      console.log(`SyncQueue: Found ${pendingChanges.length} pending changes`);

      if (pendingChanges.length === 0) {
        this.isSyncing = false;
        return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
      }

      // Sort by timestamp (oldest first)
      pendingChanges.sort((a, b) => a.timestamp - b.timestamp);

      const result: SyncResult = {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        errors: [],
      };

      // Process each change
      for (const change of pendingChanges) {
        try {
          await this.syncChange(change);
          await offlineStorage.markChangeSynced(change.id);
          await offlineStorage.deletePendingChange(change.id);
          result.syncedCount++;
          console.log(`SyncQueue: Synced change ${change.id}`);
        } catch (error: unknown) {
          result.failedCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          result.errors.push({
            id: change.id,
            error: errorMessage,
          });
          console.error(`SyncQueue: Failed to sync change ${change.id}:`, error);
        }
      }

      result.success = result.failedCount === 0;
      console.log(
        `SyncQueue: Sync completed. Synced: ${result.syncedCount}, Failed: ${result.failedCount}`
      );

      // Call callbacks
      this.syncCallbacks.forEach((callback) => callback(result));

      this.isSyncing = false;
      return result;
    } catch (error) {
      console.error('SyncQueue: Sync error:', error);
      this.isSyncing = false;
      return {
        success: false,
        syncedCount: 0,
        failedCount: 0,
        errors: [{ id: 'unknown', error: String(error) }],
      };
    }
  }

  /**
   * Sync a single change to Supabase
   */
  private async syncChange(change: SyncOperation): Promise<void> {
    const { operation, table, data, originalData } = change;

    switch (operation) {
      case 'insert':
        await this.syncInsert(table, data);
        break;

      case 'update':
        await this.syncUpdate(table, data, originalData);
        break;

      case 'delete':
        await this.syncDelete(table, data);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Sync INSERT operation
   */
  private async syncInsert(table: string, data: TableRow): Promise<void> {
    const { error } = await supabase.from(table).insert(data);

    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
  }

  /**
   * Sync UPDATE operation
   */
  private async syncUpdate(table: string, data: TableRow, originalData?: TableRow): Promise<void> {
    if (!data.id) {
      throw new Error('Update requires id field');
    }

    // Check if record still exists and hasn't been modified
    if (originalData) {
      const { data: currentData, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', data.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // Record doesn't exist anymore, treat as insert
          await this.syncInsert(table, data);
          return;
        }
        throw new Error(`Fetch failed: ${fetchError.message}`);
      }

      // Check for conflicts (basic version comparison)
      if (currentData.updated_at && originalData.updated_at) {
        if (new Date(currentData.updated_at) > new Date(originalData.updated_at)) {
          console.warn(
            `SyncQueue: Conflict detected for ${table}/${data.id}, server version is newer`
          );
          // For now, server wins - in future implement conflict resolution UI
          throw new Error('Conflict: Server version is newer');
        }
      }
    }

    const { error } = await supabase.from(table).update(data).eq('id', data.id);

    if (error) {
      throw new Error(`Update failed: ${error.message}`);
    }
  }

  /**
   * Sync DELETE operation
   */
  private async syncDelete(table: string, data: TableRow): Promise<void> {
    if (!data.id) {
      throw new Error('Delete requires id field');
    }

    const { error } = await supabase.from(table).delete().eq('id', data.id);

    if (error) {
      // If record doesn't exist, consider it a success
      if (error.code === 'PGRST116') {
        console.log(`SyncQueue: Record ${data.id} already deleted on server`);
        return;
      }
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Queue a change for later sync
   */
  async queueChange(
    operation: 'insert' | 'update' | 'delete',
    table: string,
    data: Record<string, unknown>,
    originalData?: Record<string, unknown>
  ): Promise<string> {
    const changeId = await offlineStorage.addPendingChange({
      operation,
      table,
      data,
      originalData,
    });

    console.log(`SyncQueue: Queued ${operation} on ${table} (id: ${changeId})`);

    // Auto-sync if online
    if (navigator.onLine && !this.isSyncing) {
      setTimeout(() => this.syncAll(), 1000);
    }

    return changeId;
  }

  /**
   * Clear all pending changes (use with caution!)
   */
  async clearQueue(): Promise<void> {
    const pendingChanges = await offlineStorage.getPendingChanges();

    for (const change of pendingChanges) {
      await offlineStorage.deletePendingChange(change.id);
    }

    console.log(`SyncQueue: Cleared ${pendingChanges.length} pending changes`);
  }
}

// Export singleton instance
export const syncQueue = new SyncQueueManager();
