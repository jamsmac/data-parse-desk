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
    const previousPeriodStart = new Date(startDate.getTime() - period * 24 * 60 * 60 * 1000);

    // Собираем данные для текущего периода
    const { data: currentActivities } = await supabase
      .from('activities')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(200);

    // Собираем данные для предыдущего периода (для сравнения)
    const { data: previousActivities } = await supabase
      .from('activities')
      .select('*')
      .gte('created_at', previousPeriodStart.toISOString())
      .lte('created_at', startDate.toISOString())
      .limit(200);

    const { data: databases } = await supabase
      .from('databases')
      .select('id, name, created_at')
      .eq('project_id', project_id);

    // Получаем данные из таблиц для статистического анализа
    const { data: tableData } = await supabase
      .from('table_data')
      .select('database_id, data, created_at')
      .gte('created_at', startDate.toISOString())
      .limit(500);

    // Используем AI для комплексного анализа
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Подготавливаем статистику
    const currentStats = {
      period: analysis_type,
      activities_count: currentActivities?.length || 0,
      databases_count: databases?.length || 0,
      records_created: tableData?.length || 0,
      actions_breakdown: currentActivities?.reduce((acc, act) => {
        acc[act.action] = (acc[act.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    const previousStats = {
      activities_count: previousActivities?.length || 0,
      actions_breakdown: previousActivities?.reduce((acc, act) => {
        acc[act.action] = (acc[act.action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    const comparisonData = {
      current: currentStats,
      previous: previousStats,
      growth_percentage: previousStats.activities_count > 0
        ? ((currentStats.activities_count - previousStats.activities_count) / previousStats.activities_count * 100).toFixed(1)
        : 'N/A',
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
            content: `Ты - AI аналитик для DATA PARSE DESK. Проанализируй данные и найди:

1. **Аномалии** - необычные паттерны, резкие изменения, подозрительная активность
2. **Тренды** - устойчивые изменения, долгосрочные паттерны
3. **Рекомендации** - действия для улучшения эффективности

Верни ответ в формате JSON:
{
  "summary": "краткая сводка (2-3 предложения)",
  "anomalies": [
    {
      "title": "заголовок аномалии",
      "description": "описание",
      "severity": "info|warning|critical",
      "data": {}
    }
  ],
  "trends": [
    {
      "title": "заголовок тренда",
      "description": "описание",
      "direction": "up|down|stable",
      "data": {}
    }
  ],
  "recommendations": [
    {
      "title": "заголовок рекомендации",
      "description": "описание",
      "priority": "low|medium|high",
      "data": {}
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Проанализируй ${analysis_type === 'daily' ? 'ежедневную' : 'еженедельную'} статистику:

**Сравнение периодов:**
${JSON.stringify(comparisonData, null, 2)}

**Активность по БД:**
${databases?.map(db => `- ${db.name}: создана ${new Date(db.created_at).toLocaleDateString('ru-RU')}`).join('\n')}

**Созданные записи:** ${currentStats.records_created}

Период: ${startDate.toLocaleDateString('ru-RU')} - ${now.toLocaleDateString('ru-RU')}`
          }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Insufficient credits. Please top up your AI credits.');
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisResult = JSON.parse(aiData.choices[0]?.message?.content || '{}');

    // Сохраняем insights в БД
    const insights = [];

    // Daily/Weekly summary
    insights.push({
      user_id,
      project_id,
      insight_type: analysis_type === 'daily' ? 'daily_summary' : 'weekly_summary',
      severity: 'info',
      title: `${analysis_type === 'daily' ? 'Ежедневная' : 'Еженедельная'} сводка`,
      description: analysisResult.summary || 'Анализ завершён',
      data: { stats: currentStats, comparison: comparisonData },
    });

    // Anomalies
    if (analysisResult.anomalies) {
      analysisResult.anomalies.forEach((anomaly: any) => {
        insights.push({
          user_id,
          project_id,
          insight_type: 'anomaly',
          severity: anomaly.severity || 'warning',
          title: anomaly.title,
          description: anomaly.description,
          data: anomaly.data || {},
        });
      });
    }

    // Trends
    if (analysisResult.trends) {
      analysisResult.trends.forEach((trend: any) => {
        insights.push({
          user_id,
          project_id,
          insight_type: 'trend',
          severity: 'info',
          title: trend.title,
          description: trend.description,
          data: { ...trend.data, direction: trend.direction },
        });
      });
    }

    // Recommendations
    if (analysisResult.recommendations) {
      analysisResult.recommendations.forEach((rec: any) => {
        insights.push({
          user_id,
          project_id,
          insight_type: 'recommendation',
          severity: rec.priority === 'high' ? 'warning' : 'info',
          title: rec.title,
          description: rec.description,
          data: { ...rec.data, priority: rec.priority },
        });
      });
    }

    // Сохраняем все insights
    const { error: insertError } = await supabase
      .from('ai_insights')
      .insert(insights);

    if (insertError) {
      console.error('Error inserting insights:', insertError);
    }

    // Отправляем уведомления (если настроено)
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('email_enabled, reports_enabled, telegram_enabled')
      .eq('user_id', user_id)
      .single();

    // Email notification
    if (prefs?.email_enabled && prefs?.reports_enabled) {
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id,
          type: 'ai_analysis_report',
          title: `${analysis_type === 'daily' ? 'Ежедневный' : 'Еженедельный'} AI отчет`,
          content: analysisResult.summary,
          metadata: {
            anomalies_count: analysisResult.anomalies?.length || 0,
            trends_count: analysisResult.trends?.length || 0,
            recommendations_count: analysisResult.recommendations?.length || 0,
          },
        },
      });
    }

    // Telegram notification
    if (prefs?.telegram_enabled) {
      const { data: telegramAccount } = await supabase
        .from('telegram_accounts')
        .select('telegram_id')
        .eq('user_id', user_id)
        .eq('is_active', true)
        .single();

      if (telegramAccount) {
        await supabase.functions.invoke('telegram-notify', {
          body: {
            user_id,
            notification_type: 'ai_insights',
            data: {
              title: `${analysis_type === 'daily' ? '📊 Ежедневный' : '📈 Еженедельный'} AI отчет`,
              summary: analysisResult.summary,
              anomalies: analysisResult.anomalies?.length || 0,
              trends: analysisResult.trends?.length || 0,
              recommendations: analysisResult.recommendations?.length || 0,
            },
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights_created: insights.length,
        analysis: analysisResult,
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
