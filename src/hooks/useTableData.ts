/**
 * useTableData Hook - Table Data Management with Optimizations
 *
 * Improvements:
 * - Proper TypeScript typing (no any types)
 * - Debounced search
 * - Memory leak prevention
 * - Better error handling
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';
import { DatabaseError, logError, getUserFriendlyMessage } from '@/lib/errors';
import type { Filter } from '@/components/database/FilterBuilder';
import type { SortConfig } from '@/components/database/SortControls';

export interface TableRow {
  id: string;
  data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface UseTableDataOptions {
  databaseId: string;
  page: number;
  pageSize: number;
  filters: Filter[];
  sort: SortConfig;
  search?: string;
  searchColumns?: string[];
  includeRelations?: boolean;
  includeComputedColumns?: boolean;
}

interface UseTableDataReturn {
  data: TableRow[];
  totalCount: number;
  loading: boolean;
  resolving: boolean;
  computing: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const SEARCH_DEBOUNCE_MS = 300;

export function useTableData({
  databaseId,
  page,
  pageSize,
  filters,
  sort,
  search = '',
  searchColumns = [],
  includeRelations = true,
  includeComputedColumns = true,
}: UseTableDataOptions): UseTableDataReturn {
  const [data, setData] = useState<TableRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Prevent memory leaks
  const mountedRef = useRef(true);

  // Debounce search query
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

  // Memoize filters hash to prevent unnecessary re-renders
  const filtersHash = useMemo(() => {
    return JSON.stringify(
      filters.map((f) => ({
        column: f.column,
        operator: f.operator,
        value: f.value,
      }))
    );
  }, [filters]);

  // Memoize sort hash
  const sortHash = useMemo(() => {
    return JSON.stringify({ column: sort.column, direction: sort.direction });
  }, [sort.column, sort.direction]);

  // Memoize search columns hash
  const searchColumnsHash = useMemo(() => {
    return JSON.stringify(searchColumns);
  }, [searchColumns]);

  /**
   * Load table data with all optimizations
   */
  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      console.log('useTableData: Starting loadData for database:', databaseId);
      setLoading(true);
      setError(null);

      // Convert filters to JSONB format for RPC
      const filterObj: Record<string, { type: string; operator: string; value: unknown }> = {};

      filters.forEach((filter) => {
        if (!filter.value) return;

        let filterType = 'text';
        let filterOperator: string = filter.operator;

        // Determine filter type and operator
        if (['gt', 'lt', 'gte', 'lte'].includes(filter.operator)) {
          filterType = 'number';
          filterOperator =
            filter.operator === 'gt'
              ? '>'
              : filter.operator === 'lt'
              ? '<'
              : filter.operator === 'gte'
              ? '>='
              : '<=';
        }

        filterObj[filter.column] = {
          type: filterType,
          operator: filterOperator,
          value: filter.value,
        };
      });

      console.log('useTableData: Fetching data with params:', {
        databaseId,
        page,
        pageSize,
        sort,
        filterCount: Object.keys(filterObj).length,
        search: debouncedSearch,
        searchColumnsCount: searchColumns.length,
      });

      // Use search-specific RPC if search is active
      const rpcFunction =
        debouncedSearch && searchColumns.length > 0 ? 'search_table_data' : 'get_table_data';

      const rpcParams: Record<string, unknown> = {
        p_database_id: databaseId,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
        p_sort_column: sort.column || null,
        p_sort_direction: sort.direction || 'asc',
        p_filters: Object.keys(filterObj).length > 0 ? filterObj : null,
      };

      // Add search params if searching
      if (debouncedSearch && searchColumns.length > 0) {
        rpcParams.p_search_query = debouncedSearch;
        rpcParams.p_search_columns = searchColumns;
      }

      const { data: rows, error: queryError } = await supabase.rpc(rpcFunction, rpcParams);

      if (queryError) {
        throw new DatabaseError(`Failed to fetch table data: ${queryError.message}`, queryError);
      }

      if (!mountedRef.current) return;

      const dataRows = (rows || []) as TableRow[];
      const total = dataRows.length > 0 ? (dataRows[0].total_count as number) || 0 : 0;

      console.log('useTableData: Data fetched successfully:', {
        rowCount: dataRows.length,
        totalCount: total,
      });

      setTotalCount(Number(total));

      let processedRows = dataRows;

      // Auto-resolve relations if enabled
      if (includeRelations && dataRows.length > 0) {
        if (!mountedRef.current) return;

        setResolving(true);

        try {
          console.log('useTableData: Resolving relations...');

          const { data: resolvedData, error: resolveError } = await supabase.functions.invoke(
            'resolve-relations',
            {
              body: {
                databaseId,
                rows: dataRows,
                includeRelations: true,
              },
            }
          );

          if (resolveError) {
            console.error('useTableData: Error resolving relations:', resolveError);
          } else if (resolvedData && resolvedData.rows) {
            console.log('useTableData: Relations resolved successfully:', {
              relationsResolved: resolvedData.metadata?.relationsResolved || 0,
            });

            if (mountedRef.current) {
              processedRows = resolvedData.rows as TableRow[];
            }
          }
        } catch (resolveError) {
          console.error('useTableData: Exception resolving relations:', resolveError);
          logError(resolveError, { databaseId, operation: 'resolve-relations' });
        } finally {
          if (mountedRef.current) {
            setResolving(false);
          }
        }
      }

      // Auto-compute lookup/rollup columns if enabled
      if (includeComputedColumns && processedRows.length > 0) {
        if (!mountedRef.current) return;

        setComputing(true);

        try {
          console.log('useTableData: Computing lookup/rollup columns...');

          const rowIds = processedRows.map((row) => row.id);

          const { data: computedData, error: computeError } = await supabase.functions.invoke(
            'compute-columns',
            {
              body: {
                databaseId,
                rowIds,
                columnTypes: ['lookup', 'rollup'],
              },
            }
          );

          if (computeError) {
            console.error('useTableData: Error computing columns:', computeError);
          } else if (computedData && computedData.success) {
            console.log('useTableData: Computed columns successfully:', {
              lookupUpdates: computedData.lookup_updates || 0,
              rollupUpdates: computedData.rollup_updates || 0,
              durationMs: computedData.duration_ms || 0,
            });

            // Refetch data to get updated computed values
            const { data: refreshedRows } = await supabase.rpc(rpcFunction, rpcParams);

            if (mountedRef.current && refreshedRows && refreshedRows.length > 0) {
              processedRows = refreshedRows as TableRow[];
            }
          }
        } catch (computeError) {
          console.error('useTableData: Exception computing columns:', computeError);
          logError(computeError, { databaseId, operation: 'compute-columns' });
        } finally {
          if (mountedRef.current) {
            setComputing(false);
          }
        }
      }

      if (mountedRef.current) {
        setData(processedRows);
      }
    } catch (err) {
      console.error('useTableData: Error loading table data:', err);
      logError(err, { databaseId, page, pageSize });

      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        toast.error(getUserFriendlyMessage(err));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    databaseId,
    page,
    pageSize,
    filtersHash,
    sortHash,
    debouncedSearch,
    searchColumnsHash,
    includeRelations,
    includeComputedColumns,
  ]);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    totalCount,
    loading,
    resolving,
    computing,
    error,
    refresh: loadData,
  };
}
