import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { VOICE_TRANSCRIPTION_PROMPT, getModelConfig, callAIWithRetry } from '../_shared/prompts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const AI_API_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';

/**
 * Transcribe audio using OpenAI Whisper API
 */
async function transcribeWithWhisper(audioData: string, format: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  console.log('[Whisper] Starting transcription, format:', format);

  // Convert base64 to Blob
  const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
  const audioBlob = new Blob([audioBuffer], { type: `audio/${format}` });

  // Create FormData for Whisper API
  const formData = new FormData();
  formData.append('file', audioBlob, `audio.${format}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ru'); // Russian language support
  formData.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Whisper] Error:', response.status, errorText);
    throw new Error(`Whisper API failed: ${response.status}`);
  }

  const result = await response.json();
  console.log('[Whisper] Transcription complete, length:', result.text?.length);

  return result.text || '';
}

/**
 * Transcribe audio using Gemini (fallback)
 */
async function transcribeWithGemini(audioData: string, format: string): Promise<string> {
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  console.log('[Gemini] Starting transcription (fallback), format:', format);

  const modelConfig = getModelConfig('voice');

  const response = await callAIWithRetry(
    AI_API_URL,
    LOVABLE_API_KEY,
    {
      model: modelConfig.model,
      messages: [
        {
          role: 'system',
          content: VOICE_TRANSCRIPTION_PROMPT,
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
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxOutputTokens,
    }
  );

  const result = await response.json();
  const transcription = result.choices[0]?.message?.content || '';

  console.log('[Gemini] Transcription complete, length:', transcription.length);

  return transcription;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioData, format = 'mp3', preferredService = 'whisper' } = await req.json();

    if (!audioData) {
      throw new Error('Audio data is required');
    }

    console.log('[Voice Processor] Processing audio, format:', format, 'preferred:', preferredService);

    let transcription = '';
    let usedService = '';
    let error = null;

    // Try Whisper first (if preferred or default)
    if (preferredService === 'whisper' || preferredService === 'auto') {
      try {
        transcription = await transcribeWithWhisper(audioData, format);
        usedService = 'whisper';
      } catch (whisperError) {
        console.warn('[Voice Processor] Whisper failed, falling back to Gemini:', whisperError);
        error = whisperError instanceof Error ? whisperError.message : 'Whisper failed';

        // Fallback to Gemini
        try {
          transcription = await transcribeWithGemini(audioData, format);
          usedService = 'gemini';
        } catch (geminiError) {
          console.error('[Voice Processor] Both services failed');
          throw new Error(`All transcription services failed. Whisper: ${error}, Gemini: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
        }
      }
    } else if (preferredService === 'gemini') {
      // Use Gemini directly if preferred
      transcription = await transcribeWithGemini(audioData, format);
      usedService = 'gemini';
    } else {
      throw new Error(`Invalid preferredService: ${preferredService}. Use 'whisper', 'gemini', or 'auto'.`);
    }

    console.log('[Voice Processor] Transcription complete using:', usedService);

    return new Response(
      JSON.stringify({
        transcription,
        success: true,
        service: usedService,
        format,
        processedAt: new Date().toISOString(),
        fallbackUsed: usedService === 'gemini' && preferredService === 'whisper',
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
