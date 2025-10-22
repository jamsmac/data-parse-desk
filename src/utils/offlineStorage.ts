/**
 * Offline Storage using IndexedDB
 * Stores data, pending changes, and sync queue for offline mode
 */

const DB_NAME = 'DataParseDeskOffline';
const DB_VERSION = 1;

// Store names
const STORES = {
  TABLE_DATA: 'table_data',
  DATABASES: 'databases',
  SCHEMAS: 'table_schemas',
  PENDING_CHANGES: 'pending_changes',
  SYNC_QUEUE: 'sync_queue',
} as const;

interface PendingChange {
  id: string;
  timestamp: number;
  operation: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  originalData?: any;
  synced: boolean;
  error?: string;
}

interface SyncQueueItem {
  id: string;
  timestamp: number;
  priority: number;
  retryCount: number;
  maxRetries: number;
  operation: () => Promise<any>;
  onSuccess?: (result: any) => void;
  onError?: (error: Error) => void;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('OfflineStorage: IndexedDB initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.TABLE_DATA)) {
          const tableDataStore = db.createObjectStore(STORES.TABLE_DATA, { keyPath: 'id' });
          tableDataStore.createIndex('database_id', 'database_id', { unique: false });
          tableDataStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.DATABASES)) {
          const dbStore = db.createObjectStore(STORES.DATABASES, { keyPath: 'id' });
          dbStore.createIndex('project_id', 'project_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SCHEMAS)) {
          const schemaStore = db.createObjectStore(STORES.SCHEMAS, { keyPath: 'id' });
          schemaStore.createIndex('database_id', 'database_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PENDING_CHANGES)) {
          const changesStore = db.createObjectStore(STORES.PENDING_CHANGES, { keyPath: 'id' });
          changesStore.createIndex('timestamp', 'timestamp', { unique: false });
          changesStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          queueStore.createIndex('priority', 'priority', { unique: false });
          queueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        console.log('OfflineStorage: Object stores created');
      };
    });

    return this.initPromise;
  }

  /**
   * Get object store
   */
  private getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): IDBObjectStore {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // ==================== TABLE DATA ====================

  /**
   * Cache table data for offline access
   */
  async cacheTableData(databaseId: string, rows: any[]): Promise<void> {
    await this.init();
    const store = this.getStore(STORES.TABLE_DATA, 'readwrite');

    const promises = rows.map((row) => {
      const request = store.put({
        ...row,
        database_id: databaseId,
        cached_at: Date.now(),
      });

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log(`OfflineStorage: Cached ${rows.length} rows for database ${databaseId}`);
  }

  /**
   * Get cached table data
   */
  async getCachedTableData(databaseId: string): Promise<any[]> {
    await this.init();
    const store = this.getStore(STORES.TABLE_DATA);
    const index = store.index('database_id');
    const request = index.getAll(databaseId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear cached table data for a database
   */
  async clearCachedTableData(databaseId: string): Promise<void> {
    await this.init();
    const store = this.getStore(STORES.TABLE_DATA, 'readwrite');
    const index = store.index('database_id');
    const request = index.openCursor(IDBKeyRange.only(databaseId));

    return new Promise((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== DATABASES ====================

  /**
   * Cache database metadata
   */
  async cacheDatabases(databases: any[]): Promise<void> {
    await this.init();
    const store = this.getStore(STORES.DATABASES, 'readwrite');

    const promises = databases.map((db) => {
      const request = store.put({
        ...db,
        cached_at: Date.now(),
      });

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log(`OfflineStorage: Cached ${databases.length} databases`);
  }

  /**
   * Get cached databases
   */
  async getCachedDatabases(): Promise<any[]> {
    await this.init();
    const store = this.getStore(STORES.DATABASES);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== SCHEMAS ====================

  /**
   * Cache table schemas
   */
  async cacheSchemas(databaseId: string, schemas: any[]): Promise<void> {
    await this.init();
    const store = this.getStore(STORES.SCHEMAS, 'readwrite');

    const promises = schemas.map((schema) => {
      const request = store.put({
        ...schema,
        database_id: databaseId,
        cached_at: Date.now(),
      });

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log(`OfflineStorage: Cached ${schemas.length} schemas for database ${databaseId}`);
  }

  /**
   * Get cached schemas
   */
  async getCachedSchemas(databaseId: string): Promise<any[]> {
    await this.init();
    const store = this.getStore(STORES.SCHEMAS);
    const index = store.index('database_id');
    const request = index.getAll(databaseId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== PENDING CHANGES ====================

  /**
   * Add a pending change to sync queue
   */
  async addPendingChange(change: Omit<PendingChange, 'id' | 'timestamp' | 'synced'>): Promise<string> {
    await this.init();
    const store = this.getStore(STORES.PENDING_CHANGES, 'readwrite');

    const pendingChange: PendingChange = {
      ...change,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      synced: false,
    };

    return new Promise((resolve, reject) => {
      const request = store.add(pendingChange);
      request.onsuccess = () => {
        console.log('OfflineStorage: Added pending change:', pendingChange.id);
        resolve(pendingChange.id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all pending changes (unsynced)
   */
  async getPendingChanges(): Promise<PendingChange[]> {
    await this.init();
    const store = this.getStore(STORES.PENDING_CHANGES);
    const index = store.index('synced');
    const request = index.getAll(false);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Mark a change as synced
   */
  async markChangeSynced(changeId: string): Promise<void> {
    await this.init();
    const store = this.getStore(STORES.PENDING_CHANGES, 'readwrite');
    const request = store.get(changeId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const change = request.result;
        if (change) {
          change.synced = true;
          const updateRequest = store.put(change);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete a synced change
   */
  async deletePendingChange(changeId: string): Promise<void> {
    await this.init();
    const store = this.getStore(STORES.PENDING_CHANGES, 'readwrite');
    const request = store.delete(changeId);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get pending changes count
   */
  async getPendingChangesCount(): Promise<number> {
    await this.init();
    const store = this.getStore(STORES.PENDING_CHANGES);
    const index = store.index('synced');
    const request = index.count(false);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== UTILITIES ====================

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    await this.init();
    const storeNames = Object.values(STORES);

    const promises = storeNames.map((storeName) => {
      const store = this.getStore(storeName, 'readwrite');
      const request = store.clear();

      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    console.log('OfflineStorage: Cleared all cached data');
  }

  /**
   * Get storage size estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number; usagePercent: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usagePercent: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
      };
    }
    return { usage: 0, quota: 0, usagePercent: 0 };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
      console.log('OfflineStorage: Database connection closed');
    }
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorage();
