import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';


serve(async (req) => {
  // Get secure CORS headers based on origin
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
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

    const { composite_view_id, row_identifier, column_name, column_type, data } = await req.json();

    if (!composite_view_id || !row_identifier || !column_name || !column_type) {
      throw new Error('Missing required fields');
    }

    // Verify permissions
    const { data: view, error: viewError } = await supabase
      .from('composite_views')
      .select('project_id')
      .eq('id', composite_view_id)
      .single();

    if (viewError || !view) {
      throw new Error('Composite view not found');
    }

    // Check if user is owner of the project
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', view.project_id)
      .single();

    const isOwner = project?.user_id === user.id;
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', view.project_id)
      .eq('user_id', user.id)
      .single();

    if (!isOwner && (!member || !['owner', 'editor'].includes(member.role))) {
      throw new Error('Insufficient permissions');
    }

    // Validate data based on column type
    let validatedData = data;

    switch (column_type) {
      case 'formula':
        // For formula columns, we need to evaluate the expression
        if (!data.expression) {
          throw new Error('Formula data must have expression');
        }

        // Get the full row data for formula evaluation
        const { data: viewConfig } = await supabase
          .from('composite_views')
          .select('view_definition, custom_columns')
          .eq('id', composite_view_id)
          .single();

        if (!viewConfig) {
          throw new Error('Could not load view configuration');
        }

        // Query the actual row data from the composite view
        const { data: queryResult } = await supabase.functions.invoke('composite-views-query', {
          body: {
            composite_view_id,
            filters: [
              { column: 'row_num', operator: 'equals', value: row_identifier }
            ],
            page: 1,
            page_size: 1
          }
        });

        if (!queryResult?.rows?.[0]) {
          throw new Error('Row not found in composite view');
        }

        const rowData = queryResult.rows[0];

        // Evaluate formula using the evaluate-formula edge function
        const { data: formulaResult, error: formulaError } = await supabase.functions.invoke('evaluate-formula', {
          body: {
            expression: data.expression,
            rowData: rowData,
            returnType: data.return_type || 'text'
          }
        });

        if (formulaError) {
          throw new Error(`Formula evaluation failed: ${formulaError.message}`);
        }

        validatedData = {
          expression: data.expression,
          result: formulaResult.result,
          return_type: data.return_type || 'text',
          dependencies: data.dependencies || [],
          calculated_at: new Date().toISOString()
        };
        break;

      case 'checklist':
        if (!Array.isArray(data.items)) {
          throw new Error('Checklist data must have items array');
        }
        validatedData = {
          items: data.items,
          completed: data.items.filter((item: any) => item.checked).length,
          total: data.items.length,
        };
        break;

      case 'status':
        if (!data.value) {
          throw new Error('Status data must have value');
        }
        validatedData = {
          value: data.value,
          color: data.color || '#gray',
          label: data.label || data.value,
        };
        break;

      case 'progress':
        const progress = parseInt(data.value);
        if (isNaN(progress) || progress < 0 || progress > 100) {
          throw new Error('Progress must be between 0 and 100');
        }
        validatedData = {
          value: progress,
          auto_calculate: data.auto_calculate || false,
          source_checklist: data.source_checklist,
        };
        break;
    }

    // Upsert custom data
    const { data: customData, error: upsertError } = await supabase
      .from('composite_view_custom_data')
      .upsert({
        composite_view_id,
        row_identifier,
        column_name,
        column_type,
        data: validatedData,
      })
      .select()
      .single();

    if (upsertError) {
      throw new Error(`Failed to update custom data: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        custom_data: customData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Update Custom Data] Error:', error);
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
