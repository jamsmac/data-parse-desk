import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ViewPreferences {
  filters: any[];
  sort: {
    column: string | null;
    direction: 'asc' | 'desc';
  };
  visibleColumns: string[];
  pageSize: number;
}

const DEFAULT_PREFERENCES: ViewPreferences = {
  filters: [],
  sort: { column: null, direction: 'asc' },
  visibleColumns: [],
  pageSize: 50,
};

export function useViewPreferences(databaseId: string, viewType: string = 'table') {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<ViewPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [databaseId, user, viewType]);

  const loadPreferences = async () => {
    if (!user || !databaseId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('view_preferences')
        .select('*')
        .eq('database_id', databaseId)
        .eq('user_id', user.id)
        .eq('view_type', viewType)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferenceId(data.id);
        setPreferences({
          filters: Array.isArray(data.filters) ? data.filters : [],
          sort: (typeof data.sort === 'object' && data.sort !== null && !Array.isArray(data.sort)) 
            ? data.sort as { column: string | null; direction: 'asc' | 'desc' }
            : { column: null, direction: 'asc' },
          visibleColumns: Array.isArray(data.visible_columns) ? data.visible_columns as string[] : [],
          pageSize: typeof data.page_size === 'number' ? data.page_size : 50,
        });
      }
    } catch (error) {
      console.error('Error loading view preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: Partial<ViewPreferences>) => {
    if (!user || !databaseId) return;

    const updatedPreferences = { ...preferences, ...newPreferences };
    setPreferences(updatedPreferences);

    try {
      const payload = {
        database_id: databaseId,
        user_id: user.id,
        view_type: viewType,
        filters: updatedPreferences.filters,
        sort: updatedPreferences.sort,
        visible_columns: updatedPreferences.visibleColumns,
        page_size: updatedPreferences.pageSize,
      };

      if (preferenceId) {
        // Update existing
        const { error } = await supabase
          .from('view_preferences')
          .update(payload)
          .eq('id', preferenceId);

        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('view_preferences')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (data) setPreferenceId(data.id);
      }
    } catch (error) {
      console.error('Error saving view preferences:', error);
    }
  };

  const updateFilters = (filters: any[]) => {
    savePreferences({ filters });
  };

  const updateSort = (sort: { column: string | null; direction: 'asc' | 'desc' }) => {
    savePreferences({ sort });
  };

  const updateVisibleColumns = (visibleColumns: string[]) => {
    savePreferences({ visibleColumns });
  };

  const updatePageSize = (pageSize: number) => {
    savePreferences({ pageSize });
  };

  const resetPreferences = async () => {
    setPreferences(DEFAULT_PREFERENCES);
    
    if (preferenceId) {
      try {
        await supabase
          .from('view_preferences')
          .delete()
          .eq('id', preferenceId);
        setPreferenceId(null);
      } catch (error) {
        console.error('Error resetting preferences:', error);
      }
    }
  };

  return {
    preferences,
    loading,
    updateFilters,
    updateSort,
    updateVisibleColumns,
    updatePageSize,
    resetPreferences,
  };
}
