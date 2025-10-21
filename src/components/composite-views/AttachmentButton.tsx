import { useState, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AttachmentButtonProps {
  compositeViewId: string;
  rowIdentifier: string;
  columnName: string;
  itemIndex: number;
  onUploadComplete?: () => void;
}

export function AttachmentButton({
  compositeViewId,
  rowIdentifier,
  columnName,
  itemIndex,
  onUploadComplete,
}: AttachmentButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'Файл слишком большой',
        description: 'Максимальный размер файла: 10MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Требуется авторизация');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('compositeViewId', compositeViewId);
      formData.append('rowIdentifier', rowIdentifier);
      formData.append('columnName', columnName);
      formData.append('itemIndex', itemIndex.toString());

      // Call Edge Function
      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/item-attachment-upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка загрузки файла');
      }

      toast({
        title: 'Файл загружен',
        description: `"${file.name}" успешно загружен`,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent component
      onUploadComplete?.();
    } catch (error) {
      console.error('[AttachmentButton] Upload error:', error);
      toast({
        title: 'Ошибка загрузки',
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        disabled={isUploading}
        className="h-6 px-2"
      >
        {isUploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
      </Button>
    </>
  );
}
