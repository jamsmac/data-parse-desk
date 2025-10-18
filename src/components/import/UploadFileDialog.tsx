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
import { parseFile } from '@/utils/fileParser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImportModeSelector } from './ImportModeSelector';
import { DuplicateStrategySelector } from './DuplicateStrategySelector';

export interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  databaseId: string;
}

export const UploadFileDialog: React.FC<UploadFileDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  databaseId,
}) => {
  const { toast } = useToast();
  const acceptedFormats = ['.csv', '.xlsx', '.xls'];
  const maxSize = 10;
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'data' | 'schema_only'>('data');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'add_all'>('skip');

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
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      return `Файл слишком большой. Максимальный размер: ${maxSize}MB`;
    }

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
  }, []);

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
      // Parse file
      const parseResult = await parseFile(file);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      // Save file metadata
      const { data: fileData, error: fileError } = await supabase
        .from('database_files')
        .insert({
          database_id: databaseId,
          filename: parseResult.fileName,
          file_type: file.name.split('.').pop()?.toLowerCase(),
          file_size: file.size,
          uploaded_by: user.id,
          import_mode: importMode,
          duplicate_strategy: duplicateStrategy,
          metadata: {
            headers: parseResult.headers,
            dateColumns: parseResult.dateColumns,
            amountColumns: parseResult.amountColumns,
          }
        })
        .select()
        .single();

      if (fileError) throw fileError;

      if (importMode === 'schema_only') {
        // Only create columns from headers
        const { data: existingSchemas } = await supabase
          .from('table_schemas')
          .select('column_name')
          .eq('database_id', databaseId);

        const existingColumns = new Set(existingSchemas?.map(s => s.column_name) || []);
        
        for (let i = 0; i < parseResult.headers.length; i++) {
          const columnName = parseResult.headers[i];
          if (existingColumns.has(columnName)) continue;

          let columnType = 'text';
          if (parseResult.dateColumns.includes(columnName)) columnType = 'date';
          else if (parseResult.amountColumns.includes(columnName)) columnType = 'number';

          await supabase.from('table_schemas').insert({
            database_id: databaseId,
            column_name: columnName,
            column_type: columnType,
            position: i,
          });
        }

        toast({
          title: 'Схема импортирована',
          description: `Создано ${parseResult.headers.length} колонок`,
        });
      } else {
        // Import data
        let rowsImported = 0;
        let rowsSkipped = 0;
        let duplicatesFound = 0;

        // Get existing data for duplicate detection
        const { data: existingData } = await supabase
          .from('table_data')
          .select('*')
          .eq('database_id', databaseId);

        const existingRows = existingData || [];

        for (const row of parseResult.data) {
          // Check for duplicates
          const isDuplicate = existingRows.some(existing => 
            JSON.stringify(existing.data) === JSON.stringify(row)
          );

          if (isDuplicate) {
            duplicatesFound++;
            if (duplicateStrategy === 'skip') {
              rowsSkipped++;
              continue;
            } else if (duplicateStrategy === 'update') {
              const existingRow = existingRows.find(existing => 
                JSON.stringify(existing.data) === JSON.stringify(row)
              );
              if (existingRow) {
                await supabase
                  .from('table_data')
                  .update({ data: row })
                  .eq('id', existingRow.id);
                rowsImported++;
              }
              continue;
            }
          }

          // Insert new row
          const { data: insertedRow, error: insertError } = await supabase
            .from('table_data')
            .insert({
              database_id: databaseId,
              data: row,
            })
            .select()
            .single();

          if (insertError) {
            rowsSkipped++;
            continue;
          }

          rowsImported++;

          // Create cell metadata for tracking
          for (const [columnName, value] of Object.entries(row)) {
            await supabase.from('cell_metadata').insert({
              database_id: databaseId,
              row_id: insertedRow.id,
              column_name: columnName,
              source_file_id: fileData.id,
              imported_by: user.id,
            });
          }
        }

        // Update file metadata with results
        await supabase
          .from('database_files')
          .update({
            rows_imported: rowsImported,
            rows_skipped: rowsSkipped,
            duplicates_found: duplicatesFound,
          })
          .eq('id', fileData.id);

        toast({
          title: 'Данные импортированы',
          description: `Импортировано: ${rowsImported}, Пропущено: ${rowsSkipped}, Дубликатов: ${duplicatesFound}`,
        });
      }

      setFile(null);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Upload error:', err);
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
          {/* Import Mode Selector */}
          <div className="space-y-2">
            <Label>Режим импорта</Label>
            <ImportModeSelector value={importMode} onChange={setImportMode} />
          </div>

          {/* Duplicate Strategy Selector (only for data mode) */}
          {importMode === 'data' && (
            <div className="space-y-2">
              <Label>Обработка дубликатов</Label>
              <DuplicateStrategySelector value={duplicateStrategy} onChange={setDuplicateStrategy} />
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
              file ? 'bg-muted/50' : ''
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
                  <p className="text-sm font-medium">
                    Перетащите файл сюда или кликните для выбора
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
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
                  <File className="w-4 h-4" />
                  <span className="text-sm font-medium">{file.name}</span>
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
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
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
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <File className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="flex-1 text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Файл готов к загрузке</p>
                  <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
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