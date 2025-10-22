// AI-powered import suggestions for column type detection and mapping
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

interface Column {
  name: string;
  type: string;
}

interface RequestBody {
  columns: Column[];
  sampleData: any[];
  databaseId: string;
}

interface AISuggestion {
  column: string;
  suggestedType: string;
  confidence: number;
  reasoning: string;
  selectOptions?: string[];
  relationSuggestion?: {
    targetTable: string;
    reason: string;
  };
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const body: RequestBody = await req.json();
    const { columns, sampleData, databaseId } = body;

    if (!columns || !sampleData || !databaseId) {
      throw new Error('Missing required fields: columns, sampleData, databaseId');
    }

    console.log('Processing AI suggestions for', columns.length, 'columns');

    // Get existing tables in the project for relation suggestions
    const { data: existingTables } = await supabaseClient
      .from('databases')
      .select('id, name, display_name')
      .neq('id', databaseId);

    const tableNames = existingTables?.map((t) => t.display_name || t.name) || [];

    // Build prompt for Gemini
    const prompt = `You are an expert data analyst helping to categorize columns in a CSV/Excel import.

Analyze the following columns and their sample data, then suggest the most appropriate column type for each.

**Available Column Types:**
- text: General text data
- number: Numeric values (integers, floats, currency)
- date: Date or datetime values
- boolean: True/false values
- email: Email addresses
- phone: Phone numbers
- url: Web URLs
- select: Categorical data with limited options (suggest the options if applicable)
- relation: Foreign key to another table (if pattern suggests it)

**Existing Tables in Database:**
${tableNames.length > 0 ? tableNames.join(', ') : 'None'}

**Columns and Sample Data:**
${columns.map((col, i) => {
  const samples = sampleData.map(row => row[col.name]).filter(v => v != null).slice(0, 5);
  return `
Column: ${col.name}
Current Type: ${col.type}
Sample Values: ${JSON.stringify(samples)}
`;
}).join('\n')}

**Instructions:**
1. Analyze the column name and sample values
2. Suggest the most appropriate type
3. Provide confidence level (0.0 to 1.0)
4. Explain your reasoning briefly
5. If type is "select", provide the unique options found
6. If type is "relation", suggest which existing table it might relate to

**Response Format (JSON):**
Return a JSON object with a "suggestions" array containing objects with these fields:
- column: string (column name)
- suggestedType: string (one of the available types)
- confidence: number (0.0 to 1.0)
- reasoning: string (brief explanation)
- selectOptions: string[] (only if suggestedType is "select")
- relationSuggestion: { targetTable: string, reason: string } (only if suggestedType is "relation")

**Example Response:**
{
  "suggestions": [
    {
      "column": "email",
      "suggestedType": "email",
      "confidence": 0.95,
      "reasoning": "All samples match email format pattern"
    },
    {
      "column": "status",
      "suggestedType": "select",
      "confidence": 0.9,
      "reasoning": "Limited categorical values detected",
      "selectOptions": ["active", "pending", "completed"]
    },
    {
      "column": "customer_id",
      "suggestedType": "relation",
      "confidence": 0.85,
      "reasoning": "Column name suggests foreign key to customers table",
      "relationSuggestion": {
        "targetTable": "Customers",
        "reason": "Name pattern matches existing table"
      }
    }
  ]
}

Respond with ONLY valid JSON, no additional text.`;

    // Call Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error('Failed to get AI suggestions');
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('No response from AI model');
    }

    console.log('Raw AI response:', responseText);

    // Parse JSON from response (handle markdown code blocks)
    let parsedResponse;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/```\s*([\s\S]*?)\s*```/);

      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Response text:', responseText);

      // Return empty suggestions if parsing fails
      parsedResponse = { suggestions: [] };
    }

    // Validate and sanitize suggestions
    const suggestions: AISuggestion[] = (parsedResponse.suggestions || [])
      .filter((s: any) => s.column && s.suggestedType && s.confidence && s.reasoning)
      .map((s: any) => ({
        column: s.column,
        suggestedType: s.suggestedType,
        confidence: Math.min(Math.max(s.confidence, 0), 1), // Clamp between 0 and 1
        reasoning: s.reasoning,
        selectOptions: s.selectOptions || undefined,
        relationSuggestion: s.relationSuggestion || undefined,
      }));

    console.log('Processed suggestions:', suggestions.length);

    // Track AI usage for billing
    await supabaseClient.from('ai_requests').insert({
      user_id: user.id,
      agent_type: 'import_suggestions',
      input_data: {
        columnCount: columns.length,
        sampleRowCount: sampleData.length,
        databaseId,
      },
      output_data: {
        suggestionCount: suggestions.length,
      },
      model: 'gemini-2.0-flash-exp',
      tokens_used: responseText.length, // Approximate
      status: 'completed',
    });

    return new Response(
      JSON.stringify({
        suggestions,
        metadata: {
          columnsAnalyzed: columns.length,
          suggestionsGenerated: suggestions.length,
          model: 'gemini-2.0-flash-exp',
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Error in ai-import-suggestions:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        suggestions: [], // Return empty suggestions on error
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
