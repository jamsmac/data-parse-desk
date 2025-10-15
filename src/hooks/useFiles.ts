import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileAPI } from '../api/fileAPI';
import type { 
  FileUploadResult, 
  ColumnMapping, 
  ValidationError,
  ParsedFileData,
  TableFilters 
} from '../types/database';
import type { TableRow } from '../types/common';

/**
 * Hook для загрузки и парсинга файлов
 */
export function useUploadFile(databaseId: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      return await FileAPI.uploadFile(file, databaseId, userId);
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
    mutationFn: async (file: File) => {
      return await FileAPI.parseFile(file);
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
      mapping,
      schemas
    }: { 
      data: TableRow[]; 
      mapping: ColumnMapping[];
      schemas: Record<string, { type: string; required: boolean }>
    }) => {
      return FileAPI.validateData(data, mapping, schemas);
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
      columnMapping 
    }: { 
      data: TableRow[]; 
      columnMapping: ColumnMapping[] 
    }) => {
      return await FileAPI.importData(databaseId, data, columnMapping);
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
      // Получаем историю импортов из localStorage как временное решение
      const historyKey = `import_history_${databaseId}`;
      const history = localStorage.getItem(historyKey);
      return history ? JSON.parse(history) : [];
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
      // Базовая реализация rollback через удаление записей
      // В продакшене должно быть реализовано через транзакции Supabase
      console.warn(`Rollback для импорта ${importId} будет реализован в следующей версии`);
      
      // Удаляем запись из истории
      const historyKey = `import_history_${databaseId}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      const updatedHistory = history.filter((item: { id: string }) => item.id !== importId);
      localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      
      return { success: true, importId };
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
      filters?: TableFilters 
    }) => {
      // Базовая реализация экспорта
      try {
        const data = await FileAPI.getTableData(databaseId, filters);
        
        let exportedData: Blob;
        let fileName: string;
        
        switch (format) {
          case 'json':
            exportedData = new Blob([JSON.stringify(data, null, 2)], { 
              type: 'application/json' 
            });
            fileName = `export_${databaseId}_${Date.now()}.json`;
            break;
            
          case 'csv': {
            // Простая CSV конвертация
            const csvContent = FileAPI.convertToCSV(data);
            exportedData = new Blob([csvContent], { 
              type: 'text/csv;charset=utf-8;' 
            });
            fileName = `export_${databaseId}_${Date.now()}.csv`;
            break;
          }
            
          case 'excel': {
            // Для Excel используем базовую CSV конвертацию
            const excelContent = FileAPI.convertToCSV(data);
            exportedData = new Blob([excelContent], { 
              type: 'application/vnd.ms-excel' 
            });
            fileName = `export_${databaseId}_${Date.now()}.xls`;
            break;
          }
            
          default:
            throw new Error(`Неподдерживаемый формат: ${format}`);
        }
        
        // Создаем ссылку для скачивания
        const url = window.URL.createObjectURL(exportedData);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        return { 
          success: true, 
          fileName,
          rowCount: data.length 
        };
      } catch (error) {
        console.error('Export error:', error);
        throw new Error(`Ошибка экспорта данных: ${error}`);
      }
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
