import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Call Lovable AI for OCR (using Gemini vision)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = extractStructured
      ? 'You are an OCR assistant. Extract all text from the image and structure it as JSON with fields: title, sections (array of {heading, content}), tables (array of arrays), metadata (any dates, numbers, etc).'
      : 'You are an OCR assistant. Extract all text from the image accurately, preserving layout and formatting where possible.';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: extractStructured
                  ? 'Extract and structure all text from this image as JSON.'
                  : 'Extract all text from this image.',
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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OCR Processor] AI error:', response.status, errorText);
      throw new Error(`AI processing failed: ${response.status}`);
    }

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
