import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTableData } from '../useTableData';
import { supabase } from '@/integrations/supabase/client';

// Mock console to avoid noise
const originalConsole = { ...console };
beforeAll(() => {
  console.log = vi.fn();
  console.error = vi.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
});

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('useTableData', () => {
  const defaultOptions = {
    databaseId: 'db-123',
    page: 1,
    pageSize: 10,
    filters: [],
    sort: { column: 'id', direction: 'asc' as const },
  };

  const mockData = [
    { id: '1', name: 'Row 1', total_count: 100 },
    { id: '2', name: 'Row 2', total_count: 100 },
    { id: '3', name: 'Row 3', total_count: 100 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: mockData, error: null } as any);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: null } as any);
  });

  describe('Basic functionality', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useTableData(defaultOptions));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });

    it('should load data successfully', async () => {
      const { result } = renderHook(() => useTableData(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.totalCount).toBe(100);
      expect(supabase.rpc).toHaveBeenCalledWith('get_table_data', {
        p_database_id: 'db-123',
        p_limit: 10,
        p_offset: 0,
        p_sort_column: 'id',
        p_sort_direction: 'asc',
        p_filters: null,
      });
    });

    it('should handle empty data', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as any);

      const { result } = renderHook(() => useTableData(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });

    it('should handle null data', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as any);

      const { result } = renderHook(() => useTableData(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });
  });

  describe('Pagination', () => {
    it('should calculate offset correctly for page 1', async () => {
      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, page: 1, pageSize: 10 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_offset: 0, // (1 - 1) * 10
        })
      );
    });

    it('should calculate offset correctly for page 2', async () => {
      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, page: 2, pageSize: 10 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_offset: 10, // (2 - 1) * 10
        })
      );
    });

    it('should calculate offset correctly for page 5 with pageSize 25', async () => {
      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, page: 5, pageSize: 25 })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_offset: 100, // (5 - 1) * 25
          p_limit: 25,
        })
      );
    });
  });

  describe('Sorting', () => {
    it('should apply sort configuration', async () => {
      const { result } = renderHook(() =>
        useTableData({
          ...defaultOptions,
          sort: { column: 'name', direction: 'desc' },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_sort_column: 'name',
          p_sort_direction: 'desc',
        })
      );
    });

    it('should handle null sort column', async () => {
      const { result } = renderHook(() =>
        useTableData({
          ...defaultOptions,
          sort: { column: null, direction: 'asc' },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_sort_column: null,
        })
      );
    });
  });

  describe('Filtering', () => {
    it('should apply text filters', async () => {
      const filters = [
        { column: 'name', operator: 'eq', value: 'John' },
      ];

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, filters })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_filters: {
            name: {
              type: 'text',
              operator: 'eq',
              value: 'John',
            },
          },
        })
      );
    });

    it('should apply number filters with gt operator', async () => {
      const filters = [
        { column: 'age', operator: 'gt', value: '18' },
      ];

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, filters })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_filters: {
            age: {
              type: 'number',
              operator: '>',
              value: '18',
            },
          },
        })
      );
    });

    it('should apply number filters with lt operator', async () => {
      const filters = [
        { column: 'age', operator: 'lt', value: '65' },
      ];

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, filters })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_filters: {
            age: {
              type: 'number',
              operator: '<',
              value: '65',
            },
          },
        })
      );
    });

    it('should apply number filters with gte operator', async () => {
      const filters = [
        { column: 'score', operator: 'gte', value: '90' },
      ];

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, filters })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_filters: {
            score: {
              type: 'number',
              operator: '>=',
              value: '90',
            },
          },
        })
      );
    });

    it('should apply number filters with lte operator', async () => {
      const filters = [
        { column: 'price', operator: 'lte', value: '100' },
      ];

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, filters })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_filters: {
            price: {
              type: 'number',
              operator: '<=',
              value: '100',
            },
          },
        })
      );
    });

    it('should apply multiple filters', async () => {
      const filters = [
        { column: 'name', operator: 'eq', value: 'John' },
        { column: 'age', operator: 'gt', value: '18' },
        { column: 'status', operator: 'eq', value: 'active' },
      ];

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, filters })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_filters: {
            name: { type: 'text', operator: 'eq', value: 'John' },
            age: { type: 'number', operator: '>', value: '18' },
            status: { type: 'text', operator: 'eq', value: 'active' },
          },
        })
      );
    });

    it('should ignore filters with empty values', async () => {
      const filters = [
        { column: 'name', operator: 'eq', value: '' },
        { column: 'age', operator: 'gt', value: null },
        { column: 'status', operator: 'eq', value: 'active' },
      ];

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, filters })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_filters: {
            status: { type: 'text', operator: 'eq', value: 'active' },
          },
        })
      );
    });

    it('should send null filters when all are empty', async () => {
      const filters = [
        { column: 'name', operator: 'eq', value: '' },
      ];

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, filters })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        'get_table_data',
        expect.objectContaining({
          p_filters: null,
        })
      );
    });
  });

  describe('Search functionality', () => {
    it('should use search RPC when search is active', async () => {
      const { result } = renderHook(() =>
        useTableData({
          ...defaultOptions,
          search: 'John',
          searchColumns: ['name', 'email'],
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith('search_table_data', {
        p_database_id: 'db-123',
        p_limit: 10,
        p_offset: 0,
        p_sort_column: 'id',
        p_sort_direction: 'asc',
        p_filters: null,
        p_search_query: 'John',
        p_search_columns: ['name', 'email'],
      });
    });

    it('should use regular RPC when search is empty', async () => {
      const { result } = renderHook(() =>
        useTableData({
          ...defaultOptions,
          search: '',
          searchColumns: ['name', 'email'],
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_table_data', expect.any(Object));
    });

    it('should use regular RPC when searchColumns is empty', async () => {
      const { result } = renderHook(() =>
        useTableData({
          ...defaultOptions,
          search: 'John',
          searchColumns: [],
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_table_data', expect.any(Object));
    });
  });

  describe('Relations resolution', () => {
    it('should resolve relations when includeRelations is true', async () => {
      const resolvedData = {
        rows: [
          { id: '1', name: 'Row 1', user: { id: 'u1', name: 'User 1' } },
        ],
        metadata: { relationsResolved: 1 },
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: resolvedData,
        error: null,
      } as any);

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, includeRelations: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('resolve-relations', {
        body: {
          databaseId: 'db-123',
          rows: mockData,
          includeRelations: true,
        },
      });

      expect(result.current.data).toEqual(resolvedData.rows);
      expect(result.current.resolving).toBe(false);
    });

    it('should not resolve relations when includeRelations is false', async () => {
      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, includeRelations: false, includeComputedColumns: false })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
      expect(result.current.data).toEqual(mockData);
    });

    it('should handle relation resolution errors gracefully', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Relation error'),
      } as any);

      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, includeRelations: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should fallback to original data
      expect(result.current.data).toEqual(mockData);
      expect(result.current.resolving).toBe(false);
    });
  });

  describe('Computed columns', () => {
    it('should compute columns when includeComputedColumns is true', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          lookup_updates: 2,
          rollup_updates: 1,
          duration_ms: 150,
        },
        error: null,
      } as any);

      // Mock the refetch after computation
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: mockData, error: null } as any);
      const computedData = [
        { id: '1', name: 'Row 1', computed_value: 42 },
      ];
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: computedData, error: null } as any);

      const { result } = renderHook(() =>
        useTableData({
          ...defaultOptions,
          includeRelations: false,
          includeComputedColumns: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('compute-columns', {
        body: {
          databaseId: 'db-123',
          rowIds: ['1', '2', '3'],
          columnTypes: ['lookup', 'rollup'],
        },
      });

      expect(result.current.computing).toBe(false);
    });

    it('should not compute columns when includeComputedColumns is false', async () => {
      const { result } = renderHook(() =>
        useTableData({ ...defaultOptions, includeComputedColumns: false })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const computeInvocations = vi.mocked(supabase.functions.invoke).mock.calls.filter(
        call => call[0] === 'compute-columns'
      );

      expect(computeInvocations).toHaveLength(0);
    });

    it('should handle computed column errors gracefully', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('Compute error'),
      } as any);

      const { result } = renderHook(() =>
        useTableData({
          ...defaultOptions,
          includeRelations: false,
          includeComputedColumns: true,
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash, data remains unchanged
      expect(result.current.data).toEqual(mockData);
      expect(result.current.computing).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle RPC errors', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      } as any);

      const { result } = renderHook(() => useTableData(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });

    it('should handle exceptions during load', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useTableData(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('Refresh functionality', () => {
    it('should provide refresh function', async () => {
      const { result } = renderHook(() => useTableData(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.refresh).toBeDefined();
      expect(typeof result.current.refresh).toBe('function');
    });

    it('should reload data when refresh is called', async () => {
      const { result } = renderHook(() => useTableData(defaultOptions));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(supabase.rpc).mock.calls.length;

      // Call refresh
      result.current.refresh();

      await waitFor(() => {
        expect(vi.mocked(supabase.rpc).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('Reactivity', () => {
    it('should reload data when databaseId changes', async () => {
      const { result, rerender } = renderHook(
        ({ databaseId }) => useTableData({ ...defaultOptions, databaseId }),
        { initialProps: { databaseId: 'db-123' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(supabase.rpc).mock.calls.length;

      // Change databaseId
      rerender({ databaseId: 'db-456' });

      await waitFor(() => {
        expect(vi.mocked(supabase.rpc).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should reload data when page changes', async () => {
      const { result, rerender } = renderHook(
        ({ page }) => useTableData({ ...defaultOptions, page }),
        { initialProps: { page: 1 } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(supabase.rpc).mock.calls.length;

      // Change page
      rerender({ page: 2 });

      await waitFor(() => {
        expect(vi.mocked(supabase.rpc).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should reload data when filters change', async () => {
      const { result, rerender } = renderHook(
        ({ filters }) => useTableData({ ...defaultOptions, filters }),
        { initialProps: { filters: [] } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(supabase.rpc).mock.calls.length;

      // Change filters
      rerender({ filters: [{ column: 'name', operator: 'eq', value: 'Test' }] });

      await waitFor(() => {
        expect(vi.mocked(supabase.rpc).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should reload data when sort changes', async () => {
      const { result, rerender } = renderHook(
        ({ sort }) => useTableData({ ...defaultOptions, sort }),
        { initialProps: { sort: { column: 'id', direction: 'asc' as const } } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(supabase.rpc).mock.calls.length;

      // Change sort
      rerender({ sort: { column: 'name', direction: 'desc' as const } });

      await waitFor(() => {
        expect(vi.mocked(supabase.rpc).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should reload data when search changes', async () => {
      const { result, rerender } = renderHook(
        ({ search }) => useTableData({ ...defaultOptions, search, searchColumns: ['name'] }),
        { initialProps: { search: '' } }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = vi.mocked(supabase.rpc).mock.calls.length;

      // Change search
      rerender({ search: 'John' });

      await waitFor(() => {
        expect(vi.mocked(supabase.rpc).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });
});
