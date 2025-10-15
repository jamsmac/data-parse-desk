import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseAPI } from '../databaseAPI';
import { Database, TableSchema } from '@/types/database';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

import { supabase } from '@/integrations/supabase/client';

// Type-safe mock helper
const mockRPC = vi.mocked(supabase.rpc);

describe('DatabaseAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createDatabase', () => {
    it('должен создать новую базу данных', async () => {
      const mockDatabase: Database = {
        id: '1',
        name: 'Test DB',
        description: 'Test Description',
        icon: '📊',
        color: '#000000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'user123'
      };

      mockRPC.mockResolvedValue({
        data: mockDatabase,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.createDatabase({
        name: 'Test DB',
        description: 'Test Description',
        icon: '📊',
        color: '#000000',
        user_id: 'user123'
      });

      expect(result).toEqual(mockDatabase);
      expect(supabase.rpc).toHaveBeenCalledWith('create_database', {
        name: 'Test DB',
        description: 'Test Description',
        icon: '📊',
        color: '#000000',
        user_id: 'user123'
      });
    });

    it('должен выбросить ошибку при неудачном создании', async () => {
      const mockError = new Error('Database creation failed');
      mockRPC.mockResolvedValue({
        data: null,
        error: mockError,
        count: null,
        status: 400,
        statusText: 'Bad Request'
      } as never);

      await expect(
        DatabaseAPI.createDatabase({
          name: 'Test DB',
          user_id: 'user123'
        })
      ).rejects.toThrow('Database creation failed');
    });
  });

  describe('getDatabases', () => {
    it('должен получить список баз данных пользователя', async () => {
      const mockDatabases: Database[] = [
        {
          id: '1',
          name: 'DB 1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 'user123'
        },
        {
          id: '2',
          name: 'DB 2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 'user123'
        }
      ];

      mockRPC.mockResolvedValue({
        data: mockDatabases,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.getDatabases('user123');
      expect(result).toEqual(mockDatabases);
      expect(supabase.rpc).toHaveBeenCalledWith('get_user_databases', {
        p_user_id: 'user123'
      });
    });

    it('должен вернуть пустой массив при отсутствии данных', async () => {
      mockRPC.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.getDatabases('user123');
      expect(result).toEqual([]);
    });
  });

  describe('getDatabase', () => {
    it('должен получить конкретную базу данных', async () => {
      const mockDatabase: Database = {
        id: '1',
        name: 'Test DB',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'user123'
      };

      mockRPC.mockResolvedValue({
        data: mockDatabase,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.getDatabase('1');
      expect(result).toEqual(mockDatabase);
      expect(supabase.rpc).toHaveBeenCalledWith('get_database', { p_id: '1' });
    });
  });

  describe('updateDatabase', () => {
    it('должен обновить базу данных', async () => {
      const updates: Partial<Database> = { name: 'Updated Name' };
      const mockUpdatedDatabase: Database = {
        id: '1',
        name: 'Updated Name',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'user123'
      };

      mockRPC.mockResolvedValue({
        data: mockUpdatedDatabase,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.updateDatabase('1', updates);
      expect(result).toEqual(mockUpdatedDatabase);
      expect(supabase.rpc).toHaveBeenCalledWith('update_database', {
        p_id: '1',
        p_updates: updates
      });
    });
  });

  describe('deleteDatabase', () => {
    it('должен удалить базу данных', async () => {
      mockRPC.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      await DatabaseAPI.deleteDatabase('1');
      expect(supabase.rpc).toHaveBeenCalledWith('delete_database', { p_id: '1' });
    });
  });

  describe('createTableSchema', () => {
    it('должен создать схему таблицы', async () => {
      const mockSchema: TableSchema = {
        id: 'schema1',
        database_id: 'db1',
        column_name: 'name',
        column_type: 'text',
        is_required: true,
        position: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockRPC.mockResolvedValue({
        data: mockSchema,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.createTableSchema({
        database_id: 'db1',
        column_name: 'name',
        column_type: 'text',
        is_required: true
      });

      expect(result).toEqual(mockSchema);
    });
  });

  describe('getTableSchemas', () => {
    it('должен получить схемы таблиц', async () => {
      const mockSchemas: TableSchema[] = [
        {
          id: 'schema1',
          database_id: 'db1',
          column_name: 'name',
          column_type: 'text',
          is_required: true,
          position: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'schema2',
          database_id: 'db1',
          column_name: 'age',
          column_type: 'number',
          is_required: false,
          position: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      mockRPC.mockResolvedValue({
        data: mockSchemas,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.getTableSchemas('db1');
      expect(result).toEqual(mockSchemas);
    });

    it('должен вернуть пустой массив при отсутствии схем', async () => {
      mockRPC.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.getTableSchemas('db1');
      expect(result).toEqual([]);
    });
  });

  describe('getTableData', () => {
    it('должен получить данные таблицы', async () => {
      const mockData = {
        data: [
          { id: '1', name: 'John', age: 30 },
          { id: '2', name: 'Jane', age: 25 }
        ],
        total: 2
      };

      mockRPC.mockResolvedValue({
        data: mockData,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.getTableData('db1');
      expect(result).toEqual(mockData);
    });

    it('должен применить фильтры и сортировку', async () => {
      const mockData = { data: [], total: 0 };
      mockRPC.mockResolvedValue({
        data: mockData,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const filters = { name: 'John' };
      const sorting = { column: 'age', direction: 'asc' as const };
      const pagination = { page: 1, pageSize: 10 };

      await DatabaseAPI.getTableData('db1', filters, sorting, pagination);

      expect(supabase.rpc).toHaveBeenCalledWith('get_table_data', {
        p_database_id: 'db1',
        p_filters: filters,
        p_sorting: sorting,
        p_pagination: pagination
      });
    });

    it('должен вернуть пустой результат при отсутствии данных', async () => {
      mockRPC.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.getTableData('db1');
      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  describe('insertTableRow', () => {
    it('должен вставить строку в таблицу', async () => {
      const rowData = { name: 'John', age: 30 };
      const mockResponse = { id: '1', ...rowData };

      mockRPC.mockResolvedValue({
        data: mockResponse,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.insertTableRow('db1', rowData);
      expect(result).toEqual(mockResponse);
      expect(supabase.rpc).toHaveBeenCalledWith('insert_table_row', {
        p_database_id: 'db1',
        p_row_data: rowData
      });
    });
  });

  describe('updateTableRow', () => {
    it('должен обновить строку в таблице', async () => {
      const updates = { name: 'Jane' };
      const mockResponse = { id: '1', name: 'Jane', age: 30 };

      mockRPC.mockResolvedValue({
        data: mockResponse,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.updateTableRow('db1', '1', updates);
      expect(result).toEqual(mockResponse);
      expect(supabase.rpc).toHaveBeenCalledWith('update_table_row', {
        p_database_id: 'db1',
        p_row_id: '1',
        p_updates: updates
      });
    });
  });

  describe('deleteTableRow', () => {
    it('должен удалить строку из таблицы', async () => {
      mockRPC.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      await DatabaseAPI.deleteTableRow('db1', '1');
      expect(supabase.rpc).toHaveBeenCalledWith('delete_table_row', {
        p_database_id: 'db1',
        p_row_id: '1'
      });
    });
  });

  describe('bulkInsertTableRows', () => {
    it('должен вставить множество строк', async () => {
      const rows = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 }
      ];
      const mockResponse = [
        { id: '1', name: 'John', age: 30 },
        { id: '2', name: 'Jane', age: 25 }
      ];

      mockRPC.mockResolvedValue({
        data: mockResponse,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.bulkInsertTableRows('db1', rows);
      expect(result).toEqual(mockResponse);
    });

    it('должен вернуть пустой массив при отсутствии данных', async () => {
      mockRPC.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.bulkInsertTableRows('db1', []);
      expect(result).toEqual([]);
    });
  });

  describe('bulkDeleteTableRows', () => {
    it('должен удалить множество строк', async () => {
      mockRPC.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      await DatabaseAPI.bulkDeleteTableRows('db1', ['1', '2', '3']);
      expect(supabase.rpc).toHaveBeenCalledWith('bulk_delete_table_rows', {
        p_database_id: 'db1',
        p_row_ids: ['1', '2', '3']
      });
    });
  });

  describe('getDatabaseStats', () => {
    it('должен получить статистику базы данных', async () => {
      const mockStats = {
        rowCount: 100,
        lastUpdated: new Date().toISOString()
      };

      mockRPC.mockResolvedValue({
        data: mockStats,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.getDatabaseStats('db1');
      expect(result).toEqual(mockStats);
    });

    it('должен вернуть значения по умолчанию при отсутствии данных', async () => {
      mockRPC.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await DatabaseAPI.getDatabaseStats('db1');
      expect(result.rowCount).toBe(0);
      expect(result.lastUpdated).toBeTruthy();
    });
  });

  describe('reorderColumns', () => {
    it('должен переупорядочить колонки', async () => {
      const columnOrder = [
        { id: 'col1', position: 0 },
        { id: 'col2', position: 1 },
        { id: 'col3', position: 2 }
      ];

      mockRPC.mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      await DatabaseAPI.reorderColumns('db1', columnOrder);
      expect(supabase.rpc).toHaveBeenCalledWith('reorder_columns', {
        p_database_id: 'db1',
        p_column_order: columnOrder
      });
    });
  });

  describe('обработка ошибок', () => {
    it('должен выбросить ошибку при неудачном вызове RPC', async () => {
      const mockError = new Error('RPC call failed');
      mockRPC.mockResolvedValue({
        data: null,
        error: mockError,
        count: null,
        status: 400,
        statusText: 'Bad Request'
      } as never);

      await expect(DatabaseAPI.getDatabases('user123')).rejects.toThrow('RPC call failed');
    });

    it('должен обработать сетевые ошибки', async () => {
      mockRPC.mockRejectedValue(new Error('Network error'));

      await expect(DatabaseAPI.getDatabases('user123')).rejects.toThrow('Network error');
    });
  });
});
