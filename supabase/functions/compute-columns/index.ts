import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface ComputeColumnsRequest {
  databaseId: string;
  rowIds?: string[]; // If not provided, compute for all rows
  columnTypes?: ('lookup' | 'rollup')[]; // If not provided, compute both
}

interface ColumnSchema {
  column_name: string;
  column_type: 'lookup' | 'rollup';
  lookup_config?: {
    relation_column: string;
    target_column: string;
    target_database_id: string;
  };
  rollup_config?: {
    relation_column: string;
    target_column: string;
    target_database_id: string;
    aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'median';
    relation_type: 'one_to_many' | 'many_to_one';
  };
}

interface ComputeColumnsResponse {
  success: boolean;
  updated_rows: number;
  lookup_updates: number;
  rollup_updates: number;
  duration_ms: number;
  errors?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { databaseId, rowIds, columnTypes = ['lookup', 'rollup'] }: ComputeColumnsRequest = await req.json();

    if (!databaseId) {
      throw new Error('databaseId is required');
    }

    const startTime = performance.now();
    const errors: string[] = [];
    let lookupUpdates = 0;
    let rollupUpdates = 0;

    // 1. Get column schemas for this database
    const { data: schemas, error: schemaError } = await supabaseClient
      .from('table_schemas')
      .select('column_name, column_type, lookup_config, rollup_config')
      .eq('database_id', databaseId)
      .in('column_type', columnTypes);

    if (schemaError) {
      throw new Error(`Failed to fetch schemas: ${schemaError.message}`);
    }

    if (!schemas || schemas.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          updated_rows: 0,
          lookup_updates: 0,
          rollup_updates: 0,
          duration_ms: performance.now() - startTime,
          message: 'No computed columns found for this database',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lookupSchemas = schemas.filter(s => s.column_type === 'lookup') as ColumnSchema[];
    const rollupSchemas = schemas.filter(s => s.column_type === 'rollup') as ColumnSchema[];

    // 2. Get rows to update
    let query = supabaseClient
      .from('table_data')
      .select('id, data')
      .eq('database_id', databaseId);

    if (rowIds && rowIds.length > 0) {
      query = query.in('id', rowIds);
    }

    const { data: rows, error: rowsError } = await query;

    if (rowsError) {
      throw new Error(`Failed to fetch rows: ${rowsError.message}`);
    }

    if (!rows || rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          updated_rows: 0,
          lookup_updates: 0,
          rollup_updates: 0,
          duration_ms: performance.now() - startTime,
          message: 'No rows found to update',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Compute lookup columns (batch by target database)
    if (lookupSchemas.length > 0) {
      const lookupResult = await computeLookups(supabaseClient, databaseId, rows, lookupSchemas);
      lookupUpdates = lookupResult.updates;
      if (lookupResult.errors.length > 0) {
        errors.push(...lookupResult.errors);
      }
    }

    // 4. Compute rollup columns (call PostgreSQL function for efficiency)
    if (rollupSchemas.length > 0) {
      const rollupResult = await computeRollups(supabaseClient, databaseId, rows.map(r => r.id), rollupSchemas);
      rollupUpdates = rollupResult.updates;
      if (rollupResult.errors.length > 0) {
        errors.push(...rollupResult.errors);
      }
    }

    const duration = performance.now() - startTime;

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        updated_rows: rows.length,
        lookup_updates: lookupUpdates,
        rollup_updates: rollupUpdates,
        duration_ms: Math.round(duration * 100) / 100,
        errors: errors.length > 0 ? errors : undefined,
      } as ComputeColumnsResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in compute-columns function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Compute lookup columns using batch resolution
 */
async function computeLookups(
  supabaseClient: any,
  databaseId: string,
  rows: any[],
  lookupSchemas: ColumnSchema[]
): Promise<{ updates: number; errors: string[] }> {
  const errors: string[] = [];
  let totalUpdates = 0;

  // Group lookups by target database for batch fetching
  const lookupsByTarget = new Map<string, ColumnSchema[]>();

  for (const schema of lookupSchemas) {
    if (!schema.lookup_config) continue;

    const targetDbId = schema.lookup_config.target_database_id;
    if (!lookupsByTarget.has(targetDbId)) {
      lookupsByTarget.set(targetDbId, []);
    }
    lookupsByTarget.get(targetDbId)!.push(schema);
  }

  // Process each target database
  for (const [targetDbId, schemas] of lookupsByTarget) {
    try {
      // 1. Collect all unique foreign IDs for this target
      const foreignIds = new Set<string>();

      for (const schema of schemas) {
        const relationColumn = schema.lookup_config!.relation_column;

        for (const row of rows) {
          const foreignId = row.data?.[relationColumn];
          if (foreignId && typeof foreignId === 'string') {
            foreignIds.add(foreignId);
          }
        }
      }

      if (foreignIds.size === 0) continue;

      // 2. Batch fetch all target records
      const { data: targetRecords, error: fetchError } = await supabaseClient
        .from('table_data')
        .select('id, data')
        .eq('database_id', targetDbId)
        .in('id', Array.from(foreignIds));

      if (fetchError) {
        errors.push(`Failed to fetch target records from ${targetDbId}: ${fetchError.message}`);
        continue;
      }

      // 3. Build cache for O(1) lookup
      const cache = new Map<string, any>();
      if (targetRecords) {
        for (const record of targetRecords) {
          cache.set(record.id, record.data);
        }
      }

      // 4. Update all rows with computed lookup values
      const updates = [];

      for (const row of rows) {
        const updatedData = { ...row.data };
        let hasChanges = false;

        for (const schema of schemas) {
          const relationColumn = schema.lookup_config!.relation_column;
          const targetColumn = schema.lookup_config!.target_column;
          const foreignId = row.data?.[relationColumn];

          if (!foreignId) {
            updatedData[schema.column_name] = null;
            hasChanges = true;
            continue;
          }

          const targetData = cache.get(foreignId);
          const lookupValue = targetData?.[targetColumn] ?? null;

          if (updatedData[schema.column_name] !== lookupValue) {
            updatedData[schema.column_name] = lookupValue;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          updates.push({
            id: row.id,
            data: updatedData,
          });
        }
      }

      // 5. Batch update rows
      if (updates.length > 0) {
        for (const update of updates) {
          const { error: updateError } = await supabaseClient
            .from('table_data')
            .update({ data: update.data })
            .eq('id', update.id);

          if (updateError) {
            errors.push(`Failed to update row ${update.id}: ${updateError.message}`);
          } else {
            totalUpdates++;
          }
        }
      }
    } catch (err) {
      errors.push(`Error processing target ${targetDbId}: ${err.message}`);
    }
  }

  return { updates: totalUpdates, errors };
}

/**
 * Compute rollup columns using PostgreSQL functions
 */
async function computeRollups(
  supabaseClient: any,
  databaseId: string,
  rowIds: string[],
  rollupSchemas: ColumnSchema[]
): Promise<{ updates: number; errors: string[] }> {
  const errors: string[] = [];
  let totalUpdates = 0;

  try {
    // Call PostgreSQL batch_compute_rollups function
    const { data, error } = await supabaseClient.rpc('batch_compute_rollups', {
      p_database_id: databaseId,
      p_row_ids: rowIds,
    });

    if (error) {
      errors.push(`Failed to compute rollups: ${error.message}`);
      return { updates: 0, errors };
    }

    if (!data || data.length === 0) {
      return { updates: 0, errors };
    }

    // Group results by row_id
    const resultsByRow = new Map<string, Map<string, number>>();

    for (const result of data) {
      if (!resultsByRow.has(result.row_id)) {
        resultsByRow.set(result.row_id, new Map());
      }
      resultsByRow.get(result.row_id)!.set(result.column_name, result.rollup_value);
    }

    // Fetch current rows and update with rollup values
    const { data: rows, error: rowsError } = await supabaseClient
      .from('table_data')
      .select('id, data')
      .eq('database_id', databaseId)
      .in('id', rowIds);

    if (rowsError) {
      errors.push(`Failed to fetch rows for rollup update: ${rowsError.message}`);
      return { updates: 0, errors };
    }

    // Update each row with computed rollup values
    for (const row of rows) {
      const rollupValues = resultsByRow.get(row.id);
      if (!rollupValues || rollupValues.size === 0) continue;

      const updatedData = { ...row.data };
      let hasChanges = false;

      for (const [columnName, value] of rollupValues) {
        if (updatedData[columnName] !== value) {
          updatedData[columnName] = value;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        const { error: updateError } = await supabaseClient
          .from('table_data')
          .update({ data: updatedData })
          .eq('id', row.id);

        if (updateError) {
          errors.push(`Failed to update row ${row.id}: ${updateError.message}`);
        } else {
          totalUpdates++;
        }
      }
    }
  } catch (err) {
    errors.push(`Error computing rollups: ${err.message}`);
  }

  return { updates: totalUpdates, errors };
}
