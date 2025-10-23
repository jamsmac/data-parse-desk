import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useViewPreferences } from '../useViewPreferences';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

// Mock AuthContext
const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

describe('useViewPreferences', () => {
  const mockDatabaseId = 'db-123';
  const mockViewType = 'table';

  const createMockSupabaseChain = (returnValue: any) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(returnValue),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(returnValue),
      delete: vi.fn().mockReturnThis(),
    };
    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default preferences', async () => {
      const chain = createMockSupabaseChain({ data: null, error: null });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.preferences).toEqual({
        filters: [],
        sort: { column: null, direction: 'asc' },
        visibleColumns: [],
        pageSize: 50,
      });
    });

    it('should load existing preferences from database', async () => {
      const mockPreferences = {
        id: 'pref-123',
        database_id: mockDatabaseId,
        user_id: mockUser.id,
        view_type: mockViewType,
        filters: [{ column: 'name', operator: 'eq', value: 'test' }],
        sort: { column: 'created_at', direction: 'desc' },
        visible_columns: ['name', 'email', 'status'],
        page_size: 100,
      };

      const chain = createMockSupabaseChain({ data: mockPreferences, error: null });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.preferences).toEqual({
        filters: [{ column: 'name', operator: 'eq', value: 'test' }],
        sort: { column: 'created_at', direction: 'desc' },
        visibleColumns: ['name', 'email', 'status'],
        pageSize: 100,
      });
    });

    it('should handle database errors gracefully', async () => {
      const chain = createMockSupabaseChain({ data: null, error: new Error('Database error') });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to default preferences
      expect(result.current.preferences).toEqual({
        filters: [],
        sort: { column: null, direction: 'asc' },
        visibleColumns: [],
        pageSize: 50,
      });
    });

    it('should handle malformed data gracefully', async () => {
      const malformedData = {
        id: 'pref-123',
        filters: 'not-an-array',
        sort: 'not-an-object',
        visible_columns: 'not-an-array',
        page_size: 'not-a-number',
      };

      const chain = createMockSupabaseChain({ data: malformedData, error: null });
      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to defaults for invalid fields
      expect(result.current.preferences.filters).toEqual([]);
      expect(result.current.preferences.sort).toEqual({ column: null, direction: 'asc' });
      expect(result.current.preferences.visibleColumns).toEqual([]);
      expect(result.current.preferences.pageSize).toBe(50);
    });
  });

  describe('updateFilters', () => {
    it('should create new preferences when none exist', async () => {
      const chain = createMockSupabaseChain({ data: null, error: null });
      const insertChain = createMockSupabaseChain({
        data: { id: 'new-pref-123' },
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(chain as any) // Initial load
        .mockReturnValueOnce(insertChain as any); // Insert

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newFilters = [{ column: 'status', operator: 'eq', value: 'active' }];

      await act(async () => {
        result.current.updateFilters(newFilters);
      });

      await waitFor(() => {
        expect(insertChain.insert).toHaveBeenCalledWith({
          database_id: mockDatabaseId,
          user_id: mockUser.id,
          view_type: mockViewType,
          filters: newFilters,
          sort: { column: null, direction: 'asc' },
          visible_columns: [],
          page_size: 50,
        });
      });

      expect(result.current.preferences.filters).toEqual(newFilters);
    });

    it('should update existing preferences', async () => {
      const existingData = {
        id: 'pref-123',
        filters: [],
        sort: { column: null, direction: 'asc' },
        visible_columns: [],
        page_size: 50,
      };

      const loadChain = createMockSupabaseChain({ data: existingData, error: null });
      const updateChain = createMockSupabaseChain({ data: null, error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(loadChain as any) // Initial load
        .mockReturnValueOnce(updateChain as any); // Update

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newFilters = [{ column: 'name', operator: 'contains', value: 'test' }];

      await act(async () => {
        result.current.updateFilters(newFilters);
      });

      await waitFor(() => {
        expect(updateChain.update).toHaveBeenCalledWith({
          database_id: mockDatabaseId,
          user_id: mockUser.id,
          view_type: mockViewType,
          filters: newFilters,
          sort: { column: null, direction: 'asc' },
          visible_columns: [],
          page_size: 50,
        });
      });

      expect(result.current.preferences.filters).toEqual(newFilters);
    });
  });

  describe('updateSort', () => {
    it('should update sort preferences', async () => {
      const chain = createMockSupabaseChain({ data: null, error: null });
      const insertChain = createMockSupabaseChain({
        data: { id: 'new-pref-123' },
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(chain as any)
        .mockReturnValueOnce(insertChain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newSort = { column: 'created_at', direction: 'desc' as const };

      await act(async () => {
        result.current.updateSort(newSort);
      });

      expect(result.current.preferences.sort).toEqual(newSort);
    });

    it('should handle sort direction changes', async () => {
      const existingData = {
        id: 'pref-123',
        filters: [],
        sort: { column: 'name', direction: 'asc' },
        visible_columns: [],
        page_size: 50,
      };

      const loadChain = createMockSupabaseChain({ data: existingData, error: null });
      const updateChain = createMockSupabaseChain({ data: null, error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(loadChain as any)
        .mockReturnValueOnce(updateChain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newSort = { column: 'name', direction: 'desc' as const };

      await act(async () => {
        result.current.updateSort(newSort);
      });

      expect(result.current.preferences.sort).toEqual(newSort);
    });
  });

  describe('updateVisibleColumns', () => {
    it('should update visible columns', async () => {
      const chain = createMockSupabaseChain({ data: null, error: null });
      const insertChain = createMockSupabaseChain({
        data: { id: 'new-pref-123' },
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(chain as any)
        .mockReturnValueOnce(insertChain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newColumns = ['id', 'name', 'email', 'created_at'];

      await act(async () => {
        result.current.updateVisibleColumns(newColumns);
      });

      expect(result.current.preferences.visibleColumns).toEqual(newColumns);
    });

    it('should handle empty visible columns array', async () => {
      const existingData = {
        id: 'pref-123',
        filters: [],
        sort: { column: null, direction: 'asc' },
        visible_columns: ['name', 'email'],
        page_size: 50,
      };

      const loadChain = createMockSupabaseChain({ data: existingData, error: null });
      const updateChain = createMockSupabaseChain({ data: null, error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(loadChain as any)
        .mockReturnValueOnce(updateChain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.updateVisibleColumns([]);
      });

      expect(result.current.preferences.visibleColumns).toEqual([]);
    });
  });

  describe('updatePageSize', () => {
    it('should update page size', async () => {
      const chain = createMockSupabaseChain({ data: null, error: null });
      const insertChain = createMockSupabaseChain({
        data: { id: 'new-pref-123' },
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(chain as any)
        .mockReturnValueOnce(insertChain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        result.current.updatePageSize(100);
      });

      expect(result.current.preferences.pageSize).toBe(100);
    });

    it('should handle different page sizes', async () => {
      const chain = createMockSupabaseChain({ data: null, error: null });
      const insertChain = createMockSupabaseChain({
        data: { id: 'new-pref-123' },
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(chain as any)
        .mockReturnValueOnce(insertChain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const pageSizes = [10, 25, 50, 100, 200];

      for (const size of pageSizes) {
        await act(async () => {
          result.current.updatePageSize(size);
        });
        expect(result.current.preferences.pageSize).toBe(size);
      }
    });
  });

  describe('resetPreferences', () => {
    it('should reset to default preferences', async () => {
      const existingData = {
        id: 'pref-123',
        filters: [{ column: 'status', operator: 'eq', value: 'active' }],
        sort: { column: 'created_at', direction: 'desc' },
        visible_columns: ['name', 'email'],
        page_size: 100,
      };

      const loadChain = createMockSupabaseChain({ data: existingData, error: null });
      const deleteChain = createMockSupabaseChain({ data: null, error: null });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(loadChain as any)
        .mockReturnValueOnce(deleteChain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.preferences.pageSize).toBe(100);

      await act(async () => {
        await result.current.resetPreferences();
      });

      expect(result.current.preferences).toEqual({
        filters: [],
        sort: { column: null, direction: 'asc' },
        visibleColumns: [],
        pageSize: 50,
      });

      await waitFor(() => {
        expect(deleteChain.delete).toHaveBeenCalled();
        expect(deleteChain.eq).toHaveBeenCalledWith('id', 'pref-123');
      });
    });

    it('should reset when no preferences exist', async () => {
      const chain = createMockSupabaseChain({ data: null, error: null });

      vi.mocked(supabase.from).mockReturnValue(chain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.resetPreferences();
      });

      expect(result.current.preferences).toEqual({
        filters: [],
        sort: { column: null, direction: 'asc' },
        visibleColumns: [],
        pageSize: 50,
      });

      // Should not try to delete if no preferenceId
      expect(chain.delete).not.toHaveBeenCalled();
    });

    it('should handle delete errors gracefully', async () => {
      const existingData = {
        id: 'pref-123',
        filters: [],
        sort: { column: null, direction: 'asc' },
        visible_columns: [],
        page_size: 100,
      };

      const loadChain = createMockSupabaseChain({ data: existingData, error: null });
      const deleteChain = createMockSupabaseChain({ data: null, error: new Error('Delete failed') });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(loadChain as any)
        .mockReturnValueOnce(deleteChain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not throw error
      await act(async () => {
        await result.current.resetPreferences();
      });

      // Preferences should still be reset locally
      expect(result.current.preferences).toEqual({
        filters: [],
        sort: { column: null, direction: 'asc' },
        visibleColumns: [],
        pageSize: 50,
      });
    });
  });

  describe('Reactivity', () => {
    it('should reload preferences when databaseId changes', async () => {
      const chain1 = createMockSupabaseChain({
        data: { id: 'pref-1', page_size: 50 },
        error: null,
      });
      const chain2 = createMockSupabaseChain({
        data: { id: 'pref-2', page_size: 100 },
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(chain1 as any)
        .mockReturnValueOnce(chain2 as any);

      const { result, rerender } = renderHook(
        ({ databaseId }) => useViewPreferences(databaseId, mockViewType),
        { initialProps: { databaseId: 'db-1' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.preferences.pageSize).toBe(50);

      // Change databaseId
      rerender({ databaseId: 'db-2' });

      await waitFor(() => {
        expect(result.current.preferences.pageSize).toBe(100);
      });
    });

    it('should reload preferences when viewType changes', async () => {
      const chain1 = createMockSupabaseChain({
        data: { id: 'pref-1', page_size: 50 },
        error: null,
      });
      const chain2 = createMockSupabaseChain({
        data: { id: 'pref-2', page_size: 25 },
        error: null,
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(chain1 as any)
        .mockReturnValueOnce(chain2 as any);

      const { result, rerender } = renderHook(
        ({ viewType }) => useViewPreferences(mockDatabaseId, viewType),
        { initialProps: { viewType: 'table' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.preferences.pageSize).toBe(50);

      // Change viewType
      rerender({ viewType: 'kanban' });

      await waitFor(() => {
        expect(result.current.preferences.pageSize).toBe(25);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle save errors gracefully', async () => {
      const chain = createMockSupabaseChain({ data: null, error: null });
      const errorChain = createMockSupabaseChain({
        data: null,
        error: new Error('Save failed'),
      });

      vi.mocked(supabase.from)
        .mockReturnValueOnce(chain as any)
        .mockReturnValueOnce(errorChain as any);

      const { result } = renderHook(() => useViewPreferences(mockDatabaseId, mockViewType));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not throw error
      await act(async () => {
        result.current.updatePageSize(100);
      });

      // Preferences should still update locally
      expect(result.current.preferences.pageSize).toBe(100);
    });
  });
});
