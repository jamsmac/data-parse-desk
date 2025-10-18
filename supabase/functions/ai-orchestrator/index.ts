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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Пользователь не авторизован');
    }

    const { agent_type, input_data } = await req.json();

    if (!agent_type || !input_data) {
      throw new Error('Отсутствуют обязательные параметры: agent_type, input_data');
    }

    // Get agent configuration
    const { data: agent, error: agentError } = await supabaseClient
      .from('ai_agents')
      .select('*')
      .eq('agent_type', agent_type)
      .eq('is_active', true)
      .single();

    if (agentError || !agent) {
      throw new Error(`Агент типа ${agent_type} не найден или неактивен`);
    }

    // Get user credits
    const { data: credits, error: creditsError } = await supabaseClient
      .from('user_credits')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (creditsError || !credits) {
      throw new Error('Не удалось получить информацию о кредитах');
    }

    const totalCredits = Number(credits.free_credits) + Number(credits.paid_credits);
    
    // Estimate cost (simplified - in reality would depend on tokens)
    const estimatedCost = 0.01; // Base cost per request
    
    if (totalCredits < estimatedCost) {
      throw new Error('Недостаточно кредитов для выполнения запроса');
    }

    // Create AI request record
    const { data: aiRequest, error: requestError } = await supabaseClient
      .from('ai_requests')
      .insert({
        user_id: user.id,
        agent_type,
        input_data,
        status: 'pending',
      })
      .select()
      .single();

    if (requestError) throw requestError;

    try {
      // Call Lovable AI Gateway
      const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
      if (!LOVABLE_API_KEY) {
        throw new Error('LOVABLE_API_KEY не настроен');
      }

      const messages = [
        { role: 'system', content: agent.system_prompt },
        { role: 'user', content: JSON.stringify(input_data) }
      ];

      console.log('Calling Lovable AI with model:', agent.model);

      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: agent.model || 'google/gemini-2.5-flash',
          messages,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI Gateway error:', aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          throw new Error('Превышен лимит запросов. Пожалуйста, попробуйте позже.');
        }
        if (aiResponse.status === 402) {
          throw new Error('Необходимо пополнить баланс кредитов в Lovable AI.');
        }
        
        throw new Error(`Ошибка AI Gateway: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const output = aiData.choices?.[0]?.message?.content;
      const tokensUsed = aiData.usage?.total_tokens || 100;

      // Calculate actual cost based on tokens
      const actualCost = (tokensUsed / 1000) * 0.01; // $0.01 per 1k tokens

      // Deduct credits (use free credits first)
      let remainingCost = actualCost;
      let newFreeCredits = Number(credits.free_credits);
      let newPaidCredits = Number(credits.paid_credits);

      if (newFreeCredits >= remainingCost) {
        newFreeCredits -= remainingCost;
      } else {
        remainingCost -= newFreeCredits;
        newFreeCredits = 0;
        newPaidCredits -= remainingCost;
      }

      // Update credits
      const { error: updateCreditsError } = await supabaseClient
        .from('user_credits')
        .update({
          free_credits: newFreeCredits,
          paid_credits: newPaidCredits,
          total_credits_used: Number(credits.total_credits_used) + actualCost,
        })
        .eq('user_id', user.id);

      if (updateCreditsError) {
        console.error('Error updating credits:', updateCreditsError);
      }

      // Create credit transaction
      await supabaseClient.from('credit_transactions').insert({
        user_id: user.id,
        transaction_type: 'debit',
        amount: -actualCost,
        balance_after: newFreeCredits + newPaidCredits,
        operation_type: 'ai_request',
        description: `AI запрос: ${agent.name}`,
      });

      // Update AI request with results
      const { error: updateError } = await supabaseClient
        .from('ai_requests')
        .update({
          status: 'completed',
          output_data: { response: output },
          tokens_used: tokensUsed,
          credits_used: actualCost,
          completed_at: new Date().toISOString(),
        })
        .eq('id', aiRequest.id);

      if (updateError) {
        console.error('Error updating AI request:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          request_id: aiRequest.id,
          output,
          tokens_used: tokensUsed,
          credits_used: actualCost,
          credits_remaining: newFreeCredits + newPaidCredits,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (aiError) {
      // Update AI request with error
      await supabaseClient
        .from('ai_requests')
        .update({
          status: 'failed',
          error_message: aiError instanceof Error ? aiError.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', aiRequest.id);

      throw aiError;
    }

  } catch (error) {
    console.error('AI Orchestrator error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});