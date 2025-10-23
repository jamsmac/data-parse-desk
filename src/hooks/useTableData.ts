import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Filter } from '@/components/database/FilterBuilder';
import type { SortConfig } from '@/components/database/SortControls';

interface UseTableDataOptions {
  databaseId: string;
  page: number;
  pageSize: number;
  filters: Filter[];
  sort: SortConfig;
  search?: string; // Search query
  searchColumns?: string[]; // Columns to search in
  includeRelations?: boolean; // Auto-resolve relations (default: true)
  includeComputedColumns?: boolean; // Auto-compute lookup/rollup columns (default: true)
}

export function useTableData({
  databaseId,
  page,
  pageSize,
  filters,
  sort,
  search = '',
  searchColumns = [],
  includeRelations = true,
  includeComputedColumns = true
}: UseTableDataOptions) {
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [computing, setComputing] = useState(false);

  useEffect(() => {
    loadData();
  }, [databaseId, page, pageSize, filters, sort, search, searchColumns]);

  const loadData = async () => {
    try {
      console.log('useTableData: Starting loadData for database:', databaseId);
      setLoading(true);

      // Convert filters to JSONB format for RPC
      const filterObj: Record<string, any> = {};
      filters.forEach(filter => {
        if (!filter.value) return;

        let filterType = 'text';
        let filterOperator: string = filter.operator;

        // Determine filter type and operator
        if (['gt', 'lt', 'gte', 'lte'].includes(filter.operator)) {
          filterType = 'number';
          filterOperator = filter.operator === 'gt' ? '>' :
                    filter.operator === 'lt' ? '<' :
                    filter.operator === 'gte' ? '>=' : '<=';
        }

        filterObj[filter.column] = {
          type: filterType,
          operator: filterOperator,
          value: filter.value
        };
      });

      console.log('useTableData: Fetching data with params:', {
        databaseId,
        page,
        pageSize,
        sort,
        filterCount: Object.keys(filterObj).length,
        search,
        searchColumnsCount: searchColumns.length
      });

      // Use search-specific RPC if search is active
      const rpcFunction = search && searchColumns.length > 0 ? 'search_table_data' : 'get_table_data';
      const rpcParams: any = {
        p_database_id: databaseId,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
        p_sort_column: sort.column || null,
        p_sort_direction: sort.direction || 'asc',
        p_filters: Object.keys(filterObj).length > 0 ? filterObj : null,
      };

      // Add search params if searching
      if (search && searchColumns.length > 0) {
        rpcParams.p_search_query = search;
        rpcParams.p_search_columns = searchColumns;
      }

      const { data: rows, error } = await supabase.rpc(rpcFunction, rpcParams);

      if (error) throw error;

      const dataRows = rows || [];
      const total = dataRows.length > 0 ? dataRows[0].total_count : 0;

      console.log('useTableData: Data fetched successfully:', {
        rowCount: dataRows.length,
        totalCount: total
      });

      setTotalCount(Number(total));

      let processedRows = dataRows;

      // Auto-resolve relations if enabled
      if (includeRelations && dataRows.length > 0) {
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
            processedRows = resolvedData.rows;
          }
        } catch (resolveError) {
          console.error('useTableData: Exception resolving relations:', resolveError);
        } finally {
          setResolving(false);
        }
      }

      // Auto-compute lookup/rollup columns if enabled
      if (includeComputedColumns && processedRows.length > 0) {
        setComputing(true);
        try {
          console.log('useTableData: Computing lookup/rollup columns...');

          const rowIds = processedRows.map(row => row.id);

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

            if (refreshedRows && refreshedRows.length > 0) {
              processedRows = refreshedRows;
            }
          }
        } catch (computeError) {
          console.error('useTableData: Exception computing columns:', computeError);
        } finally {
          setComputing(false);
        }
      }

      setData(processedRows);
    } catch (error: any) {
      console.error('useTableData: Error loading table data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return { data, totalCount, loading, resolving, computing, refresh: loadData };
}