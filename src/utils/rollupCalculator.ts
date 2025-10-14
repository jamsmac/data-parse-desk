import { RollupConfig } from '@/types/database';
import { resolveRelation } from './relationResolver';

/**
 * Вычисляет rollup агрегацию для колонки
 */
export const calculateRollup = async (
  rollupConfig: RollupConfig,
  relationValue: string | string[]
): Promise<number | string | null> => {
  try {
    // Получаем ID связанных записей
    const recordIds = Array.isArray(relationValue) ? relationValue : [relationValue];
    
    if (recordIds.length === 0) {
      return null;
    }

    // Резолвим связанные записи
    const relatedRecords = await resolveRelation(
      rollupConfig.relation_column_id,
      recordIds
    );

    if (relatedRecords.length === 0) {
      return null;
    }

    // Извлекаем значения целевого поля
    const values = relatedRecords
      .map(record => record[rollupConfig.target_column])
      .filter(val => val !== null && val !== undefined);

    // Выполняем агрегацию
    return performAggregation(values, rollupConfig.aggregation);
  } catch (error) {
    console.error('Error calculating rollup:', error);
    return null;
  }
};

/**
 * Выполняет агрегацию над массивом значений
 */
const performAggregation = (
  values: any[],
  aggregation: RollupConfig['aggregation']
): number | string | null => {
  if (values.length === 0) {
    return null;
  }

  switch (aggregation) {
    case 'count':
      return values.length;

    case 'sum':
      return values.reduce((acc, val) => acc + (Number(val) || 0), 0);

    case 'avg': {
      const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
      return sum / values.length;
    }

    case 'min': {
      const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
      return numbers.length > 0 ? Math.min(...numbers) : null;
    }

    case 'max': {
      const numbers = values.map(v => Number(v)).filter(n => !isNaN(n));
      return numbers.length > 0 ? Math.max(...numbers) : null;
    }

    case 'median': {
      const numbers = values.map(v => Number(v)).filter(n => !isNaN(n)).sort((a, b) => a - b);
      if (numbers.length === 0) return null;
      const mid = Math.floor(numbers.length / 2);
      return numbers.length % 2 === 0
        ? (numbers[mid - 1] + numbers[mid]) / 2
        : numbers[mid];
    }

    case 'unique': {
      const uniqueValues = new Set(values);
      return uniqueValues.size;
    }

    case 'empty': {
      return values.filter(v => !v || v === '' || v === null).length;
    }

    case 'not_empty': {
      return values.filter(v => v && v !== '').length;
    }

    default:
      return null;
  }
};

/**
 * Batch вычисление rollup для множественных записей
 */
export const calculateRollupsForRecords = async (
  records: any[],
  rollupConfigs: Array<RollupConfig & { columnName: string }>
): Promise<any[]> => {
  const enrichedRecords = await Promise.all(
    records.map(async (record) => {
      const enrichedRecord = { ...record };

      for (const config of rollupConfigs) {
        const relationColumnValue = record[config.relation_column_id];
        
        if (relationColumnValue) {
          const rollupValue = await calculateRollup(config, relationColumnValue);
          enrichedRecord[config.columnName] = rollupValue;
        }
      }

      return enrichedRecord;
    })
  );

  return enrichedRecords;
};

/**
 * Форматирует rollup значение для отображения
 */
export const formatRollupValue = (
  value: number | string | null,
  aggregation: RollupConfig['aggregation']
): string => {
  if (value === null || value === undefined) {
    return '-';
  }

  switch (aggregation) {
    case 'count':
    case 'unique':
    case 'empty':
    case 'not_empty':
      return String(value);

    case 'sum':
    case 'avg':
    case 'min':
    case 'max':
    case 'median':
      return typeof value === 'number' ? value.toFixed(2) : String(value);

    default:
      return String(value);
  }
};
