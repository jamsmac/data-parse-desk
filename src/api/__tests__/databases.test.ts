/**
 * Unit tests for Database API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { databaseApi, schemaApi, rowApi, statsApi } from '../databases';
import type { Database, TableSchema, TableRow } from '@/types/database';

// Mock API client
vi.mock('../client', () => ({
  apiClient: {
    rpc: vi.fn(),
    query: vi.fn(),
    mutate: vi.fn(),
    getClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

describe('Database API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('databaseApi', () => {
    describe('getDatabase', () => {
      it('should call RPC with correct params', async () => {
        const { apiClient } = await import('../client');
        const mockDatabase: Database = {
          id: 'db-123',
          user_id: 'user-1',
          name: 'Test DB',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        };

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: mockDatabase,
        });

        const result = await databaseApi.getDatabase('db-123');

        expect(apiClient.rpc).toHaveBeenCalledWith('get_database', {
          p_id: 'db-123',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockDatabase);
        }
      });
    });

    describe('getDatabases', () => {
      it('should query databases for user', async () => {
        const { apiClient } = await import('../client');
        const mockDatabases: Database[] = [
          {
            id: 'db-1',
            user_id: 'user-1',
            name: 'DB 1',
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
          },
          {
            id: 'db-2',
            user_id: 'user-1',
            name: 'DB 2',
            created_at: '2025-01-02',
            updated_at: '2025-01-02',
          },
        ];

        vi.mocked(apiClient.query).mockResolvedValue({
          success: true,
          data: mockDatabases,
        });

        const result = await databaseApi.getDatabases('user-1');

        expect(apiClient.query).toHaveBeenCalled();
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockDatabases);
        }
      });
    });

    describe('createDatabase', () => {
      it('should create new database', async () => {
        const { apiClient } = await import('../client');
        const newDatabase = {
          user_id: 'user-1',
          project_id: 'proj-1',
          name: 'New DB',
          description: 'Test database',
        };

        const createdDatabase: Database = {
          ...newDatabase,
          id: 'db-new',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        };

        vi.mocked(apiClient.mutate).mockResolvedValue({
          success: true,
          data: createdDatabase,
        });

        const result = await databaseApi.createDatabase(newDatabase);

        expect(apiClient.mutate).toHaveBeenCalled();
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('New DB');
        }
      });
    });

    describe('updateDatabase', () => {
      it('should update database fields', async () => {
        const { apiClient } = await import('../client');
        const updates = {
          name: 'Updated Name',
          description: 'Updated description',
        };

        vi.mocked(apiClient.mutate).mockResolvedValue({
          success: true,
          data: { id: 'db-123', ...updates } as Database,
        });

        const result = await databaseApi.updateDatabase('db-123', updates);

        expect(apiClient.mutate).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('deleteDatabase', () => {
      it('should delete database', async () => {
        const { apiClient } = await import('../client');

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: undefined,
        });

        const result = await databaseApi.deleteDatabase('db-123');

        expect(apiClient.rpc).toHaveBeenCalledWith('delete_database', {
          p_id: 'db-123',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('clearDatabase', () => {
      it('should clear database data', async () => {
        const { apiClient } = await import('../client');

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: undefined,
        });

        const result = await databaseApi.clearDatabase('db-123');

        expect(apiClient.rpc).toHaveBeenCalledWith('clear_database_data', {
          p_database_id: 'db-123',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('duplicateDatabase', () => {
      it('should duplicate database with new name', async () => {
        const { apiClient } = await import('../client');
        const duplicatedDb: Database = {
          id: 'db-copy',
          user_id: 'user-1',
          name: 'Copy of DB',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        };

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: duplicatedDb,
        });

        const result = await databaseApi.duplicateDatabase('db-123', 'Copy of DB');

        expect(apiClient.rpc).toHaveBeenCalledWith('duplicate_database', {
          p_database_id: 'db-123',
          p_new_name: 'Copy of DB',
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('schemaApi', () => {
    describe('getSchemas', () => {
      it('should get table schemas for database', async () => {
        const { apiClient } = await import('../client');
        const mockSchemas: TableSchema[] = [
          {
            id: 'col-1',
            database_id: 'db-123',
            column_name: 'Name',
            column_type: 'text',
            is_required: false,
            position: 0,
            created_at: '2025-01-01',
            updated_at: '2025-01-01',
          },
        ];

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: mockSchemas,
        });

        const result = await schemaApi.getSchemas('db-123');

        expect(apiClient.rpc).toHaveBeenCalledWith('get_table_schemas', {
          p_database_id: 'db-123',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(mockSchemas);
        }
      });
    });

    describe('createColumn', () => {
      it('should create new column', async () => {
        const { apiClient } = await import('../client');
        const newColumn = {
          database_id: 'db-123',
          column_name: 'Email',
          column_type: 'email' as const,
          is_required: true,
          position: 1,
        };

        vi.mocked(apiClient.mutate).mockResolvedValue({
          success: true,
          data: { ...newColumn, id: 'col-new' } as TableSchema,
        });

        const result = await schemaApi.createColumn(newColumn);

        expect(apiClient.mutate).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('updateColumn', () => {
      it('should update column properties', async () => {
        const { apiClient } = await import('../client');
        const updates = {
          column_name: 'Updated Name',
          is_required: true,
        };

        vi.mocked(apiClient.mutate).mockResolvedValue({
          success: true,
          data: { id: 'col-123', ...updates } as TableSchema,
        });

        const result = await schemaApi.updateColumn('col-123', updates);

        expect(apiClient.mutate).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('deleteColumn', () => {
      it('should delete column', async () => {
        const { apiClient } = await import('../client');

        vi.mocked(apiClient.mutate).mockResolvedValue({
          success: true,
          data: undefined,
        });

        const result = await schemaApi.deleteColumn('col-123');

        expect(apiClient.mutate).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('reorderColumns', () => {
      it('should reorder columns', async () => {
        const { apiClient } = await import('../client');
        const columnOrder = [
          { id: 'col-1', position: 0 },
          { id: 'col-2', position: 1 },
        ];

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: undefined,
        });

        const result = await schemaApi.reorderColumns('db-123', columnOrder);

        expect(apiClient.rpc).toHaveBeenCalledWith('reorder_columns', {
          p_database_id: 'db-123',
          p_column_order: columnOrder,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('rowApi', () => {
    describe('getRows', () => {
      it('should get rows with pagination and filters', async () => {
        const { apiClient } = await import('../client');
        const mockResponse = {
          rows: [
            { id: 'row-1', data: { name: 'John' } },
            { id: 'row-2', data: { name: 'Jane' } },
          ],
          total: 2,
        };

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: mockResponse,
        });

        const result = await rowApi.getRows({
          databaseId: 'db-123',
          page: 1,
          pageSize: 50,
          filters: [{ field: 'name', operator: 'contains', value: 'J' }],
          sort: { field: 'name', direction: 'asc' },
        });

        expect(apiClient.rpc).toHaveBeenCalled();
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.rows).toHaveLength(2);
          expect(result.data.total).toBe(2);
        }
      });
    });

    describe('insertRow', () => {
      it('should insert new row', async () => {
        const { apiClient } = await import('../client');
        const rowData = { name: 'John', age: 30 };
        const newRow: TableRow = {
          id: 'row-new',
          data: rowData,
          created_at: '2025-01-01',
        };

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: newRow,
        });

        const result = await rowApi.insertRow('db-123', rowData);

        expect(apiClient.rpc).toHaveBeenCalledWith('insert_table_row', {
          p_database_id: 'db-123',
          p_data: rowData,
        });
        expect(result.success).toBe(true);
      });
    });

    describe('updateRow', () => {
      it('should update row data', async () => {
        const { apiClient } = await import('../client');
        const updates = { name: 'Updated Name' };

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: { id: 'row-123', data: updates } as TableRow,
        });

        const result = await rowApi.updateRow('row-123', updates);

        expect(apiClient.rpc).toHaveBeenCalledWith('update_table_row', {
          p_id: 'row-123',
          p_data: updates,
        });
        expect(result.success).toBe(true);
      });
    });

    describe('deleteRow', () => {
      it('should delete row', async () => {
        const { apiClient } = await import('../client');

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: undefined,
        });

        const result = await rowApi.deleteRow('row-123');

        expect(apiClient.rpc).toHaveBeenCalledWith('delete_table_row', {
          p_id: 'row-123',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('bulkInsert', () => {
      it('should insert multiple rows', async () => {
        const { apiClient } = await import('../client');
        const rows = [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ];

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: [],
        });

        const result = await rowApi.bulkInsert('db-123', rows);

        expect(apiClient.rpc).toHaveBeenCalledWith('bulk_insert_rows', {
          p_database_id: 'db-123',
          p_rows: rows,
        });
        expect(result.success).toBe(true);
      });
    });

    describe('bulkDelete', () => {
      it('should delete multiple rows', async () => {
        const { apiClient } = await import('../client');
        const rowIds = ['row-1', 'row-2', 'row-3'];

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: undefined,
        });

        const result = await rowApi.bulkDelete(rowIds);

        expect(apiClient.rpc).toHaveBeenCalledWith('bulk_delete_rows', {
          p_row_ids: rowIds,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('statsApi', () => {
    describe('getStats', () => {
      it('should get database statistics', async () => {
        const { apiClient } = await import('../client');
        const mockStats = {
          rowCount: 100,
          columnCount: 5,
          lastUpdated: '2025-01-01',
          storageSize: 1024,
        };

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await statsApi.getStats('db-123');

        expect(apiClient.rpc).toHaveBeenCalledWith('get_database_stats', {
          p_database_id: 'db-123',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.rowCount).toBe(100);
        }
      });
    });

    describe('getColumnStats', () => {
      it('should get column statistics', async () => {
        const { apiClient } = await import('../client');
        const mockStats = {
          uniqueValues: 50,
          nullCount: 5,
          distribution: { value1: 10, value2: 20 },
        };

        vi.mocked(apiClient.rpc).mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await statsApi.getColumnStats('db-123', 'name');

        expect(apiClient.rpc).toHaveBeenCalledWith('get_column_stats', {
          p_database_id: 'db-123',
          p_column_name: 'name',
        });
        expect(result.success).toBe(true);
      });
    });
  });
});
