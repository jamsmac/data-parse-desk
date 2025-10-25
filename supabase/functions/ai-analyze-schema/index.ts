import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { SCHEMA_ANALYZER_PROMPT, getModelConfig, callAIWithRetry } from '../_shared/prompts.ts';
import { getCorsHeaders, handleCorsPrelight } from '../_shared/security.ts';



serve(async (req) => {
  // Get secure CORS headers based on origin
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCorsPrelight(req);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { input, inputType, projectId } = await req.json();

    if (!input || !inputType) {
      throw new Error('Missing required parameters');
    }

    // Prepare input for AI
    let preparedInput = '';
    if (inputType === 'text') {
      preparedInput = input;
    } else if (inputType === 'json') {
      preparedInput = `Analyze this JSON structure and generate a database schema:\n\n${input}`;
    } else if (inputType === 'csv') {
      preparedInput = `Analyze this CSV data and generate a database schema:\n\n${input}`;
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI for schema analysis...');

    const modelConfig = getModelConfig('schema');

    const aiResponse = await callAIWithRetry(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      LOVABLE_API_KEY,
      {
        model: modelConfig.model,
        messages: [
          { role: 'system', content: SCHEMA_ANALYZER_PROMPT },
          { role: 'user', content: preparedInput }
        ],
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxOutputTokens,
      }
    );


    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response (remove markdown code blocks if present)
    let jsonContent = content.trim();
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '');
    }

    const schema = JSON.parse(jsonContent);

    // Validate schema structure
    if (!schema.entities || !Array.isArray(schema.entities)) {
      throw new Error('Invalid schema format: missing entities array');
    }

    // Optional: Save analysis to schema_analyses table
    try {
      await supabaseClient.from('schema_analyses').insert({
        project_id: projectId,
        user_id: user.id,
        input_type: inputType,
        schema: schema,
        ai_model: modelConfig.model,
      });
    } catch (insertError) {
      console.error('Failed to save schema analysis:', insertError);
      // Continue anyway
    }

    return new Response(JSON.stringify(schema), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[AI Analyze Schema] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
