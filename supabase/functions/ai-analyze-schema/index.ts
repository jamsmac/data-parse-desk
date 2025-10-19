import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCHEMA_ANALYZER_PROMPT = `You are an expert database architect. Analyze the provided input and generate a normalized database schema.

INPUT FORMATS YOU SUPPORT:
1. Natural language description (any language, RU/EN)
2. JSON data structures
3. CSV data

YOUR TASK:
1. ENTITY EXTRACTION:
   - Identify all entities (tables)
   - Suggest meaningful table names (singular, snake_case)
   - Determine primary keys

2. ATTRIBUTE EXTRACTION:
   - List all attributes (columns) for each entity
   - Infer data types: text, number, boolean, date, timestamp, json
   - Determine nullable vs required
   - Suggest default values where appropriate

3. RELATIONSHIP DETECTION:
   - Identify foreign key relationships
   - Determine relationship types: one-to-one, one-to-many, many-to-many
   - Suggest junction tables for many-to-many
   - Name relationships clearly

4. NORMALIZATION:
   - Apply 3NF (Third Normal Form)
   - Eliminate redundancy
   - Suggest separate tables where needed
   - Preserve data integrity

5. CONSTRAINTS & INDEXES:
   - Suggest UNIQUE constraints
   - Recommend indexes for frequent queries
   - Add CHECK constraints for validation

OUTPUT FORMAT (JSON):
{
  "entities": [
    {
      "name": "table_name",
      "confidence": 95,
      "reasoning": "Explanation for this entity",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "primary_key": true,
          "nullable": false,
          "default": "gen_random_uuid()"
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "orders",
      "to": "customers",
      "type": "many-to-one",
      "on": "orders.customer_id = customers.id",
      "confidence": 98
    }
  ],
  "indexes": [
    {
      "table": "orders",
      "columns": ["customer_id"],
      "reason": "Frequent JOIN operations"
    }
  ],
  "warnings": [
    "Consider adding created_at timestamp to all tables"
  ]
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting.`;

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

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SCHEMA_ANALYZER_PROMPT },
          { role: 'user', content: preparedInput }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

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
        ai_model: 'google/gemini-2.5-flash',
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
