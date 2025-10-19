import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define available tools
const AVAILABLE_TOOLS = [
  {
    type: "function",
    function: {
      name: "execute_sql_query",
      description: "Execute a read-only SQL query on the database to retrieve data. Use this when user asks about data, statistics, or specific records.",
      parameters: {
        type: "object",
        properties: {
          database_id: {
            type: "string",
            description: "The UUID of the database to query"
          },
          sql_query: {
            type: "string",
            description: "The SELECT SQL query to execute (read-only)"
          }
        },
        required: ["database_id", "sql_query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "aggregate_data",
      description: "Calculate aggregations (SUM, AVG, COUNT, MIN, MAX) on database columns.",
      parameters: {
        type: "object",
        properties: {
          database_id: {
            type: "string",
            description: "The UUID of the database"
          },
          column: {
            type: "string",
            description: "The column name to aggregate"
          },
          operation: {
            type: "string",
            enum: ["SUM", "AVG", "COUNT", "MIN", "MAX"],
            description: "The aggregation operation"
          },
          filters: {
            type: "object",
            description: "Optional filters to apply",
            additionalProperties: true
          }
        },
        required: ["database_id", "column", "operation"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_chart",
      description: "Create and save a chart visualization from data.",
      parameters: {
        type: "object",
        properties: {
          project_id: {
            type: "string",
            description: "The project ID where chart will be saved"
          },
          name: {
            type: "string",
            description: "Name for the chart"
          },
          chart_type: {
            type: "string",
            enum: ["line", "bar", "pie", "area"],
            description: "Type of chart to create"
          },
          database_id: {
            type: "string",
            description: "Database to pull data from"
          },
          x_column: {
            type: "string",
            description: "Column for X axis"
          },
          y_column: {
            type: "string",
            description: "Column for Y axis"
          }
        },
        required: ["project_id", "name", "chart_type", "database_id", "x_column", "y_column"]
      }
    }
  }
];

// Tool execution functions
async function executeSQL(supabase: any, database_id: string, sql_query: string) {
  console.log('Executing SQL:', sql_query, 'on database:', database_id);
  
  // Validate it's a SELECT query
  if (!sql_query.trim().toUpperCase().startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Get all table data for this database
  const { data: tableData, error } = await supabase
    .from('table_data')
    .select('data')
    .eq('database_id', database_id);

  if (error) throw error;

  // Extract all rows data
  const rows = tableData?.map((row: any) => row.data) || [];
  
  // Simple query parser for common patterns
  const query = sql_query.toLowerCase();
  let filteredRows = [...rows];
  
  // Handle WHERE clauses (basic support)
  if (query.includes('where')) {
    const whereMatch = query.match(/where\s+(.+?)(?:\s+order|\s+limit|$)/i);
    if (whereMatch) {
      const condition = whereMatch[1].trim();
      filteredRows = rows.filter((row: any) => {
        // Simple equality check: column = 'value' or column = value
        const eqMatch = condition.match(/(\w+)\s*=\s*[']?([^']+)[']?/);
        if (eqMatch) {
          const [, column, value] = eqMatch;
          return String(row[column]) === value.trim();
        }
        return true;
      });
    }
  }
  
  // Handle LIMIT
  const limitMatch = query.match(/limit\s+(\d+)/i);
  if (limitMatch) {
    const limit = parseInt(limitMatch[1]);
    filteredRows = filteredRows.slice(0, limit);
  }

  return { 
    rows: filteredRows, 
    count: filteredRows.length,
    total: rows.length 
  };
}

async function aggregateData(supabase: any, database_id: string, column: string, operation: string, filters?: any) {
  console.log('Aggregating:', operation, 'on column:', column, 'database:', database_id);

  const query = supabase
    .from('table_data')
    .select('data')
    .eq('database_id', database_id);

  const { data, error } = await query;
  if (error) throw error;

  if (!data || data.length === 0) {
    return { result: 0, operation, column };
  }

  const values = data
    .map((row: any) => row.data[column])
    .filter((val: any) => val !== null && val !== undefined && !isNaN(Number(val)))
    .map(Number);

  let result;
  switch (operation) {
    case 'SUM':
      result = values.reduce((a: number, b: number) => a + b, 0);
      break;
    case 'AVG':
      result = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
      break;
    case 'COUNT':
      result = values.length;
      break;
    case 'MIN':
      result = values.length > 0 ? Math.min(...values) : 0;
      break;
    case 'MAX':
      result = values.length > 0 ? Math.max(...values) : 0;
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  return { result, operation, column, count: values.length };
}

async function createChart(supabase: any, user_id: string, params: any) {
  console.log('Creating chart:', params);

  const chartConfig = {
    type: params.chart_type,
    database_id: params.database_id,
    x_column: params.x_column,
    y_column: params.y_column,
  };

  const { data, error } = await supabase
    .from('saved_charts')
    .insert({
      user_id,
      project_id: params.project_id,
      name: params.name,
      chart_config: chartConfig,
    })
    .select()
    .single();

  if (error) throw error;

  return { chart_id: data.id, name: params.name, config: chartConfig };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { conversation_id, message, database_id, project_id } = await req.json();

    if (!conversation_id || !message) {
      throw new Error('Missing required fields: conversation_id, message');
    }

    // Get conversation messages for context
    const { data: messages, error: messagesError } = await supabaseClient
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    // Build messages array
    const conversationMessages = [
      {
        role: 'system',
        content: `You are a helpful AI assistant for DATA PARSE DESK. You help users analyze data, create charts, and answer questions about their databases.
        
Current context:
- Database ID: ${database_id || 'not specified'}
- Project ID: ${project_id || 'not specified'}

Use the available tools to help users with their data analysis tasks.`
      },
      ...(messages || []).map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    console.log('Calling Lovable AI with tools...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: conversationMessages,
        tools: AVAILABLE_TOOLS,
        tool_choice: 'auto',
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      if (aiResponse.status === 402) {
        throw new Error('Insufficient credits');
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices?.[0];
    const toolCalls = choice?.message?.tool_calls;
    
    let finalContent = choice?.message?.content || '';
    const toolResults = [];

    // Execute tool calls if present
    if (toolCalls && toolCalls.length > 0) {
      console.log('Processing tool calls:', toolCalls.length);

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        console.log(`Executing tool: ${functionName}`, args);

        let result;
        try {
          switch (functionName) {
            case 'execute_sql_query':
              result = await executeSQL(supabaseClient, args.database_id, args.sql_query);
              break;
            case 'aggregate_data':
              result = await aggregateData(
                supabaseClient,
                args.database_id,
                args.column,
                args.operation,
                args.filters
              );
              break;
            case 'create_chart':
              result = await createChart(supabaseClient, user.id, args);
              break;
            default:
              result = { error: `Unknown tool: ${functionName}` };
          }

          toolResults.push({
            tool: functionName,
            arguments: args,
            result
          });

        } catch (error) {
          console.error(`Tool execution error (${functionName}):`, error);
          toolResults.push({
            tool: functionName,
            arguments: args,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // If tools were executed, call AI again with results
      if (toolResults.length > 0) {
        const toolResultsMessage = {
          role: 'assistant',
          content: `Tool execution results:\n${JSON.stringify(toolResults, null, 2)}`
        };

        const finalAiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              ...conversationMessages,
              toolResultsMessage,
              { role: 'user', content: 'Based on the tool results above, please provide a clear answer to my question.' }
            ],
          }),
        });

        if (finalAiResponse.ok) {
          const finalData = await finalAiResponse.json();
          finalContent = finalData.choices?.[0]?.message?.content || finalContent;
        }
      }
    }

    // Save user message
    await supabaseClient.from('ai_messages').insert({
      conversation_id,
      role: 'user',
      content: message,
    });

    // Save assistant message
    await supabaseClient.from('ai_messages').insert({
      conversation_id,
      role: 'assistant',
      content: finalContent,
      tool_calls: toolCalls ? JSON.stringify(toolCalls) : null,
      tool_results: toolResults.length > 0 ? JSON.stringify(toolResults) : null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        response: finalContent,
        tool_results: toolResults,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('AI Orchestrator error:', error);
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
