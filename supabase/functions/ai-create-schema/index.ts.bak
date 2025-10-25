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

    // Create relationships between databases
    const createdRelations = [];
    if (schema.relationships && Array.isArray(schema.relationships)) {
      // Create mapping of entity names to database IDs
      const entityToDatabaseId = new Map();
      for (const db of createdDatabases) {
        entityToDatabaseId.set(db.name, db.id);
      }

      for (const relationship of schema.relationships) {
        try {
          const sourceDatabaseId = entityToDatabaseId.get(relationship.from);
          const targetDatabaseId = entityToDatabaseId.get(relationship.to);

          if (!sourceDatabaseId || !targetDatabaseId) {
            console.warn(`Skipping relationship: ${relationship.from} -> ${relationship.to} (database not found)`);
            continue;
          }

          // Parse the ON clause to get column names
          // Expected format: "orders.customer_id = customers.id"
          const onMatch = relationship.on?.match(/(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/);
          if (!onMatch) {
            console.warn(`Skipping relationship: invalid ON clause format: ${relationship.on}`);
            continue;
          }

          const sourceColumn = onMatch[2];
          const targetColumn = onMatch[4];

          // Map relationship type
          let relationType = relationship.type;
          if (relationship.type === 'many-to-one') {
            relationType = 'many_to_one';
          } else if (relationship.type === 'one-to-many') {
            relationType = 'one_to_many';
          } else if (relationship.type === 'many-to-many') {
            relationType = 'many_to_many';
          } else if (relationship.type === 'one-to-one') {
            relationType = 'one_to_many'; // Store as one_to_many with unique constraint
          }

          const { data: relation, error: relationError } = await supabaseClient.rpc('create_database_relation', {
            p_source_database_id: sourceDatabaseId,
            p_target_database_id: targetDatabaseId,
            p_relation_type: relationType,
            p_source_column: sourceColumn,
            p_target_column: targetColumn,
            p_cascade_delete: false,
          });

          if (relationError) {
            console.error('Error creating relation:', relationError);
            // Continue with other relations
          } else {
            createdRelations.push({
              from: relationship.from,
              to: relationship.to,
              type: relationship.type,
            });
          }
        } catch (err) {
          console.error('Error processing relationship:', err);
          // Continue with other relations
        }
      }
    }

    console.log(`Successfully created ${createdDatabases.length} databases and ${createdRelations.length} relationships`);

    // Save schema version for version control
    try {
      const versionResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/schema-version-create`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId,
            schemaData: {
              entities: schema.entities,
              relationships: schema.relationships,
              metadata: {
                created_databases: createdDatabases,
                created_relationships: createdRelations,
              },
            },
            description: `AI-generated schema: ${createdDatabases.length} tables, ${createdRelations.length} relations`,
            tagName: 'ai-generated',
            tagDescription: 'Automatically created by AI Schema Generator',
          }),
        }
      );

      if (versionResponse.ok) {
        const versionResult = await versionResponse.json();
        console.log('[AI Create Schema] Schema version saved:', versionResult.version?.version_number);
      } else {
        console.warn('[AI Create Schema] Failed to save schema version:', await versionResponse.text());
      }
    } catch (versionError) {
      console.warn('[AI Create Schema] Error saving schema version:', versionError);
      // Don't fail the whole request if version saving fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        databases: createdDatabases,
        relationships: createdRelations,
        message: `Created ${createdDatabases.length} tables and ${createdRelations.length} relationships successfully`,
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
