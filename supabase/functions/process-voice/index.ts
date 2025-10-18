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
    const { audioData, format = 'mp3' } = await req.json();

    if (!audioData) {
      throw new Error('Audio data is required');
    }

    console.log('[Voice Processor] Processing audio, format:', format);

    // Convert base64 to ArrayBuffer
    const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));

    // Call Lovable AI for transcription (using Gemini which supports audio)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

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
            content: 'You are a voice transcription assistant. Transcribe the audio accurately and return only the transcribed text.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please transcribe this audio file.',
              },
              {
                type: 'audio_url',
                audio_url: {
                  url: `data:audio/${format};base64,${audioData}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Voice Processor] AI error:', response.status, errorText);
      throw new Error(`AI processing failed: ${response.status}`);
    }

    const result = await response.json();
    const transcription = result.choices[0]?.message?.content || '';

    console.log('[Voice Processor] Transcription complete, length:', transcription.length);

    return new Response(
      JSON.stringify({
        transcription,
        success: true,
        format,
        processedAt: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Voice Processor] Error:', error);
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
