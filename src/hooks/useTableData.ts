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
}

export function useTableData({ databaseId, page, pageSize, filters, sort }: UseTableDataOptions) {
  const [data, setData] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [databaseId, page, pageSize, filters, sort]);

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
        filterCount: Object.keys(filterObj).length
      });

      const { data: rows, error } = await supabase.rpc('get_table_data', {
        p_database_id: databaseId,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
        p_sort_column: sort.column || null,
        p_sort_direction: sort.direction || 'asc',
        p_filters: Object.keys(filterObj).length > 0 ? filterObj : null,
      });

      if (error) throw error;

      const dataRows = rows || [];
      const total = dataRows.length > 0 ? dataRows[0].total_count : 0;

      console.log('useTableData: Data fetched successfully:', {
        rowCount: dataRows.length,
        totalCount: total
      });

      setData(dataRows);
      setTotalCount(Number(total));
    } catch (error: any) {
      console.error('useTableData: Error loading table data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return { data, totalCount, loading, refresh: loadData };
}