import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UseVoiceRecordingOptions {
  preferredService?: 'whisper' | 'gemini' | 'auto';
  onTranscription?: (text: string) => void;
  onError?: (error: Error) => void;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: Error | null;
}

export function useVoiceRecording({
  preferredService = 'auto',
  onTranscription,
  onError,
}: UseVoiceRecordingOptions = {}): UseVoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const visualizeAudio = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn('[useVoiceRecording] Visualization error:', err);
    }
  }, []);

  const processAudio = useCallback(
    async (audioBlob: Blob) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            const base64Data = base64.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(audioBlob);
        const audioData = await base64Promise;

        const format = audioBlob.type.includes('webm') ? 'webm' : 'mp4';

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error('Требуется авторизация');
        }

        const response = await fetch(
          `${supabase.supabaseUrl}/functions/v1/process-voice`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audioData,
              format,
              preferredService,
            }),
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Ошибка обработки аудио');
        }

        const { transcription, service, fallbackUsed } = result;

        if (!transcription) {
          throw new Error('Пустая расшифровка');
        }

        onTranscription?.(transcription);

        toast({
          title: 'Расшифровка готова',
          description: `Использован сервис: ${service}${fallbackUsed ? ' (резервный)' : ''}`,
        });
      } catch (err) {
        const processError = err instanceof Error ? err : new Error('Unknown error');
        setError(processError);
        onError?.(processError);

        toast({
          title: 'Ошибка обработки',
          description: processError.message,
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [preferredService, onTranscription, onError, toast]
  );

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        await processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      visualizeAudio(stream);

      toast({
        title: 'Запись началась',
        description: 'Говорите в микрофон...',
      });
    } catch (err) {
      const recordError =
        err instanceof Error && err.name === 'NotAllowedError'
          ? new Error('Разрешите доступ к микрофону в настройках браузера')
          : err instanceof Error
          ? err
          : new Error('Unknown error');

      setError(recordError);
      onError?.(recordError);

      toast({
        title: 'Ошибка записи',
        description: recordError.message,
        variant: 'destructive',
      });
    }
  }, [visualizeAudio, processAudio, toast, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    startRecording,
    stopRecording,
    error,
  };
}
