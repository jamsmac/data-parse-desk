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
    const { user_id, project_id, analysis_type = 'daily' } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Определяем период анализа
    const now = new Date();
    const period = analysis_type === 'daily' ? 1 : 7; // дней назад
    const startDate = new Date(now.getTime() - period * 24 * 60 * 60 * 1000);

    // Собираем данные для анализа
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: databases } = await supabase
      .from('databases')
      .select('id, name, created_at')
      .eq('project_id', project_id)
      .gte('created_at', startDate.toISOString());

    // Используем AI для анализа
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const stats = {
      period: analysis_type,
      activities_count: activities?.length || 0,
      new_databases: databases?.length || 0,
      most_active_actions: activities?.reduce((acc, act) => {
        acc[act.action] = (acc[act.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

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
            content: `Ты - аналитик данных для DATA PARSE DESK. 
            Проанализируй статистику использования и предоставь краткий отчет на русском языке.
            
Формат ответа:
1. Краткая сводка (2-3 предложения)
2. Основные метрики
3. Тренды и паттерны
4. Рекомендации (3-5 пунктов)`
          },
          {
            role: 'user',
            content: `Проанализируй ${analysis_type === 'daily' ? 'ежедневную' : 'еженедельную'} статистику:
            
${JSON.stringify(stats, null, 2)}

Период: ${startDate.toLocaleDateString('ru-RU')} - ${now.toLocaleDateString('ru-RU')}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices[0]?.message?.content || 'Анализ не удался';

    // Сохраняем результат анализа
    const reportData = {
      user_id,
      project_id,
      analysis_type,
      period_start: startDate.toISOString(),
      period_end: now.toISOString(),
      stats,
      analysis,
      created_at: now.toISOString(),
    };

    // Сохраняем в таблицу (если есть)
    // await supabase.from('ai_analysis_reports').insert(reportData);

    // Отправляем email уведомление (если настроено)
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_enabled, reports_enabled')
      .eq('user_id', user_id)
      .single();

    if (prefs?.email_enabled && prefs?.reports_enabled) {
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id,
          type: 'ai_analysis_report',
          title: `${analysis_type === 'daily' ? 'Ежедневный' : 'Еженедельный'} AI отчет`,
          content: analysis,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        report: reportData,
        analysis,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
