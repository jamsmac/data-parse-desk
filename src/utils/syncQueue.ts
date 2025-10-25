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
  retryCount?: number;
  lastRetryAt?: number;
}

interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Sync Queue Manager
 * Handles synchronization of offline changes to Supabase with exponential backoff retry logic
 */
export class SyncQueueManager {
  private isSyncing = false;
  private syncCallbacks: Array<(result: SyncResult) => void> = [];

  // Retry configuration
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRY_DELAY = 60000; // 60 seconds
  private readonly BACKOFF_MULTIPLIER = 2;

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

      // Process each change with retry logic
      for (const change of pendingChanges) {
        try {
          await this.syncChangeWithRetry(change);
          await offlineStorage.markChangeSynced(change.id);
          await offlineStorage.deletePendingChange(change.id);
          result.syncedCount++;
          console.log(`SyncQueue: Synced change ${change.id}`);
        } catch (error: unknown) {
          const retryCount = change.retryCount || 0;

          // Check if we should retry
          if (retryCount < this.MAX_RETRY_ATTEMPTS && this.isRetryableError(error)) {
            // Update retry count and schedule for later
            await this.updateRetryInfo(change.id, retryCount + 1);
            console.warn(
              `SyncQueue: Failed to sync ${change.id} (attempt ${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS}), will retry later`
            );
            // Don't count as failed yet - will retry
          } else {
            // Max retries reached or non-retryable error
            result.failedCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            result.errors.push({
              id: change.id,
              error: `${errorMessage} (after ${retryCount} retries)`,
            });
            console.error(`SyncQueue: Failed to sync change ${change.id} after ${retryCount} retries:`, error);
            // Keep in queue for manual intervention or later retry
          }
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
   * Sync a single change with exponential backoff retry
   */
  private async syncChangeWithRetry(change: SyncOperation): Promise<void> {
    const retryCount = change.retryCount || 0;
    const delay = this.calculateBackoffDelay(retryCount);

    // If this is a retry, wait for the backoff delay
    if (retryCount > 0 && change.lastRetryAt) {
      const timeSinceLastRetry = Date.now() - change.lastRetryAt;
      const remainingDelay = Math.max(0, delay - timeSinceLastRetry);

      if (remainingDelay > 0) {
        console.log(`SyncQueue: Waiting ${remainingDelay}ms before retry ${retryCount}`);
        await this.sleep(remainingDelay);
      }
    }

    // Attempt to sync
    await this.syncChange(change);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(retryCount: number): number {
    const delay = this.INITIAL_RETRY_DELAY * Math.pow(this.BACKOFF_MULTIPLIER, retryCount);
    return Math.min(delay, this.MAX_RETRY_DELAY);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return true;

    const message = error.message.toLowerCase();

    // Network errors - retryable
    if (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('fetch')
    ) {
      return true;
    }

    // Rate limiting - retryable
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // Temporary server errors - retryable
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }

    // Conflict errors - not retryable (need manual resolution)
    if (message.includes('conflict')) {
      return false;
    }

    // Validation errors - not retryable
    if (
      message.includes('invalid') ||
      message.includes('validation') ||
      message.includes('duplicate key') ||
      message.includes('foreign key')
    ) {
      return false;
    }

    // Default: retryable
    return true;
  }

  /**
   * Update retry information for a change
   */
  private async updateRetryInfo(changeId: string, retryCount: number): Promise<void> {
    await offlineStorage.updateRetryInfo(changeId, retryCount, Date.now());
    console.log(`SyncQueue: Updated retry count for ${changeId} to ${retryCount}`);
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
