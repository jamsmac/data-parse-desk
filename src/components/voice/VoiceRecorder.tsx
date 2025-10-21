import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
  preferredService?: 'whisper' | 'gemini' | 'auto';
  buttonVariant?: 'default' | 'outline' | 'ghost';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
  showVisualization?: boolean;
}

export function VoiceRecorder({
  onTranscription,
  preferredService = 'auto',
  buttonVariant = 'outline',
  buttonSize = 'default',
  showVisualization = true,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio visualization
  const visualizeAudio = (stream: MediaStream) => {
    if (!showVisualization) return;

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
      setAudioLevel(average / 255); // Normalize to 0-1

      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };

    updateLevel();
  };

  const startRecording = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Check browser compatibility
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

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Process audio
        await processAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

      // Start visualization
      visualizeAudio(stream);

      toast({
        title: 'Запись началась',
        description: 'Говорите в микрофон...',
      });
    } catch (error) {
      console.error('[VoiceRecorder] Start error:', error);

      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast({
          title: 'Доступ запрещён',
          description: 'Разрешите доступ к микрофону в настройках браузера',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Ошибка записи',
          description: error instanceof Error ? error.message : 'Неизвестная ошибка',
          variant: 'destructive',
        });
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);

      // Stop visualization
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1]; // Remove data URL prefix
          resolve(base64Data);
        };
        reader.onerror = reject;
      });

      reader.readAsDataURL(audioBlob);
      const audioData = await base64Promise;

      // Determine format
      const format = audioBlob.type.includes('webm') ? 'webm' : 'mp4';

      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Требуется авторизация');
      }

      // Call Edge Function
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

      // Notify parent component
      onTranscription(transcription);

      toast({
        title: 'Расшифровка готова',
        description: `Использован сервис: ${service}${fallbackUsed ? ' (резервный)' : ''}`,
      });
    } catch (error) {
      console.error('[VoiceRecorder] Process error:', error);
      toast({
        title: 'Ошибка обработки',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleClick}
        disabled={isProcessing}
        className={isRecording ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
      >
        {isProcessing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isRecording ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        {buttonSize !== 'icon' && (
          <span className="ml-2">
            {isProcessing
              ? 'Обработка...'
              : isRecording
              ? 'Остановить'
              : 'Записать голос'}
          </span>
        )}
      </Button>

      {/* Audio visualization */}
      {showVisualization && isRecording && (
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-red-500 rounded-full transition-all duration-100"
              style={{
                height: `${Math.max(4, audioLevel * 24 * (1 + Math.sin((i * Math.PI) / 5)))}px`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
