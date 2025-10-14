import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => Promise<void>;
  acceptedFormats?: string[];
  maxSize?: number; // в MB
}

export const UploadFileDialog: React.FC<UploadFileDialogProps> = ({
  open,
  onOpenChange,
  onUpload,
  acceptedFormats = ['.csv', '.xlsx', '.xls', '.json'],
  maxSize = 10,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    // Проверка размера
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return `Файл слишком большой. Максимальный размер: ${maxSize}MB`;
    }

    // Проверка формата
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedFormats.includes(extension)) {
      return `Неподдерживаемый формат. Разрешены: ${acceptedFormats.join(', ')}`;
    }

    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setError(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validationError = validateFile(droppedFile);
      
      if (validationError) {
        setError(validationError);
        return;
      }

      setFile(droppedFile);
    }
  }, [acceptedFormats, maxSize]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validationError = validateFile(selectedFile);
      
      if (validationError) {
        setError(validationError);
        e.target.value = '';
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      await onUpload(file);
      setFile(null);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setError(null);
      onOpenChange(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Загрузить файл</DialogTitle>
          <DialogDescription>
            Выберите файл для импорта данных. Поддерживаемые форматы: {acceptedFormats.join(', ')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drag & Drop Zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400',
              file ? 'bg-gray-50' : ''
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && document.getElementById('file-input')?.click()}
          >
            {!file ? (
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Перетащите файл сюда или кликните для выбора
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Максимальный размер: {maxSize}MB
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <File className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile();
                    }}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            )}
          </div>

          {/* Hidden File Input */}
          <Input
            id="file-input"
            type="file"
            accept={acceptedFormats.join(',')}
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* File Info */}
          {file && !error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <File className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-blue-900">Файл готов к загрузке</p>
                  <p className="text-blue-700 text-xs mt-1">
                    {file.name} ({formatFileSize(file.size)})
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
          >
            Отмена
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Загрузка...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Загрузить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
