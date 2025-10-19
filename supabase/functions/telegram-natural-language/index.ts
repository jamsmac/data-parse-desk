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
            content: `Ты - помощник для работы с базами данных DATA PARSE DESK. ${context}
            
Преобразуй запрос пользователя в структурированный ответ с действиями.
Доступные действия:
- query_data: запрос данных из базы
- create_record: создание новой записи
- update_record: обновление записи
- get_stats: получение статистики
- list_databases: список баз данных
- help: справка

Отвечай ТОЛЬКО в формате JSON:
{
  "action": "название_действия",
  "params": {...},
  "response": "понятное объяснение для пользователя"
}`
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
              name: 'process_query',
              description: 'Process natural language database query',
              parameters: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    enum: ['query_data', 'create_record', 'update_record', 'get_stats', 'list_databases', 'help']
                  },
                  params: {
                    type: 'object',
                    description: 'Parameters for the action'
                  },
                  response: {
                    type: 'string',
                    description: 'User-friendly explanation'
                  }
                },
                required: ['action', 'response']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'process_query' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);

    // Извлекаем результат из tool call
    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({
          action: 'help',
          response: 'Извините, не удалось понять запрос. Попробуйте сформулировать иначе.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Выполняем действие
    let data = null;
    if (result.action === 'list_databases' && project_id) {
      const { data: dbList } = await supabase
        .from('databases')
        .select('id, name, description')
        .eq('project_id', project_id);
      data = dbList;
    } else if (result.action === 'get_stats' && project_id) {
      const { count } = await supabase
        .from('databases')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', project_id);
      data = { database_count: count };
    }

    return new Response(
      JSON.stringify({
        action: result.action,
        params: result.params,
        response: result.response,
        data,
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
