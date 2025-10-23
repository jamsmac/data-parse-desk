import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { INSIGHTS_GENERATION_PROMPT, getModelConfig, callAIWithRetry } from '../_shared/prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_API_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

interface Insight {
  type: 'trend' | 'anomaly' | 'suggestion' | 'reminder';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  action?: string;
  metadata?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { database_id, user_id } = await req.json();

    if (!database_id || !user_id) {
      throw new Error('Missing required parameters');
    }

    const insights: Insight[] = [];

    // Get database info
    const { data: database } = await supabaseClient
      .from('databases')
      .select('*, table_schemas!inner(*)')
      .eq('id', database_id)
      .single();

    if (!database) {
      throw new Error('Database not found');
    }

    // Get table data statistics
    const { data: tableData, count: totalRecords } = await supabaseClient
      .from('table_data')
      .select('data, created_at', { count: 'exact' })
      .eq('database_id', database_id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!tableData || tableData.length === 0) {
      insights.push({
        type: 'reminder',
        severity: 'low',
        title: 'Пустая база данных',
        description: 'В вашей базе данных пока нет записей',
        action: 'Импортируйте данные для начала работы',
      });

      return new Response(
        JSON.stringify({ insights }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for recent activity
    const recentRecords = tableData.filter(row => {
      const createdAt = new Date(row.created_at);
      const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 7;
    });

    if (recentRecords.length === 0 && totalRecords! > 0) {
      insights.push({
        type: 'reminder',
        severity: 'medium',
        title: 'Нет недавних обновлений',
        description: `Последнее обновление было более 7 дней назад`,
        action: 'Проверьте актуальность данных',
      });
    }

    // Analyze numeric columns for trends
    const numericColumns = database.table_schemas
      .filter((schema: any) => schema.data_type === 'number' || schema.column_type === 'decimal')
      .map((schema: any) => schema.column_name);

    for (const column of numericColumns) {
      const values = tableData
        .map(row => row.data[column])
        .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
        .map(Number);

      if (values.length < 5) continue;

      // Calculate basic statistics
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      // Check for outliers
      const stdDev = Math.sqrt(
        values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length
      );

      const outliers = values.filter(v => Math.abs(v - avg) > 2 * stdDev);

      if (outliers.length > 0) {
        insights.push({
          type: 'anomaly',
          severity: 'medium',
          title: `Обнаружены аномалии в "${column}"`,
          description: `Найдено ${outliers.length} значений, отклоняющихся от нормы`,
          metadata: {
            column,
            outliers: outliers.slice(0, 5),
            avg: avg.toFixed(2),
            stdDev: stdDev.toFixed(2),
          },
        });
      }

      // Analyze trend (last 10 vs previous 10)
      if (values.length >= 20) {
        const recent = values.slice(0, 10);
        const previous = values.slice(10, 20);

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

        const change = ((recentAvg - previousAvg) / previousAvg) * 100;

        if (Math.abs(change) > 15) {
          insights.push({
            type: 'trend',
            severity: Math.abs(change) > 30 ? 'high' : 'medium',
            title: `${change > 0 ? 'Рост' : 'Снижение'} показателя "${column}"`,
            description: `Значение ${change > 0 ? 'выросло' : 'снизилось'} на ${Math.abs(change).toFixed(1)}%`,
            metadata: {
              column,
              change: change.toFixed(1),
              recentAvg: recentAvg.toFixed(2),
              previousAvg: previousAvg.toFixed(2),
            },
          });
        }
      }
    }

    // Check for missing values
    const allColumns = database.table_schemas.map((schema: any) => schema.column_name);

    for (const column of allColumns) {
      const missingCount = tableData.filter(
        row => row.data[column] === null || row.data[column] === undefined || row.data[column] === ''
      ).length;

      const missingPercentage = (missingCount / tableData.length) * 100;

      if (missingPercentage > 20) {
        insights.push({
          type: 'suggestion',
          severity: missingPercentage > 50 ? 'high' : 'medium',
          title: `Много пропущенных значений в "${column}"`,
          description: `${missingPercentage.toFixed(1)}% записей не имеют значения`,
          action: 'Проверьте источник данных или настройте импорт',
          metadata: {
            column,
            missingCount,
            missingPercentage: missingPercentage.toFixed(1),
          },
        });
      }
    }

    // Check database size
    if (totalRecords! > 1000) {
      insights.push({
        type: 'suggestion',
        severity: 'low',
        title: 'Большой объём данных',
        description: `База содержит ${totalRecords} записей`,
        action: 'Рассмотрите возможность архивирования старых данных',
        metadata: {
          totalRecords,
        },
      });
    }

    // Generate AI-powered insights if we have enough data
    if (LOVABLE_API_KEY && tableData.length >= 10) {
      try {
        console.log('[Insights] Generating AI-powered insights...');

        // Prepare data summary for AI
        const dataSummary = {
          totalRecords: totalRecords,
          recentRecords: recentRecords.length,
          columnsAnalyzed: numericColumns.length,
          sampleData: tableData.slice(0, 20).map(row => row.data),
          schema: database.table_schemas.map((schema: any) => ({
            name: schema.column_name,
            type: schema.data_type,
          })),
        };

        const modelConfig = getModelConfig('insights');

        const aiResponse = await callAIWithRetry(
          AI_API_URL,
          LOVABLE_API_KEY,
          {
            model: modelConfig.model,
            messages: [
              { role: 'system', content: INSIGHTS_GENERATION_PROMPT },
              {
                role: 'user',
                content: `Analyze this database and provide insights:\n\n${JSON.stringify(dataSummary, null, 2)}`,
              },
            ],
            temperature: modelConfig.temperature,
            max_tokens: modelConfig.maxOutputTokens,
          }
        );

        const aiResult = await aiResponse.json();
        const aiContent = aiResult.choices?.[0]?.message?.content || '';

        // Parse AI insights
        try {
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiInsights = JSON.parse(jsonMatch[0]);

            // Add AI insights to the list
            if (aiInsights.insights && Array.isArray(aiInsights.insights)) {
              aiInsights.insights.forEach((aiInsight: any) => {
                insights.push({
                  type: aiInsight.type || 'suggestion',
                  severity: aiInsight.severity || 'medium',
                  title: aiInsight.title || 'AI Insight',
                  description: aiInsight.description || '',
                  action: aiInsight.action,
                  metadata: aiInsight.metadata,
                });
              });

              console.log('[Insights] Added', aiInsights.insights.length, 'AI-powered insights');
            }
          }
        } catch (parseError) {
          console.warn('[Insights] Could not parse AI response:', parseError);
        }
      } catch (aiError) {
        console.warn('[Insights] AI insights generation failed:', aiError);
        // Continue with rule-based insights only
      }
    }

    // Save insights to database
    const insightsToSave = insights.map(insight => ({
      database_id,
      user_id,
      type: insight.type,
      severity: insight.severity,
      title: insight.title,
      description: insight.description,
      action: insight.action,
      metadata: insight.metadata,
      is_dismissed: false,
    }));

    if (insightsToSave.length > 0) {
      await supabaseClient
        .from('data_insights')
        .insert(insightsToSave);
    }

    return new Response(
      JSON.stringify({ insights, count: insights.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating insights:', error);
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
