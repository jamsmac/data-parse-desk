import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import type { ParseResult } from '@/utils/fileParser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAnnounce } from '@/components/accessibility/LiveAnnouncer';
import { ImportPreview, ColumnDefinition } from './ImportPreview';
import { FileUploadZone } from './FileUploadZone';
import { ImportOptionsStep } from './ImportOptionsStep';

export interface ImportSuccessData {
  fileName: string;
  recordsImported: number;
  columnsDetected: number;
  duration: number;
  importedAt: Date;
}

export interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (data?: ImportSuccessData) => void;
  databaseId: string;
}

export const UploadFileDialog: React.FC<UploadFileDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
  databaseId,
}) => {
  const { toast } = useToast();
  const announce = useAnnounce();
  const acceptedFormats = ['.csv', '.xlsx', '.xls'];
  const maxSize = 10;
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'data' | 'schema_only'>('data');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'add_all'>('skip');

  // Preview state
  const [showPreview, setShowPreview] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const handleParseAndPreview = async () => {
    if (!file) return;

    setParsing(true);
    setError(null);

    try {
      console.log('Starting file parse:', file.name);

      // Lazy load fileParser only when needed
      const { parseFile } = await import('@/utils/fileParser');

      // Parse file
      const result = await parseFile(file);
      console.log('Parse result:', {
        headers: result.headers,
        rowCount: result.data.length,
        dateColumns: result.dateColumns,
        amountColumns: result.amountColumns,
      });

      // Validate parse result
      if (!result.data || result.data.length === 0) {
        throw new Error('Файл пустой или не удалось распарсить данные');
      }

      if (!result.headers || result.headers.length === 0) {
        throw new Error('Не найдены заголовки колонок');
      }

      // Store parse result and show preview
      setParseResult(result);
      setShowPreview(true);
      onOpenChange(false); // Close upload dialog
    } catch (err) {
      console.error('Parse error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ошибка парсинга файла';
      setError(errorMessage);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = async (columns: ColumnDefinition[], data: any[]) => {
    if (!parseResult) return;

    setUploading(true);
    const startTime = Date.now();

    try {

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Пользователь не авторизован');

      console.log('User authenticated:', user.id);
      console.log('Starting import with', columns.length, 'columns and', data.length, 'rows');

      // Save file metadata with column configuration
      const { data: fileData, error: fileError } = await supabase
        .from('database_files')
        .insert({
          database_id: databaseId,
          filename: parseResult.fileName,
          file_type: parseResult.fileName.split('.').pop()?.toLowerCase(),
          file_size: file?.size || 0,
          uploaded_by: user.id,
          import_mode: importMode,
          duplicate_strategy: duplicateStrategy,
          metadata: {
            headers: parseResult.headers,
            dateColumns: parseResult.dateColumns,
            amountColumns: parseResult.amountColumns,
            columnConfiguration: columns.map(col => ({
              name: col.name,
              type: col.type,
              displayName: col.displayName,
              aiSuggested: col.aiSuggested,
            })),
          }
        })
        .select()
        .single();

      if (fileError) throw fileError;

      if (importMode === 'schema_only') {
        // Create columns using the configured types from preview
        const { data: existingSchemas } = await supabase
          .from('table_schemas')
          .select('column_name')
          .eq('database_id', databaseId);

        const existingColumns = new Set(existingSchemas?.map(s => s.column_name) || []);
        let createdCount = 0;

        for (let i = 0; i < columns.length; i++) {
          const column = columns[i];
          if (existingColumns.has(column.name)) continue;

          await supabase.from('table_schemas').insert({
            database_id: databaseId,
            column_name: column.name,
            display_name: column.displayName || column.name,
            column_type: column.type,
            position: i,
            metadata: column.selectOptions ? {
              selectOptions: column.selectOptions,
            } : null,
            relation_config: column.relationConfig || null,
          });

          createdCount++;
        }

        toast({
          title: 'Схема импортирована',
          description: `Создано ${createdCount} новых колонок`,
        });

        announce(`Схема импортирована успешно. Создано ${createdCount} новых колонок`, 'polite');

        // Clear state for schema-only import
        setFile(null);
        setParseResult(null);
        setShowPreview(false);

        // Trigger UI refresh without success screen
        onSuccess();
      } else {
        // Import data with batch processing
        console.log('Starting data import...');
        let rowsImported = 0;
        let rowsSkipped = 0;
        let duplicatesFound = 0;

        // Prepare rows for insertion (use data from parameters, not parseResult)
        const rowsToInsert = [];

        if (duplicateStrategy === 'add_all') {
          // Skip duplicate detection, add all rows
          rowsToInsert.push(...data);
          console.log('Strategy: add_all, inserting all rows');
        } else {
          // Get existing data for duplicate detection
          console.log('Fetching existing data for duplicate detection...');
          const { data: existingData, error: fetchError } = await supabase
            .from('table_data')
            .select('id, data')
            .eq('database_id', databaseId);

          if (fetchError) {
            console.error('Error fetching existing data:', fetchError);
            throw new Error('Ошибка проверки дубликатов: ' + fetchError.message);
          }

          const existingRows = existingData || [];
          console.log('Existing rows:', existingRows.length);

          // Check each row for duplicates
          for (const row of data) {
            const rowHash = JSON.stringify(row);
            const isDuplicate = existingRows.some(existing =>
              JSON.stringify(existing.data) === rowHash
            );

            if (isDuplicate) {
              duplicatesFound++;
              if (duplicateStrategy === 'skip') {
                rowsSkipped++;
                continue;
              } else if (duplicateStrategy === 'update') {
                // Find and update existing row
                const existingRow = existingRows.find(existing =>
                  JSON.stringify(existing.data) === rowHash
                );
                if (existingRow) {
                  await supabase
                    .from('table_data')
                    .update({ data: row, updated_at: new Date().toISOString() })
                    .eq('id', existingRow.id);
                  rowsImported++;
                }
                continue;
              }
            }

            rowsToInsert.push(row);
          }

          console.log('Rows to insert:', rowsToInsert.length);
        }

        // Batch insert rows (split into chunks of 100 for performance)
        const BATCH_SIZE = 100;
        const insertedRowIds = [];

        for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
          const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
          const batchData = batch.map(row => ({
            database_id: databaseId,
            data: row,
          }));

          console.log(`Inserting batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(rowsToInsert.length / BATCH_SIZE)}...`);

          const { data: insertedRows, error: insertError } = await supabase
            .from('table_data')
            .insert(batchData)
            .select('id');

          if (insertError) {
            console.error('Batch insert error:', insertError);
            rowsSkipped += batch.length;
            continue;
          }

          if (insertedRows) {
            rowsImported += insertedRows.length;
            insertedRowIds.push(...insertedRows.map(r => r.id));
          }
        }

        console.log('Data inserted:', rowsImported);

        // Create cell metadata for all inserted rows (batch insert)
        if (insertedRowIds.length > 0) {
          console.log('Creating cell metadata...');
          const allCellMetadata = [];

          for (let i = 0; i < insertedRowIds.length; i++) {
            const rowId = insertedRowIds[i];
            const row = rowsToInsert[i];

            const metadata = Object.keys(row).map(columnName => ({
              database_id: databaseId,
              row_id: rowId,
              column_name: columnName,
              source_file_id: fileData.id,
              source_row_number: i + 2,
              imported_by: user.id,
            }));

            allCellMetadata.push(...metadata);
          }

          // Insert cell metadata in batches
          for (let i = 0; i < allCellMetadata.length; i += 500) {
            const metadataBatch = allCellMetadata.slice(i, i + 500);
            const { error: metadataError } = await supabase
              .from('cell_metadata')
              .insert(metadataBatch);

            if (metadataError) {
              console.error('Cell metadata insert error:', metadataError);
            }
          }

          console.log('Cell metadata created');
        }

        // Update file metadata with results
        console.log('Updating file metadata...');
        const { error: updateError } = await supabase
          .from('database_files')
          .update({
            rows_imported: rowsImported,
            rows_skipped: rowsSkipped,
            duplicates_found: duplicatesFound,
          })
          .eq('id', fileData.id);

        if (updateError) {
          console.error('Error updating file metadata:', updateError);
        }

        console.log('Import completed successfully!', {
          rowsImported,
          rowsSkipped,
          duplicatesFound,
        });

        toast({
          title: 'Данные успешно импортированы!',
          description: `Импортировано: ${rowsImported} строк${rowsSkipped > 0 ? `, Пропущено: ${rowsSkipped}` : ''}${duplicatesFound > 0 ? `, Дубликатов: ${duplicatesFound}` : ''}`,
        });

        announce(`Импорт завершен успешно. Импортировано ${rowsImported} строк из файла ${parseResult.fileName}`, 'polite');

        // Calculate duration and prepare success data
        const duration = Date.now() - startTime;
        const successData: ImportSuccessData = {
          fileName: parseResult.fileName,
          recordsImported: rowsImported,
          columnsDetected: columns.length,
          duration,
          importedAt: new Date(),
        };

        // Clear state
        setFile(null);
        setParseResult(null);
        setShowPreview(false);

        // Trigger UI refresh with success data
        onSuccess(successData);
      }

      console.log('Upload process completed');
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки файла';
      console.error('Error details:', errorMessage);
      setError(errorMessage);

      toast({
        title: 'Ошибка импорта',
        description: errorMessage,
        variant: 'destructive',
      });

      announce(`Ошибка импорта: ${errorMessage}`, 'assertive');
    } finally {
      setUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setParseResult(null);
    onOpenChange(true); // Reopen upload dialog
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Загрузить файл</DialogTitle>
            <DialogDescription>
              Выберите файл для импорта данных. Поддерживаемые форматы: {acceptedFormats.join(', ')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Import Options */}
            <ImportOptionsStep
              importMode={importMode}
              duplicateStrategy={duplicateStrategy}
              onImportModeChange={setImportMode}
              onDuplicateStrategyChange={setDuplicateStrategy}
            />

            {/* File Upload Zone */}
            <FileUploadZone
              file={file}
              onFileSelect={setFile}
              onError={setError}
              error={error}
              disabled={uploading || parsing}
              acceptedFormats={acceptedFormats}
              maxSize={maxSize}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={parsing || uploading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleParseAndPreview}
              disabled={!file || parsing || uploading}
            >
              {parsing ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Парсинг...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Предпросмотр
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      {showPreview && parseResult && (
        <ImportPreview
          open={showPreview}
          onOpenChange={(open) => {
            if (!open) handleCancelPreview();
          }}
          parseResult={parseResult}
          databaseId={databaseId}
          onConfirm={handleConfirmImport}
          onCancel={handleCancelPreview}
        />
      )}
    </>
  );
};