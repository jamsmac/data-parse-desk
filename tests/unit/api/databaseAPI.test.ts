/**
 * Unit Tests: Database API
 * Тесты для критичных функций работы с базами данных
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseAPI } from '../../../src/api/databaseAPI';
import type { Database, CreateDatabaseRequest, UpdateDatabaseRequest } from '../../../src/types/database';

// Мок для Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  })),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
};

// Мок для DatabaseAPI
vi.mock('../../../src/lib/supabase', () => ({
  supabase: mockSupabase
}));

describe('DatabaseAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllDatabases', () => {
    it('should return all databases for user', async () => {
      const mockDatabases: Database[] = [
        {
          id: '1',
          system_name: 'test_db',
          display_name: 'Test Database',
          table_name: 'user_test_db',
          icon_name: 'database',
          color_hex: '#3b82f6',
          cached_record_count: 100,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockDatabases, error: null }))
        }))
      });

      const result = await DatabaseAPI.getAllDatabases('user-123');
      
      expect(result).toEqual(mockDatabases);
      expect(mockSupabase.from).toHaveBeenCalledWith('databases');
    });

    it('should handle errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Database error' } }))
        }))
      });

      await expect(DatabaseAPI.getAllDatabases('user-123')).rejects.toThrow('Database error');
    });
  });

  describe('createDatabase', () => {
    it('should create a new database', async () => {
      const createRequest: CreateDatabaseRequest = {
        display_name: 'New Database',
        description: 'Test database',
        icon_name: 'database',
        color_hex: '#3b82f6'
      };

      const mockDatabase: Database = {
        id: '2',
        system_name: 'new_database',
        display_name: 'New Database',
        table_name: 'user_new_database',
        icon_name: 'database',
        color_hex: '#3b82f6',
        cached_record_count: 0,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [mockDatabase], error: null }))
        }))
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await DatabaseAPI.createDatabase(createRequest, 'user-123');
      
      expect(result).toEqual(mockDatabase);
      expect(mockSupabase.from).toHaveBeenCalledWith('databases');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_dynamic_table', expect.any(Object));
    });

    it('should generate system_name from display_name', async () => {
      const createRequest: CreateDatabaseRequest = {
        display_name: 'My Test Database!',
        description: 'Test',
        icon_name: 'database',
        color_hex: '#3b82f6'
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [{}], error: null }))
        }))
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      await DatabaseAPI.createDatabase(createRequest, 'user-123');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('databases');
      const insertCall = mockSupabase.from().insert.mock.calls[0][0];
      expect(insertCall.system_name).toBe('my_test_database');
    });
  });

  describe('updateDatabase', () => {
    it('should update database properties', async () => {
      const updateRequest: UpdateDatabaseRequest = {
        display_name: 'Updated Database',
        description: 'Updated description'
      };

      const mockUpdatedDatabase: Database = {
        id: '1',
        system_name: 'test_db',
        display_name: 'Updated Database',
        table_name: 'user_test_db',
        icon_name: 'database',
        color_hex: '#3b82f6',
        cached_record_count: 100,
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z'
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => Promise.resolve({ data: [mockUpdatedDatabase], error: null }))
          }))
        }))
      });

      const result = await DatabaseAPI.updateDatabase('1', updateRequest);
      
      expect(result).toEqual(mockUpdatedDatabase);
      expect(mockSupabase.from).toHaveBeenCalledWith('databases');
    });
  });

  describe('deleteDatabase', () => {
    it('should delete database and related data', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      await DatabaseAPI.deleteDatabase('1');
      
      expect(mockSupabase.from).toHaveBeenCalledWith('databases');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('drop_dynamic_table', expect.any(Object));
    });
  });

  describe('getTableData', () => {
    it('should fetch table data with pagination', async () => {
      const mockData = [
        { id: 1, name: 'Test 1', value: 100 },
        { id: 2, name: 'Test 2', value: 200 }
      ];

      mockSupabase.rpc.mockResolvedValue({ 
        data: { data: mockData, total: 2 }, 
        error: null 
      });

      const result = await DatabaseAPI.getTableData('user_test_db', {
        page: 0,
        pageSize: 10,
        filters: [],
        sortBy: 'name',
        sortOrder: 'asc'
      });
      
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(2);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_table_data', expect.any(Object));
    });

    it('should handle filters correctly', async () => {
      mockSupabase.rpc.mockResolvedValue({ 
        data: { data: [], total: 0 }, 
        error: null 
      });

      await DatabaseAPI.getTableData('user_test_db', {
        page: 0,
        pageSize: 10,
        filters: [
          { column: 'name', operator: 'contains', value: 'test' },
          { column: 'value', operator: 'gte', value: 100 }
        ],
        sortBy: 'name',
        sortOrder: 'asc'
      });
      
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_table_data', expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({ column: 'name', operator: 'contains', value: 'test' }),
          expect.objectContaining({ column: 'value', operator: 'gte', value: 100 })
        ])
      }));
    });
  });

  describe('getTableSchema', () => {
    it('should fetch table schema', async () => {
      const mockSchema = [
        { column_name: 'id', data_type: 'uuid', is_required: true },
        { column_name: 'name', data_type: 'text', is_required: false }
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: mockSchema, error: null }))
        }))
      });

      const result = await DatabaseAPI.getTableSchema('1');
      
      expect(result).toEqual(mockSchema);
      expect(mockSupabase.from).toHaveBeenCalledWith('table_schemas');
    });
  });

  describe('updateTableSchema', () => {
    it('should update table schema', async () => {
      const schemaUpdate = {
        columns: [
          { name: 'id', type: 'uuid', required: true },
          { name: 'name', type: 'text', required: false }
        ]
      };

      mockSupabase.from.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      });

      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      await DatabaseAPI.updateTableSchema('1', schemaUpdate);
      
      expect(mockSupabase.from).toHaveBeenCalledWith('table_schemas');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('alter_dynamic_table', expect.any(Object));
    });
  });
});