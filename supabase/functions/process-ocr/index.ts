import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { OCR_PROCESSOR_PROMPT, getModelConfig, callAIWithRetry } from '../_shared/prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_API_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, extractStructured = false } = await req.json();

    if (!imageData) {
      throw new Error('Image data is required');
    }

    console.log('[OCR Processor] Processing image, structured:', extractStructured);

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = OCR_PROCESSOR_PROMPT(extractStructured);
    const modelConfig = getModelConfig('ocr');

    const userText = extractStructured
      ? 'Extract and structure all text from this image as JSON.'
      : 'Extract all text from this image.';

    const response = await callAIWithRetry(
      AI_API_URL,
      LOVABLE_API_KEY,
      {
        model: modelConfig.model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userText,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`,
                },
              },
            ],
          },
        ],
        temperature: modelConfig.temperature,
        max_tokens: modelConfig.maxOutputTokens,
      }
    );

    const result = await response.json();
    const extractedText = result.choices[0]?.message?.content || '';

    let parsedData = null;
    if (extractStructured) {
      try {
        // Try to parse JSON if structured extraction was requested
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.warn('[OCR Processor] Could not parse structured data:', e);
      }
    }

    console.log('[OCR Processor] OCR complete, text length:', extractedText.length);

    return new Response(
      JSON.stringify({
        text: extractedText,
        structured: parsedData,
        success: true,
        processedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[OCR Processor] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
