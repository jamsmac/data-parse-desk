import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Trash2,
  FileImage,
  FileText,
  FileVideo,
  FileAudio,
  FileSpreadsheet,
  File,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatBytes } from '@/utils/formatBytes';

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  thumbnail_path: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

interface AttachmentListProps {
  compositeViewId: string;
  rowIdentifier: string;
  columnName: string;
  itemIndex: number;
}

// Map MIME type to icon component
function getFileIconComponent(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.endsWith('.sheet')
  ) {
    return FileSpreadsheet;
  }
  if (
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('text')
  ) {
    return FileText;
  }
  return File;
}

export function AttachmentList({
  compositeViewId,
  rowIdentifier,
  columnName,
  itemIndex,
}: AttachmentListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch attachments
  const { data: attachments, isLoading } = useQuery({
    queryKey: ['item-attachments', compositeViewId, rowIdentifier, columnName, itemIndex],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_item_attachments', {
        p_composite_view_id: compositeViewId,
        p_row_identifier: rowIdentifier,
        p_column_name: columnName,
        p_item_index: itemIndex,
      });

      if (error) {
        console.error('[AttachmentList] Fetch error:', error);
        throw error;
      }

      return data as Attachment[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Требуется авторизация');
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/item-attachment-delete`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ attachmentId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка удаления файла');
      }

      return result;
    },
    onSuccess: () => {
      toast({
        title: 'Файл удалён',
        description: 'Файл успешно удалён',
      });
      queryClient.invalidateQueries({
        queryKey: ['item-attachments', compositeViewId, rowIdentifier, columnName, itemIndex],
      });
    },
    onError: (error) => {
      console.error('[AttachmentList] Delete error:', error);
      toast({
        title: 'Ошибка удаления',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('item-attachments')
        .download(attachment.storage_path);

      if (error) {
        throw error;
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Файл загружен',
        description: `"${attachment.file_name}" загружен`,
      });
    } catch (error) {
      console.error('[AttachmentList] Download error:', error);
      toast({
        title: 'Ошибка загрузки',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (attachmentId: string) => {
    setDeletingId(attachmentId);
    deleteMutation.mutate(attachmentId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 mt-2">
      {attachments.map((attachment) => {
        const IconComponent = getFileIconComponent(attachment.mime_type);
        const isDeleting = deletingId === attachment.id;

        return (
          <div
            key={attachment.id}
            className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
          >
            <IconComponent className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{attachment.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(attachment.file_size)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(attachment)}
                disabled={isDeleting}
                className="h-6 w-6 p-0"
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(attachment.id)}
                disabled={isDeleting}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
