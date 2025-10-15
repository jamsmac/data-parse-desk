import React, { useState, useCallback, useEffect } from 'react';
import { Upload, X, AlertCircle, CheckCircle2, FileSpreadsheet, FileText, Sparkles, TrendingUp, AlertTriangle, Info, ThumbsUp, ThumbsDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GlassDialog as Dialog,
  GlassDialogContent as DialogContent,
  GlassDialogDescription as DialogDescription,
  GlassDialogHeader as DialogHeader,
  GlassDialogTitle as DialogTitle,
  FadeIn,
} from '@/components/aurora';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useParseFile, useImportData } from '@/hooks/useFiles';
import { suggestColumnMapping } from '@/utils/columnMapper';
import { mlMapper } from '@/utils/mlMapper';
import { mappingMemory } from '@/utils/mappingMemory';
import { validateData, analyzeDataQuality } from '@/utils/advancedValidation';
import type { TableSchema, ParsedFileData, ColumnMapping, ValidationError } from '@/types/database';

interface DataQualityReport {
  completeness: number;
  uniqueness: number;
  consistency: number;
  totalErrors: number;
  warnings: string[];
}

interface FileImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseId: string;
  existingColumns: TableSchema[];
  onImportComplete?: () => void;
}

export const FileImportDialog: React.FC<FileImportDialogProps> = ({
  open,
  onOpenChange,
  databaseId,
  existingColumns,
  onImportComplete,
}) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedFileData | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload');
  const [importProgress, setImportProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [dataQuality, setDataQuality] = useState<DataQualityReport | null>(null);
  const [validationErrors, setValidationErrors] = useState<Array<ValidationError & {severity: 'error' | 'warning'}>>([]);
  const [useMLMapping, setUseMLMapping] = useState(true);
  const [mappingFeedback, setMappingFeedback] = useState<Record<string, boolean>>({});

  // ✅ Ref для отслеживания interval при импорте
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const parseFileMutation = useParseFile();
  const importDataMutation = useImportData(databaseId);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast({
        title: 'Неподдерживаемый формат',
        description: 'Пожалуйста, загрузите CSV или Excel файл',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: 'Файл слишком большой',
        description: 'Максимальный размер файла: 10MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);

    // Определяем формат файла
    let format: 'csv' | 'json' | 'excel' = 'csv';
    if (selectedFile.name.endsWith('.json')) {
      format = 'json';
    } else if (selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      format = 'excel';
    }

    try {
      const result = await parseFileMutation.mutateAsync(selectedFile);

      setParsedData(result);

      // Умный маппинг с ML и историей
      let smartMappings: ColumnMapping[] = [];
      
      if (useMLMapping) {
        // Сначала пробуем найти похожие маппинги из истории
        const historicalMappings = mappingMemory.suggestFromHistory(
          result.headers,
          existingColumns.map(c => c.column_name),
          databaseId
        );

        if (historicalMappings.length > 0) {
          smartMappings = historicalMappings;
          toast({
            title: '🎯 Найдены исторические маппинги',
            description: `Применено ${historicalMappings.length} проверенных сопоставлений`,
          });
        } else {
          // Используем ML для нового маппинга
          const sourceColumns = result.headers.map(header => ({
            name: header,
            values: result.rows.slice(0, 100).map(row => row[header]),
          }));

          const targetColumns = existingColumns.map(col => ({
            name: col.column_name,
            type: col.column_type,
          }));

          const mlSuggestions = mlMapper.suggestMappings(sourceColumns, targetColumns);
          
          // Преобразуем в ColumnMapping[]
          smartMappings = mlSuggestions.map(s => ({
            sourceColumn: s.sourceColumn,
            targetColumn: s.targetColumn,
            confidence: s.confidence,
          }));

          toast({
            title: '🤖 ML-маппинг применен',
            description: `Автоматически сопоставлено ${smartMappings.filter(m => m.confidence && m.confidence > 0.7).length} колонок`,
          });
        }
      } else {
        // Простой маппинг по именам        
        smartMappings = suggestColumnMapping(
          result.headers,
          existingColumns,
          0.6
        );
      }

      setColumnMappings(smartMappings);

      // Анализ качества данных
      const qualityReport = analyzeDataQuality(result.rows, result.headers);
      setDataQuality(qualityReport);

      // Валидация данных
      const targetColumnsForValidation = smartMappings
        .filter(m => m.targetColumn)
        .map(m => {
          const schema = existingColumns.find(c => c.column_name === m.targetColumn);
          return {
            name: m.targetColumn!,
            type: schema?.column_type || 'text',
            required: false,
          };
        });

      const errors = validateData(result.rows, targetColumnsForValidation, []);
      // Преобразуем ValidationError из database.ts в формат для отображения
      const formattedErrors = errors.map(err => ({
        ...err,
        severity: 'error' as const
      }));
      setValidationErrors(formattedErrors);

      setStep('mapping');

      toast({
        title: 'Файл успешно загружен',
        description: `Найдено ${result.totalRows} строк и ${result.headers.length} колонок. Качество: ${Math.round(qualityReport.completeness * 100)}%`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: error instanceof Error ? error.message : 'Не удалось загрузить файл',
        variant: 'destructive',
      });
    }
  }, [databaseId, existingColumns, parseFileMutation, toast, useMLMapping]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  // Обработка feedback для улучшения ML
  const handleMappingFeedback = (sourceColumn: string, isCorrect: boolean) => {
    setMappingFeedback(prev => ({ ...prev, [sourceColumn]: isCorrect }));

    const mapping = columnMappings.find(m => m.sourceColumn === sourceColumn);
    if (mapping && mapping.targetColumn) {
      // Создаем объект маппинга для улучшения
      const currentMapping = columnMappings.reduce((acc, m) => {
        if (m.targetColumn) {
          acc[m.sourceColumn] = m.targetColumn;
        }
        return acc;
      }, {} as Record<string, string>);

      const feedback = [{
        source: sourceColumn,
        target: mapping.targetColumn,
        isCorrect,
      }];

      const improved = mlMapper.improveMappingWithFeedback(currentMapping, feedback);
      
      // Обновляем маппинги на основе улучшенного результата
      setColumnMappings(prev => 
        prev.map(m => ({
          ...m,
          targetColumn: improved[m.sourceColumn] || m.targetColumn,
        }))
      );
    }

    toast({
      title: isCorrect ? '✅ Спасибо за подтверждение' : '🔄 Учтем на будущее',
      description: 'ML-алгоритм улучшен',
    });
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setStep('importing');
    setImportProgress(0);

    try {
      // Simulate progress (in real implementation, track actual progress)
      // ✅ Сохраняем в ref для cleanup
      progressIntervalRef.current = setInterval(() => {
        setImportProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      // Преобразуем массив маппингов в объект для совместимости
      const mappingObj = columnMappings.reduce((acc, mapping) => {
        if (mapping.targetColumn) {
          acc[mapping.sourceColumn] = mapping.targetColumn;
        }
        return acc;
      }, {} as Record<string, string>);

      await importDataMutation.mutateAsync({
        data: parsedData.rows,
        columnMapping: columnMappings,
      });

      setImportProgress(100);

      toast({
        title: 'Импорт завершен',
        description: `Успешно импортировано ${parsedData.totalRows} строк`,
      });

      // Сохраняем успешный маппинг в историю
      if (file) {
        const mappingObj = columnMappings.reduce((acc, m) => {
          if (m.targetColumn) {
            acc[m.sourceColumn] = m.targetColumn;
          }
          return acc;
        }, {} as Record<string, string>);

        mappingMemory.saveMapping({
          sourceColumns: parsedData.headers,
          targetColumns: existingColumns.map(c => c.column_name),
          mapping: mappingObj,
          databaseId,
          fileName: file.name,
          userId: 'current-user', // TODO: получить из auth контекста
          successful: true,
        });
      }

      setTimeout(() => {
        onImportComplete?.();
        handleClose();
      }, 1000);
    } catch (error) {
      toast({
        title: 'Ошибка импорта',
        description: error instanceof Error ? error.message : 'Не удалось импортировать данные',
        variant: 'destructive',
      });
      setStep('preview');
      setImportProgress(0);
    } finally {
      // ✅ ВСЕГДА очищаем интервал
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  // ✅ КРИТИЧЕСКИЙ Cleanup при размонтировании компонента
  useEffect(() => {
    return () => {
      // Очищаем interval если компонент unmount во время импорта
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      // Сбрасываем прогресс при размонтировании
      setImportProgress(0);
    };
  }, []);

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setColumnMappings([]);
    setStep('upload');
    setImportProgress(0);
    onOpenChange(false);
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-primary/50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium mb-2">
          Загрузите файл или перетащите его сюда
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Поддерживаются форматы: CSV, Excel (XLSX, XLS)
        </p>
        <p className="text-xs text-gray-400">
          Максимальный размер: 10MB
        </p>
        <input
          id="file-input"
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />
      </div>

      {file && (
        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertDescription>
            Выбран файл: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderMappingStep = () => {
    if (!parsedData) return null;

    const unmappedColumns = parsedData.headers.filter(
      col => !columnMappings.find(m => m.sourceColumn === col && m.targetColumn)
    );

    const highConfidenceMappings = columnMappings.filter(m => m.confidence && m.confidence > 0.8);
    const mediumConfidenceMappings = columnMappings.filter(m => m.confidence && m.confidence >= 0.5 && m.confidence <= 0.8);
    const lowConfidenceMappings = columnMappings.filter(m => m.confidence && m.confidence < 0.5);

    return (
      <Tabs defaultValue="mapping" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mapping">
            Сопоставление
            {highConfidenceMappings.length > 0 && (
              <Badge variant="secondary" className="ml-2">{highConfidenceMappings.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="quality">
            Качество данных
            {dataQuality && (
              <Badge 
                variant={dataQuality.completeness > 0.9 ? "default" : "destructive"} 
                className="ml-2"
              >
                {Math.round(dataQuality.completeness * 100)}%
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mapping" className="space-y-4">
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              {useMLMapping ? (
                <>ML-алгоритм автоматически сопоставил колонки. Проверьте и подтвердите маппинг.</>
              ) : (
                <>Сопоставьте колонки из файла с колонками базы данных.</>
              )}
            </AlertDescription>
          </Alert>

          {/* Статистика confidence */}
          {useMLMapping && (
            <div className="grid grid-cols-3 gap-2">
              <div className="border rounded p-2 text-center">
                <div className="text-2xl font-bold text-green-600">{highConfidenceMappings.length}</div>
                <div className="text-xs text-gray-600">Высокая уверенность</div>
              </div>
              <div className="border rounded p-2 text-center">
                <div className="text-2xl font-bold text-yellow-600">{mediumConfidenceMappings.length}</div>
                <div className="text-xs text-gray-600">Средняя уверенность</div>
              </div>
              <div className="border rounded p-2 text-center">
                <div className="text-2xl font-bold text-red-600">{lowConfidenceMappings.length}</div>
                <div className="text-xs text-gray-600">Низкая уверенность</div>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {parsedData.headers.map((fileColumn) => {
              const mapping = columnMappings.find(m => m.sourceColumn === fileColumn);
              const feedback = mappingFeedback[fileColumn];
              const confidence = mapping?.confidence || 0;

              return (
                <div key={fileColumn} className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <Label className="font-medium">{fileColumn}</Label>
                      {confidence > 0 && (
                        <Badge 
                          variant={confidence > 0.8 ? "default" : confidence > 0.5 ? "secondary" : "outline"}
                          className="ml-2"
                        >
                          {Math.round(confidence * 100)}%
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={mapping?.targetColumn || ''}
                      onValueChange={(value) => {
                        setColumnMappings((prev) => {
                          const existing = prev.find(m => m.sourceColumn === fileColumn);
                          if (existing) {
                            return prev.map(m => 
                              m.sourceColumn === fileColumn 
                                ? { ...m, targetColumn: value }
                                : m
                            );
                          } else {
                            return [...prev, { sourceColumn: fileColumn, targetColumn: value, confidence: 0.8 }];
                          }
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Не сопоставлено" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Не сопоставлено</SelectItem>
                        {existingColumns.map((col) => (
                          <SelectItem key={col.id} value={col.column_name}>
                            {col.column_name} ({col.column_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Feedback buttons для ML */}
                  {useMLMapping && mapping?.targetColumn && feedback === undefined && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600">Маппинг правильный?</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => handleMappingFeedback(fileColumn, true)}
                      >
                        <ThumbsUp className="h-3 w-3 text-green-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => handleMappingFeedback(fileColumn, false)}
                      >
                        <ThumbsDown className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  )}

                  {feedback !== undefined && (
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      {feedback ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span>Подтверждено</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-yellow-600" />
                          <span>Требует проверки</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {unmappedColumns.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Несопоставленные колонки ({unmappedColumns.length}): {unmappedColumns.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          {dataQuality && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Полнота</span>
                    <TrendingUp className={`h-4 w-4 ${dataQuality.completeness > 0.9 ? 'text-green-600' : 'text-yellow-600'}`} />
                  </div>
                  <div className="text-2xl font-bold">{Math.round(dataQuality.completeness * 100)}%</div>
                  <Progress value={dataQuality.completeness * 100} className="mt-2" />
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Уникальность</span>
                    <Sparkles className={`h-4 w-4 ${dataQuality.uniqueness > 0.9 ? 'text-green-600' : 'text-yellow-600'}`} />
                  </div>
                  <div className="text-2xl font-bold">{Math.round(dataQuality.uniqueness * 100)}%</div>
                  <Progress value={dataQuality.uniqueness * 100} className="mt-2" />
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Согласованность</span>
                    <CheckCircle2 className={`h-4 w-4 ${dataQuality.consistency > 0.9 ? 'text-green-600' : 'text-yellow-600'}`} />
                  </div>
                  <div className="text-2xl font-bold">{Math.round(dataQuality.consistency * 100)}%</div>
                  <Progress value={dataQuality.consistency * 100} className="mt-2" />
                </div>
              </div>

              {dataQuality.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Обнаружены проблемы с данными:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {dataQuality.warnings.slice(0, 5).map((warning, idx) => (
                        <li key={idx} className="text-sm">{warning}</li>
                      ))}
                    </ul>
                    {dataQuality.warnings.length > 5 && (
                      <p className="text-sm mt-2 text-gray-600">
                        ...и еще {dataQuality.warnings.length - 5} предупреждений
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">Критические ошибки ({validationErrors.length}):</div>
                    <ul className="list-disc list-inside space-y-1">
                      {validationErrors.slice(0, 5).map((error, idx) => (
                        <li key={idx} className="text-sm">
                          Строка {error.row}: {error.message}
                        </li>
                      ))}
                    </ul>
                    {validationErrors.length > 5 && (
                      <p className="text-sm mt-2">
                        ...и еще {validationErrors.length - 5} ошибок
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {validationErrors.length === 0 && dataQuality.warnings.length === 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Данные прошли все проверки качества! Готовы к импорту.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </TabsContent>

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => setStep('upload')}>
            Назад
          </Button>
          <Button
            onClick={() => setStep('preview')}
            disabled={columnMappings.filter(m => m.targetColumn).length === 0}
          >
            Далее: Предпросмотр
          </Button>
        </div>
      </Tabs>
    );
  };

  const renderPreviewStep = () => {
    if (!parsedData) return null;

    const mappedColumns = columnMappings.filter(m => m.targetColumn);
    const previewRows = parsedData.rows.slice(0, 5);

    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Будет импортировано {parsedData.totalRows} строк в {mappedColumns.length} колонок
          </AlertDescription>
        </Alert>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {mappedColumns.map((mapping) => (
                    <th key={mapping.sourceColumn} className="px-4 py-2 text-left font-medium">
                      {mapping.targetColumn}
                      <span className="text-xs text-gray-500 block">({mapping.sourceColumn})</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    {mappedColumns.map((mapping) => (
                      <td key={mapping.sourceColumn} className="px-4 py-2">
                        {String(row[mapping.sourceColumn] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {parsedData.totalRows > 5 && (
          <p className="text-xs text-gray-500 text-center">
            Показано 5 из {parsedData.totalRows} строк
          </p>
        )}

        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={() => setStep('mapping')}>
            Назад
          </Button>
          <Button onClick={handleImport}>
            Импортировать данные
          </Button>
        </div>
      </div>
    );
  };

  const renderImportingStep = () => (
    <div className="space-y-4 py-8">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
        <h3 className="text-lg font-medium mb-2">Импорт данных...</h3>
        <p className="text-sm text-gray-500 mb-4">
          Пожалуйста, не закрывайте это окно
        </p>
      </div>

      <Progress value={importProgress} className="w-full" />
      
      <p className="text-center text-sm text-gray-600">
        {importProgress}% завершено
      </p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Импорт данных</DialogTitle>
          <DialogDescription>
            Загрузите CSV или Excel файл для импорта данных в базу данных
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && renderUploadStep()}
        {step === 'mapping' && renderMappingStep()}
        {step === 'preview' && renderPreviewStep()}
        {step === 'importing' && renderImportingStep()}
      </DialogContent>
    </Dialog>
  );
};
