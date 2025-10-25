import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { composite_view_id, filters, sort, page = 1, page_size = 100 } = await req.json();

    if (!composite_view_id) {
      throw new Error('composite_view_id required');
    }

    // Load composite view
    const { data: view, error: viewError } = await supabase
      .from('composite_views')
      .select('*, projects!inner(id, user_id)')
      .eq('id', composite_view_id)
      .single();

    if (viewError || !view) {
      throw new Error('Composite view not found');
    }

    // Check permissions
    const isOwner = view.projects.user_id === user.id;
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', view.project_id)
      .eq('user_id', user.id)
      .single();

    if (!isOwner && !member) {
      throw new Error('Access denied');
    }

    // Execute SQL query
    let sql = view.sql_query;

    // Apply filters (simplified - should be properly parameterized in production)
    if (filters && Object.keys(filters).length > 0) {
      const whereClause = Object.entries(filters)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(' AND ');
      sql += `\nWHERE ${whereClause}`;
    }

    // Apply sorting
    if (sort) {
      sql += `\nORDER BY ${sort.column} ${sort.direction || 'ASC'}`;
    }

    // Apply pagination
    const offset = (page - 1) * page_size;
    sql += `\nLIMIT ${page_size} OFFSET ${offset}`;

    // Execute query
    const { data: rows, error: queryError } = await supabase.rpc('execute_readonly_sql', {
      sql: sql
    });

    if (queryError) {
      throw new Error(`Query execution failed: ${queryError.message}`);
    }

    // Load custom data for each row
    const customColumns = view.config.custom_columns || [];
    if (customColumns.length > 0 && rows && rows.length > 0) {
      const rowIdentifiers = rows.map((r: any) => r.row_num.toString());
      
      const { data: customData } = await supabase
        .from('composite_view_custom_data')
        .select('*')
        .eq('composite_view_id', composite_view_id)
        .in('row_identifier', rowIdentifiers);

      // Merge custom data into rows
      if (customData) {
        rows.forEach((row: any) => {
          const rowCustomData = customData.filter(
            (cd: any) => cd.row_identifier === row.row_num.toString()
          );
          
          rowCustomData.forEach((cd: any) => {
            row[cd.column_name] = cd.data;
          });
        });
      }
    }

    // Get total count (simplified - should use COUNT(*) for better performance)
    const countSql = view.sql_query.replace(/^SELECT .+ FROM/, 'SELECT COUNT(*) as total FROM');
    const { data: countResult } = await supabase.rpc('execute_readonly_sql', {
      sql: countSql
    });

    const total_count = countResult?.[0]?.total || rows?.length || 0;

    return new Response(
      JSON.stringify({
        rows: rows || [],
        total_count,
        page,
        page_size,
        total_pages: Math.ceil(total_count / page_size),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Composite Views Query] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
