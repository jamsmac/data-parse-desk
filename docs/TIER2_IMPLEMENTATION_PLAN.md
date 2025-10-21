# 📋 TIER 2 IMPLEMENTATION PLAN

**Data Parse Desk 2.0 - Medium Priority Features**

**Дата создания:** 21 октября 2025
**Tier 1 Status:** ✅ Complete (3/3 features)
**Tier 2 Status:** ⏳ Planning

---

## 🎯 OVERVIEW

**Tier 2 Features:** 3 features
**Estimated Total Time:** 33-45 hours (4-6 рабочих дней)
**Priority:** Medium (after Tier 1 completion)

### Features List:

1. **File Attachments на Items** (10-14 часов)
2. **Voice Input улучшения** (7-10 часов)
3. **Schema Version Control** (16-21 час)

---

## 1️⃣ FILE ATTACHMENTS НА ITEMS

### 📊 Статус: ❌ НЕ РЕАЛИЗОВАНО (0%)

**Цель:** Добавить возможность прикреплять файлы к checklist items

**Оценка времени:** 10-14 часов
**Приоритет:** Высокий (Tier 2)
**Сложность:** Средняя

---

### Текущее состояние:

**Что есть:**
- ✅ ChecklistColumn.tsx - базовый чеклист
- ✅ Supabase Storage - настроен
- ✅ Upload functionality - есть в других компонентах

**Что НЕ реализовано:**
- ❌ Таблица item_attachments
- ❌ Storage bucket для attachments
- ❌ UI для загрузки файлов к items
- ❌ Preview для images/PDFs
- ❌ Download functionality

---

### Архитектура решения:

#### Backend (4-5 часов)

**1. Database Migration:**

```sql
-- supabase/migrations/20251021000006_item_attachments.sql

-- Таблица для хранения метаданных вложений
CREATE TABLE item_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Связь с composite view и item
  composite_view_id UUID REFERENCES composite_views(id) ON DELETE CASCADE,
  row_identifier TEXT NOT NULL,
  column_name TEXT NOT NULL,
  item_index INTEGER NOT NULL,

  -- Информация о файле
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL, -- bytes
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- путь в Supabase Storage

  -- Metadata
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Optional: thumbnail для images
  thumbnail_path TEXT,

  -- Composite index для быстрого поиска
  CONSTRAINT unique_attachment UNIQUE(composite_view_id, row_identifier, column_name, item_index, file_name)
);

-- Indexes
CREATE INDEX idx_item_attachments_view
  ON item_attachments(composite_view_id, row_identifier, column_name);

CREATE INDEX idx_item_attachments_user
  ON item_attachments(uploaded_by);

CREATE INDEX idx_item_attachments_date
  ON item_attachments(uploaded_at DESC);

-- RLS Policies
ALTER TABLE item_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments in their composite views
CREATE POLICY "Users can view attachments in their views"
  ON item_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM composite_views cv
      WHERE cv.id = item_attachments.composite_view_id
      AND cv.user_id = auth.uid()
    )
  );

-- Users can insert attachments to their views
CREATE POLICY "Users can upload attachments to their views"
  ON item_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM composite_views cv
      WHERE cv.id = item_attachments.composite_view_id
      AND cv.user_id = auth.uid()
    )
  );

-- Users can delete their own attachments
CREATE POLICY "Users can delete attachments from their views"
  ON item_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM composite_views cv
      WHERE cv.id = item_attachments.composite_view_id
      AND cv.user_id = auth.uid()
    )
  );

-- Function: Get attachments for checklist item
CREATE OR REPLACE FUNCTION get_item_attachments(
  p_composite_view_id UUID,
  p_row_identifier TEXT,
  p_column_name TEXT,
  p_item_index INTEGER
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  storage_path TEXT,
  thumbnail_path TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ia.id,
    ia.file_name,
    ia.file_size,
    ia.mime_type,
    ia.storage_path,
    ia.thumbnail_path,
    ia.uploaded_by,
    ia.uploaded_at
  FROM item_attachments ia
  WHERE ia.composite_view_id = p_composite_view_id
    AND ia.row_identifier = p_row_identifier
    AND ia.column_name = p_column_name
    AND ia.item_index = p_item_index
  ORDER BY ia.uploaded_at DESC;
END;
$$;

-- Function: Delete attachment and file from storage
CREATE OR REPLACE FUNCTION delete_item_attachment(
  p_attachment_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_storage_path TEXT;
  v_thumbnail_path TEXT;
BEGIN
  -- Get storage paths
  SELECT storage_path, thumbnail_path
  INTO v_storage_path, v_thumbnail_path
  FROM item_attachments
  WHERE id = p_attachment_id
    AND EXISTS (
      SELECT 1 FROM composite_views cv
      WHERE cv.id = item_attachments.composite_view_id
      AND cv.user_id = auth.uid()
    );

  IF v_storage_path IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Delete from DB (triggers will handle storage cleanup)
  DELETE FROM item_attachments WHERE id = p_attachment_id;

  RETURN TRUE;
END;
$$;
```

**2. Storage Bucket Setup:**

```sql
-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-attachments', 'item-attachments', false);

-- Storage policies
CREATE POLICY "Users can upload attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'item-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can view their attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'item-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can delete their attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'item-attachments' AND
    auth.uid()::TEXT = (storage.foldername(name))[1]
  );
```

**3. Edge Function для upload/delete:**

```typescript
// supabase/functions/item-attachment-upload/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const compositeViewId = formData.get('compositeViewId') as string;
  const rowIdentifier = formData.get('rowIdentifier') as string;
  const columnName = formData.get('columnName') as string;
  const itemIndex = parseInt(formData.get('itemIndex') as string);

  const userId = req.headers.get('user-id');

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return new Response(JSON.stringify({ error: 'File too large' }), { status: 400 });
  }

  // Generate storage path
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${compositeViewId}/${Date.now()}_${file.name}`;
  const storagePath = `item-attachments/${fileName}`;

  // Upload to storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('item-attachments')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
  }

  // Create thumbnail for images
  let thumbnailPath = null;
  if (file.type.startsWith('image/')) {
    // TODO: Generate thumbnail (optional enhancement)
    // Can use sharp or similar library
  }

  // Save metadata to DB
  const { data: attachment, error: dbError } = await supabase
    .from('item_attachments')
    .insert({
      composite_view_id: compositeViewId,
      row_identifier: rowIdentifier,
      column_name: columnName,
      item_index: itemIndex,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      thumbnail_path: thumbnailPath,
      uploaded_by: userId,
    })
    .select()
    .single();

  if (dbError) {
    // Cleanup storage if DB insert fails
    await supabase.storage.from('item-attachments').remove([storagePath]);
    return new Response(JSON.stringify({ error: dbError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ attachment }), { status: 200 });
});
```

#### Frontend (6-9 часов)

**1. AttachmentButton Component:**

```typescript
// src/components/composite-views/AttachmentButton.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AttachmentButtonProps {
  compositeViewId: string;
  rowIdentifier: string;
  columnName: string;
  itemIndex: number;
  onAttached?: () => void;
}

export function AttachmentButton({
  compositeViewId,
  rowIdentifier,
  columnName,
  itemIndex,
  onAttached,
}: AttachmentButtonProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой', {
        description: 'Максимальный размер: 10MB',
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('compositeViewId', compositeViewId);
      formData.append('rowIdentifier', rowIdentifier);
      formData.append('columnName', columnName);
      formData.append('itemIndex', itemIndex.toString());

      const { data, error } = await supabase.functions.invoke('item-attachment-upload', {
        body: formData,
      });

      if (error) throw error;

      toast.success('Файл загружен');
      onAttached?.();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        id={`attach-${itemIndex}`}
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading}
      />
      <label htmlFor={`attach-${itemIndex}`}>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2"
          disabled={uploading}
          as="span"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Paperclip className="h-3 w-3" />
          )}
        </Button>
      </label>
    </div>
  );
}
```

**2. AttachmentList Component:**

```typescript
// src/components/composite-views/AttachmentList.tsx

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Trash2, FileText, Image, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import { formatBytes } from '@/utils/formatBytes';

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  uploaded_at: string;
}

interface AttachmentListProps {
  compositeViewId: string;
  rowIdentifier: string;
  columnName: string;
  itemIndex: number;
}

export function AttachmentList({
  compositeViewId,
  rowIdentifier,
  columnName,
  itemIndex,
}: AttachmentListProps) {
  const { data: attachments, refetch } = useQuery({
    queryKey: ['item-attachments', compositeViewId, rowIdentifier, columnName, itemIndex],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_item_attachments', {
        p_composite_view_id: compositeViewId,
        p_row_identifier: rowIdentifier,
        p_column_name: columnName,
        p_item_index: itemIndex,
      });

      if (error) throw error;
      return data as Attachment[];
    },
  });

  const handleDownload = async (attachment: Attachment) => {
    const { data, error } = await supabase.storage
      .from('item-attachments')
      .download(attachment.storage_path);

    if (error) {
      toast.error('Ошибка скачивания');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = attachment.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (attachmentId: string) => {
    const { data, error } = await supabase.rpc('delete_item_attachment', {
      p_attachment_id: attachmentId,
    });

    if (error) {
      toast.error('Ошибка удаления');
      return;
    }

    toast.success('Файл удален');
    refetch();
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileCode className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 mt-2">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded"
        >
          {getFileIcon(attachment.mime_type)}
          <span className="flex-1 truncate">{attachment.file_name}</span>
          <Badge variant="outline" className="text-xs">
            {formatBytes(attachment.file_size)}
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2"
            onClick={() => handleDownload(attachment)}
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-destructive"
            onClick={() => handleDelete(attachment.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
```

**3. Update ChecklistColumn:**

```typescript
// Update src/components/composite-views/ChecklistColumn.tsx

import { AttachmentButton } from './AttachmentButton';
import { AttachmentList } from './AttachmentList';

// In the item rendering:
{items.map((item, index) => (
  <div key={index} className="flex items-start gap-2">
    <Checkbox ... />
    <span>{item.text}</span>

    {/* Add attachment button */}
    <AttachmentButton
      compositeViewId={compositeViewId}
      rowIdentifier={rowIdentifier}
      columnName={columnName}
      itemIndex={index}
      onAttached={() => refetchAttachments()}
    />

    {/* Show attachments */}
    <AttachmentList
      compositeViewId={compositeViewId}
      rowIdentifier={rowIdentifier}
      columnName={columnName}
      itemIndex={index}
    />
  </div>
))}
```

---

### План реализации:

**Phase 1: Database (2 hours)**
- ✅ Migration 20251021000006_item_attachments.sql
- ✅ Storage bucket setup
- ✅ RLS policies
- ✅ Functions: get_item_attachments, delete_item_attachment

**Phase 2: Edge Function (2-3 hours)**
- ✅ item-attachment-upload function
- ✅ File validation (size, type)
- ✅ Storage upload
- ✅ DB metadata save
- ✅ Error handling

**Phase 3: Frontend Components (4-5 hours)**
- ✅ AttachmentButton.tsx
- ✅ AttachmentList.tsx
- ✅ Update ChecklistColumn.tsx
- ✅ File icons, download, delete
- ✅ Preview modal (optional)

**Phase 4: Testing (2-3 hours)**
- ✅ Upload различных типов файлов
- ✅ Download функциональность
- ✅ Delete с cleanup storage
- ✅ RLS policies проверка
- ✅ Error scenarios

**Total:** 10-14 hours

---

## 2️⃣ VOICE INPUT УЛУЧШЕНИЯ

### 📊 Статус: 🟡 ЧАСТИЧНО РЕАЛИЗОВАНО (60%)

**Цель:** Добавить Whisper API как альтернативу Gemini, улучшить UX

**Оценка времени:** 7-10 часов
**Приоритет:** Средний (Tier 2)
**Сложность:** Средняя

---

### Текущее состояние:

**Что есть:**
- ✅ process-voice Edge Function (через Gemini)
- ✅ Audio transcription работает
- ✅ Поддержка форматов: mp3, webm, ogg

**Что НЕ реализовано:**
- ❌ Whisper API integration
- ❌ VoiceRecorder component для web
- ❌ Real-time visualization
- ❌ Fallback logic (Whisper → Gemini)

---

### План улучшений:

#### Backend (3-4 часа)

**1. Add Whisper API support:**

```typescript
// supabase/functions/process-voice/index.ts - UPDATE

// Add Whisper API handler
async function transcribeWithWhisper(audioData: string, format: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  // Convert base64 to blob
  const audioBlob = new Blob(
    [Uint8Array.from(atob(audioData), c => c.charCodeAt(0))],
    { type: `audio/${format}` }
  );

  const formData = new FormData();
  formData.append('file', audioBlob, `audio.${format}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'ru'); // Russian by default, can be auto-detected

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Whisper API error: ${response.status}`);
  }

  const result = await response.json();
  return result.text;
}

// Add fallback logic
async function transcribeWithFallback(audioData: string, format: string): Promise<{
  transcription: string;
  provider: 'whisper' | 'gemini';
}> {
  try {
    // Try Whisper first
    const transcription = await transcribeWithWhisper(audioData, format);
    return { transcription, provider: 'whisper' };
  } catch (error) {
    console.log('[Voice] Whisper failed, falling back to Gemini:', error);

    // Fallback to Gemini
    const transcription = await transcribeWithGemini(audioData, format);
    return { transcription, provider: 'gemini' };
  }
}

// Update main handler
Deno.serve(async (req) => {
  // ...
  const result = await transcribeWithFallback(audioData, format);

  return new Response(
    JSON.stringify({
      transcription: result.transcription,
      provider: result.provider,
      success: true,
      format,
      processedAt: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
```

#### Frontend (4-6 часов)

**1. VoiceRecorder Component:**

```typescript
// src/components/voice/VoiceRecorder.tsx

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export function VoiceRecorder({ onTranscription }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Request microphone permission
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio analysis for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start visualization
      visualizeAudio();

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      toast.success('Запись началась');
    } catch (error) {
      console.error('Microphone error:', error);
      toast.error('Ошибка доступа к микрофону');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const update = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
      setAudioLevel(average / 255 * 100);
      animationFrameRef.current = requestAnimationFrame(update);
    };

    update();
  };

  const processAudio = async (audioBlob: Blob) => {
    setProcessing(true);

    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);

      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });

      // Send to Edge Function
      const { data, error } = await supabase.functions.invoke('process-voice', {
        body: {
          audioData: base64Audio,
          format: 'webm',
        },
      });

      if (error) throw error;

      toast.success(`Расшифровано через ${data.provider === 'whisper' ? 'Whisper API' : 'Gemini'}`);
      onTranscription(data.transcription);
    } catch (error) {
      console.error('Processing error:', error);
      toast.error('Ошибка обработки аудио');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Audio Level Visualization */}
      {recording && (
        <div className="w-full h-12 bg-muted rounded-lg overflow-hidden relative">
          <div
            className="h-full bg-primary transition-all duration-100"
            style={{ width: `${audioLevel}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium">Запись... {Math.round(audioLevel)}%</span>
          </div>
        </div>
      )}

      {/* Record Button */}
      <Button
        size="lg"
        variant={recording ? 'destructive' : 'default'}
        onClick={recording ? stopRecording : startRecording}
        disabled={processing}
        className="rounded-full w-16 h-16"
      >
        {processing ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : recording ? (
          <Square className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6" />
        )}
      </Button>

      <p className="text-sm text-muted-foreground">
        {processing
          ? 'Обработка...'
          : recording
          ? 'Нажмите чтобы остановить'
          : 'Нажмите чтобы начать запись'}
      </p>
    </div>
  );
}
```

**2. Integration example:**

```typescript
// Example usage in a dialog/component

import { VoiceRecorder } from '@/components/voice/VoiceRecorder';

<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Голосовой ввод</DialogTitle>
    </DialogHeader>

    <VoiceRecorder
      onTranscription={(text) => {
        // Use transcribed text
        setInputValue(text);
      }}
    />
  </DialogContent>
</Dialog>
```

---

### План реализации:

**Phase 1: Whisper API Integration (2-3 hours)**
- ✅ Add Whisper API handler
- ✅ Fallback logic (Whisper → Gemini)
- ✅ Error handling
- ✅ Provider tracking

**Phase 2: VoiceRecorder Component (3-4 hours)**
- ✅ MediaRecorder API setup
- ✅ Real-time audio visualization
- ✅ Start/Stop recording
- ✅ Audio processing
- ✅ UI with level indicator

**Phase 3: Integration (1-2 hours)**
- ✅ Add VoiceRecorder to relevant components
- ✅ Handle transcription results
- ✅ Error states

**Phase 4: Testing (1-2 hours)**
- ✅ Test Whisper API
- ✅ Test Gemini fallback
- ✅ Test browser permissions
- ✅ Test different audio formats

**Total:** 7-10 hours

---

## 3️⃣ SCHEMA VERSION CONTROL

### 📊 Статус: ❌ НЕ РЕАЛИЗОВАНО (0%)

**Цель:** Track schema changes, rollback functionality, diff viewer

**Оценка времени:** 16-21 час
**Приоритет:** Низкий (Tier 2, enterprise feature)
**Сложность:** Высокая

---

### Архитектура (краткий план):

**Backend (8-10 часов):**
- schema_versions table
- schema_version_tags table
- calculateSchemaDiff() function
- schema-version-create Edge Function
- schema-version-restore Edge Function

**Frontend (6-8 часов):**
- SchemaVersionHistory component
- VersionComparisonDialog component
- VersionChanges component
- Integration в DatabaseView

**Testing (2-3 часа):**
- Create versions
- Compare versions
- Restore functionality

**Total:** 16-21 hours

**Примечание:** Детальный план см. в ПОЛНЫЙ_АУДИТ_ПРОЕКТА_2025.md

---

## 📊 TIER 2 SUMMARY

| Feature | Status | Priority | Time | Complexity |
|---------|--------|----------|------|------------|
| File Attachments | ❌ Not Started | High | 10-14h | Medium |
| Voice Input Improvements | 🟡 Partial (60%) | Medium | 7-10h | Medium |
| Schema Version Control | ❌ Not Started | Low | 16-21h | High |

**Total Estimated Time:** 33-45 hours (4-6 рабочих дней)

---

## 🎯 RECOMMENDED ORDER

### Week 1 (10-14h): File Attachments
**Impact:** ⭐⭐⭐⭐ - Major UX improvement
- Day 1-2: Database & Storage
- Day 3: Edge Function
- Day 4-5: Frontend Components

### Week 2 (7-10h): Voice Input Improvements
**Impact:** ⭐⭐⭐ - Nice enhancement
- Day 1-2: Whisper API integration
- Day 3-4: VoiceRecorder component

### Week 3-4 (16-21h): Schema Version Control
**Impact:** ⭐⭐ - Enterprise feature
- Optional: Can be deferred
- Complex implementation

---

## ✅ SUCCESS CRITERIA

**File Attachments:**
- ✅ Users can attach files to checklist items
- ✅ Preview images/PDFs
- ✅ Download attachments
- ✅ Delete attachments
- ✅ RLS secured
- ✅ Storage cleanup on delete

**Voice Input:**
- ✅ Whisper API works
- ✅ Gemini fallback works
- ✅ VoiceRecorder has visualization
- ✅ Browser permissions handled
- ✅ Error states clear

**Schema Version Control:**
- ✅ Versions auto-created
- ✅ History viewable
- ✅ Diff works
- ✅ Restore works
- ✅ Comments saved

---

**READY TO START TIER 2!** 🚀

**Рекомендация:** Начать с File Attachments (highest priority)
