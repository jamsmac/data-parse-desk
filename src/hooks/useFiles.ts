import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileAPI } from '../api/fileAPI';
import type { 
  FileUploadResult, 
  ColumnMapping, 
  ValidationError,
  ParsedFileData 
} from '../types/database';

/**
 * Hook для загрузки и парсинга файлов
 */
export function useUploadFile(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      return await FileAPI.uploadFile(file, databaseId);
    },
    onSuccess: () => {
      // Инвалидируем данные таблицы после загрузки
      queryClient.invalidateQueries({ queryKey: ['tableData', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['databaseStats', databaseId] });
    },
  });
}

/**
 * Hook для парсинга файла без загрузки
 */
export function useParseFile() {
  return useMutation({
    mutationFn: async ({ file, format }: { file: File; format: 'csv' | 'json' | 'excel' }) => {
      const text = await file.text();
      
      switch (format) {
        case 'csv':
          return FileAPI.parseCSV(text);
        case 'json':
          return FileAPI.parseJSON(text);
        case 'excel':
          throw new Error('Excel parsing not yet implemented');
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    },
  });
}

/**
 * Hook для предложения маппинга колонок
 */
export function useColumnMapping() {
  return useMutation({
    mutationFn: async ({ 
      fileColumns, 
      schemaColumns 
    }: { 
      fileColumns: string[]; 
      schemaColumns: string[] 
    }) => {
      return FileAPI.suggestColumnMapping(fileColumns, schemaColumns);
    },
  });
}

/**
 * Hook для валидации данных перед импортом
 */
export function useValidateData() {
  return useMutation({
    mutationFn: async ({ 
      data, 
      tableSchema 
    }: { 
      data: Record<string, any>[]; 
      tableSchema: any 
    }) => {
      return FileAPI.validateData(data, tableSchema);
    },
  });
}

/**
 * Hook для импорта данных в таблицу
 */
export function useImportData(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      data, 
      columnMapping, 
      updateExisting 
    }: { 
      data: Record<string, any>[]; 
      columnMapping: ColumnMapping; 
      updateExisting?: boolean 
    }) => {
      return await FileAPI.importData(databaseId, data, columnMapping, updateExisting);
    },
    onSuccess: () => {
      // Инвалидируем данные после импорта
      queryClient.invalidateQueries({ queryKey: ['tableData', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['databaseStats', databaseId] });
    },
  });
}

/**
 * Hook для получения истории импортов
 */
export function useImportHistory(databaseId: string) {
  return useQuery({
    queryKey: ['importHistory', databaseId],
    queryFn: async () => {
      // TODO: Implement import history tracking in Supabase
      // For now, return empty array
      return [];
    },
    staleTime: 30000, // 30 секунд
  });
}

/**
 * Hook для отмены импорта (rollback)
 */
export function useRollbackImport(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      // TODO: Implement rollback logic in Supabase
      throw new Error('Rollback not yet implemented');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tableData', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['importHistory', databaseId] });
    },
  });
}

/**
 * Hook для экспорта данных
 */
export function useExportData(databaseId: string) {
  return useMutation({
    mutationFn: async ({ 
      format, 
      filters 
    }: { 
      format: 'csv' | 'json' | 'excel'; 
      filters?: Record<string, any> 
    }) => {
      // TODO: Implement export logic
      throw new Error('Export not yet implemented');
    },
  });
}

/**
 * Комбинированный hook для полного процесса импорта файла
 */
export function useFileImportFlow(databaseId: string) {
  const parseFile = useParseFile();
  const suggestMapping = useColumnMapping();
  const validateData = useValidateData();
  const importData = useImportData(databaseId);

  return {
    // Шаг 1: Парсинг файла
    parseFile,
    
    // Шаг 2: Предложение маппинга
    suggestMapping,
    
    // Шаг 3: Валидация данных
    validateData,
    
    // Шаг 4: Импорт данных
    importData,
    
    // Общее состояние загрузки
    isLoading: 
      parseFile.isPending || 
      suggestMapping.isPending || 
      validateData.isPending || 
      importData.isPending,
    
    // Общая ошибка
    error: 
      parseFile.error || 
      suggestMapping.error || 
      validateData.error || 
      importData.error,
    
    // Сброс всех состояний
    reset: () => {
      parseFile.reset();
      suggestMapping.reset();
      validateData.reset();
      importData.reset();
    },
  };
}
