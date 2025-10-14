import { supabase } from '@/integrations/supabase/client';

/**
 * Резолвит связанные данные для relation колонок
 */
export const resolveRelation = async (
  targetDatabaseId: string,
  recordIds: string[],
  displayField?: string
): Promise<Record<string, any>[]> => {
  if (!recordIds || recordIds.length === 0) {
    return [];
  }

  try {
    // Используем RPC функцию для получения данных из динамической таблицы
    const tableName = `data_${targetDatabaseId.replace(/-/g, '_')}`;

    // Получаем связанные записи
    const { data, error } = await supabase
      .from(tableName as any)
      .select('*')
      .in('id', recordIds);

    if (error) {
      console.error('Error resolving relation:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in resolveRelation:', error);
    return [];
  }
};

/**
 * Резолвит одну связанную запись
 */
export const resolveRelationSingle = async (
  targetDatabaseId: string,
  recordId: string,
  displayField?: string
): Promise<any> => {
  const results = await resolveRelation(targetDatabaseId, [recordId], displayField);
  return results[0] || null;
};

/**
 * Получает отображаемое значение из связанной записи
 */
export const getDisplayValue = (record: any, displayField?: string): string => {
  if (!record) return '';
  
  if (displayField && record[displayField]) {
    return String(record[displayField]);
  }

  // Приоритетные поля для отображения
  const priorityFields = ['name', 'title', 'label', 'email', 'id'];
  
  for (const field of priorityFields) {
    if (record[field]) {
      return String(record[field]);
    }
  }

  return record.id || '';
};

/**
 * Резолвит множественные relation колонки в массиве записей
 */
export const resolveMultipleRelations = async (
  records: any[],
  relationConfigs: Array<{
    columnName: string;
    targetDatabaseId: string;
    displayField?: string;
  }>
): Promise<any[]> => {
  const resolvedRecords = await Promise.all(
    records.map(async (record) => {
      const resolvedRecord = { ...record };

      for (const config of relationConfigs) {
        const value = record[config.columnName];
        
        if (!value) continue;

        // Обработка массива ID (many_to_many или one_to_many)
        if (Array.isArray(value)) {
          const relatedRecords = await resolveRelation(
            config.targetDatabaseId,
            value,
            config.displayField
          );
          resolvedRecord[`${config.columnName}_resolved`] = relatedRecords.map(r =>
            getDisplayValue(r, config.displayField)
          );
        } else {
          // Обработка одного ID (many_to_one)
          const relatedRecord = await resolveRelationSingle(
            config.targetDatabaseId,
            value,
            config.displayField
          );
          resolvedRecord[`${config.columnName}_resolved`] = getDisplayValue(
            relatedRecord,
            config.displayField
          );
        }
      }

      return resolvedRecord;
    })
  );

  return resolvedRecords;
};

/**
 * Проверяет существование связанной записи
 */
export const validateRelationExists = async (
  targetDatabaseId: string,
  recordId: string
): Promise<boolean> => {
  try {
    const tableName = `data_${targetDatabaseId.replace(/-/g, '_')}`;
    
    const { data, error } = await supabase
      .from(tableName as any)
      .select('id')
      .eq('id', recordId)
      .single();

    return !error && !!data;
  } catch (error) {
    console.error('Error validating relation:', error);
    return false;
  }
};
