import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, user_id, project_id } = await req.json();

    if (!query || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Получаем контекст проекта
    let context = '';
    if (project_id) {
      const { data: databases } = await supabase
        .from('databases')
        .select('name, description')
        .eq('project_id', project_id)
        .limit(5);

      if (databases && databases.length > 0) {
        context = `Доступные базы данных: ${databases.map(d => d.name).join(', ')}.`;
      }
    }

    // Используем Lovable AI для обработки natural language query
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
        messages: [
          {
            role: 'system',
            content: `Ты - AI ассистент для DATA PARSE DESK. ${context}
            
Твоя задача - понять natural language запросы и преобразовать их в структурированные действия.

Примеры запросов:
- "Покажи последние 10 заказов" → query_data
- "Сколько заказов сегодня?" → get_stats  
- "Создай новый заказ на сумму 5000" → create_record
- "Список всех баз данных" → list_databases
- "Обнови статус заказа #123 на 'завершен'" → update_record
- "Какая средняя сумма заказа?" → aggregate_data
- "Покажи график продаж за месяц" → create_chart

Отвечай ТОЛЬКО в формате JSON с tool call.`
          },
          {
            role: 'user',
            content: query
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'process_nl_query',
              description: 'Process natural language database query and determine action',
              parameters: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: [
                      'query_data',
                      'create_record',
                      'update_record',
                      'get_stats',
                      'list_databases',
                      'aggregate_data',
                      'create_chart',
                      'help'
                    ],
                    description: 'The action to perform'
                  },
                  params: {
                    type: 'object',
                    properties: {
                      database_name: { type: 'string', description: 'Database name if mentioned' },
                      limit: { type: 'number', description: 'Number of results to return' },
                      filters: { type: 'object', description: 'Filters to apply' },
                      column: { type: 'string', description: 'Column name for aggregation' },
                      operation: { 
                        type: 'string',
                        enum: ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'],
                        description: 'Aggregation operation'
                      },
                      chart_type: {
                        type: 'string',
                        enum: ['line', 'bar', 'pie', 'area'],
                        description: 'Chart type'
                      },
                      time_period: { type: 'string', description: 'Time period for data' },
                      record_data: { type: 'object', description: 'Data for new record' },
                      record_id: { type: 'string', description: 'ID of record to update' },
                      updates: { type: 'object', description: 'Fields to update' },
                    },
                    additionalProperties: true
                  },
                  sql_hint: {
                    type: 'string',
                    description: 'SQL-like representation of the query for debugging'
                  },
                  response: {
                    type: 'string',
                    description: 'User-friendly explanation of what will be done'
                  },
                  requires_database: {
                    type: 'boolean',
                    description: 'Whether this action requires selecting a database'
                  }
                },
                required: ['action', 'response']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'process_nl_query' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Insufficient AI credits. Please top up your credits.');
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData, null, 2));

    // Извлекаем результат из tool call
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({
          action: 'help',
          response: 'Извините, не удалось понять запрос. Попробуйте переформулировать или используйте команды:\n\n' +
                    '/projects - список проектов\n' +
                    '/checklist - ваши чеклисты\n' +
                    '/stats - статистика\n' +
                    '/help - помощь',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('Parsed result:', result);

    // Выполняем действие на основе типа
    let data = null;
    let message = result.response;

    if (result.action === 'list_databases' && project_id) {
      const { data: dbList } = await supabase
        .from('databases')
        .select('id, name, description, created_at')
        .eq('project_id', project_id)
        .order('created_at', { ascending: false });
      
      data = dbList;
      
      if (dbList && dbList.length > 0) {
        message = `📊 Найдено ${dbList.length} баз данных:\n\n` +
          dbList.map((db, i) => `${i + 1}. ${db.name}${db.description ? ` - ${db.description}` : ''}`).join('\n');
      } else {
        message = 'У вас пока нет баз данных в этом проекте.';
      }
    } 
    
    else if (result.action === 'get_stats' && project_id) {
      const { data: databases } = await supabase
        .from('databases')
        .select('id')
        .eq('project_id', project_id);

      const databaseIds = databases?.map(d => d.id) || [];
      
      let totalRecords = 0;
      if (databaseIds.length > 0) {
        const { count } = await supabase
          .from('table_data')
          .select('*', { count: 'exact', head: true })
          .in('database_id', databaseIds);
        totalRecords = count || 0;
      }

      const { data: compositeViews } = await supabase
        .from('composite_views')
        .select('id')
        .eq('project_id', project_id);

      data = {
        database_count: databases?.length || 0,
        record_count: totalRecords,
        composite_view_count: compositeViews?.length || 0
      };
      
      message = `📈 Статистика проекта:\n\n` +
        `📊 Баз данных: ${data.database_count}\n` +
        `📝 Записей: ${data.record_count}\n` +
        `🔗 Composite Views: ${data.composite_view_count}`;
    }
    
    else if (result.action === 'aggregate_data' && result.params?.column && result.params?.operation) {
      message = `📊 Для выполнения агрегации "${result.params.operation}" по колонке "${result.params.column}" используйте веб-интерфейс или укажите базу данных.`;
    }
    
    else if (result.action === 'create_chart') {
      message = `📈 Для создания графика используйте веб-интерфейс в разделе Analytics.\n\n` +
        `Тип графика: ${result.params?.chart_type || 'bar'}\n` +
        `Период: ${result.params?.time_period || 'текущий месяц'}`;
    }
    
    else if (result.action === 'query_data') {
      if (result.requires_database) {
        message = `🔍 ${result.response}\n\nДля выполнения запроса укажите базу данных или используйте веб-интерфейс.`;
      }
    }

    return new Response(
      JSON.stringify({
        action: result.action,
        params: result.params || {},
        sql_hint: result.sql_hint,
        response: message,
        data,
        requires_database: result.requires_database,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'error',
        response: 'Произошла ошибка при обработке запроса. Попробуйте еще раз.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
