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
      setLoading(true);

      // Build query step by step to avoid deep type instantiation
      const baseQuery = supabase
        .from('table_data')
        .select('*', { count: 'exact' })
        .eq('database_id', databaseId)
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      let query: any = baseQuery;

      // Apply filters
      filters.forEach(filter => {
        if (!filter.value) return;

        const columnPath = `data->>${filter.column}`;
        
        switch (filter.operator) {
          case 'equals':
            query = query.eq(columnPath, filter.value);
            break;
          case 'notEquals':
            query = query.neq(columnPath, filter.value);
            break;
          case 'contains':
            query = query.ilike(columnPath, `%${filter.value}%`);
            break;
          case 'startsWith':
            query = query.ilike(columnPath, `${filter.value}%`);
            break;
          case 'endsWith':
            query = query.ilike(columnPath, `%${filter.value}`);
            break;
          case 'gt':
            query = query.gt(columnPath, filter.value);
            break;
          case 'lt':
            query = query.lt(columnPath, filter.value);
            break;
          case 'gte':
            query = query.gte(columnPath, filter.value);
            break;
          case 'lte':
            query = query.lte(columnPath, filter.value);
            break;
        }
      });

      // Apply sorting
      if (sort.column) {
        query = query.order(`data->>${sort.column}`, { 
          ascending: sort.direction === 'asc' 
        });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data: rows, error, count } = await query;

      if (error) throw error;

      setData(rows || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error loading table data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return { data, totalCount, loading, refresh: loadData };
}