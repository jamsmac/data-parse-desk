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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { projectId, schema } = await req.json();

    if (!projectId || !schema || !schema.entities) {
      throw new Error('Missing required parameters');
    }

    // Verify project access
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      throw new Error('Project not found');
    }

    if (project.user_id !== user.id) {
      // Check if user is member
      const { data: member } = await supabaseClient
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!member || !['owner', 'editor'].includes(member.role)) {
        throw new Error('Insufficient permissions');
      }
    }

    const createdDatabases = [];

    // Create databases for each entity
    for (const entity of schema.entities) {
      console.log(`Creating database for entity: ${entity.name}`);

      // Create database
      const { data: database, error: dbError } = await supabaseClient.rpc('create_database', {
        name: entity.name,
        user_id: user.id,
        description: entity.reasoning || `AI-generated table from schema`,
        icon: '🤖',
        color: '#6366f1',
        project_id: projectId,
      });

      if (dbError) {
        console.error('Error creating database:', dbError);
        throw new Error(`Failed to create database ${entity.name}: ${dbError.message}`);
      }

      if (!database) {
        throw new Error(`Failed to create database ${entity.name}`);
      }

      // Create table schemas for columns
      for (let i = 0; i < entity.columns.length; i++) {
        const column = entity.columns[i];
        
        // Map AI types to database types
        let columnType = column.type;
        if (column.type === 'number') columnType = 'number';
        else if (column.type === 'boolean') columnType = 'boolean';
        else if (column.type === 'date') columnType = 'date';
        else if (column.type === 'timestamp' || column.type === 'timestamptz') columnType = 'date';
        else if (column.type === 'json' || column.type === 'jsonb') columnType = 'text'; // Store as text for now
        else columnType = 'text';

        const { error: schemaError } = await supabaseClient.rpc('create_table_schema', {
          p_database_id: database.id,
          p_column_name: column.name,
          p_column_type: columnType,
          p_is_required: !column.nullable,
          p_default_value: column.default ? { value: column.default } : null,
          p_position: i,
        });

        if (schemaError) {
          console.error('Error creating column:', schemaError);
          // Continue with other columns
        }
      }

      createdDatabases.push({
        id: database.id,
        name: entity.name,
        columns: entity.columns.length,
      });
    }

    // TODO: Create relationships between databases
    // This would require a separate database_relations table setup

    console.log(`Successfully created ${createdDatabases.length} databases`);

    return new Response(
      JSON.stringify({
        success: true,
        databases: createdDatabases,
        message: `Created ${createdDatabases.length} tables successfully`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[AI Create Schema] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
