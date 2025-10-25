import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';


interface TableRef {
  database_id: string;
  table_name: string;
  alias: string;
}

interface JoinConfig {
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  left: string; // e.g., "o.customer_id"
  right: string; // e.g., "c.id"
}

interface ColumnConfig {
  source: string; // e.g., "o.id"
  alias: string;
  visible: boolean;
}

interface CustomColumnConfig {
  name: string;
  type: 'checklist' | 'status' | 'progress';
  config: any;
}

interface CompositeViewConfig {
  tables: TableRef[];
  joins: JoinConfig[];
  columns: ColumnConfig[];
  custom_columns?: CustomColumnConfig[];
}

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

    const { project_id, name, description, config } = await req.json() as {
      project_id: string;
      name: string;
      description?: string;
      config: CompositeViewConfig;
    };

    // Validate input
    if (!project_id || !name || !config) {
      throw new Error('Missing required fields');
    }

    // Verify user has access to project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    // Check if user is owner or editor
    const isOwner = project.user_id === user.id;
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', project_id)
      .eq('user_id', user.id)
      .single();

    if (!isOwner && (!member || !['owner', 'editor'].includes(member.role))) {
      throw new Error('Insufficient permissions');
    }

    // Generate SQL query from config
    const sqlQuery = generateSQL(config);

    // Test query execution (dry run)
    try {
      const testResult = await supabase.rpc('execute_readonly_sql', {
        sql: `${sqlQuery} LIMIT 1`
      });
      
      if (testResult.error) {
        throw new Error(`Invalid SQL: ${testResult.error.message}`);
      }
    } catch (error) {
      throw new Error(`Query validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Create composite view
    const { data: compositeView, error: createError } = await supabase
      .from('composite_views')
      .insert({
        project_id,
        name,
        description,
        config,
        sql_query: sqlQuery,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create composite view: ${createError.message}`);
    }

    // Log activity
    await supabase.from('activities').insert({
      user_id: user.id,
      project_id,
      action: 'create',
      entity_type: 'composite_view',
      entity_id: compositeView.id,
      entity_name: name,
    });

    return new Response(
      JSON.stringify({
        success: true,
        composite_view: compositeView,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Composite Views Create] Error:', error);
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

function generateSQL(config: CompositeViewConfig): string {
  const { tables, joins, columns } = config;

  if (!tables || tables.length === 0) {
    throw new Error('At least one table required');
  }

  // SELECT clause with ROW_NUMBER for unique identification
  const columnList = columns
    .filter(c => c.visible)
    .map(c => `${c.source} AS ${c.alias}`)
    .join(', ');

  const primaryTable = tables[0];
  let sql = `SELECT ROW_NUMBER() OVER () AS row_num, ${columnList}\n`;
  sql += `FROM ${primaryTable.table_name} AS ${primaryTable.alias}`;

  // JOIN clauses
  for (let i = 0; i < joins.length; i++) {
    const join = joins[i];
    const joinTable = tables[i + 1]; // tables[0] is primary, tables[1+] are joined
    
    if (!joinTable) continue;

    sql += `\n${join.type} JOIN ${joinTable.table_name} AS ${joinTable.alias}`;
    sql += ` ON ${join.left} = ${join.right}`;
  }

  return sql;
}
