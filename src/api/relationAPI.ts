import { supabase } from '@/integrations/supabase/client';
import { DatabaseRelation, RelationConfig, RollupConfig } from '@/types/database';
import { AnyObject, TableRow } from '@/types/common';

// RPC function types
interface RelationRPCFunctions {
  create_database_relation: (params: {
    source_database_id: string;
    target_database_id: string;
    relation_type: string;
    source_column: string;
    target_column: string;
  }) => Promise<DatabaseRelation>;
  get_database_relations: (params: { p_database_id: string }) => Promise<DatabaseRelation[]>;
  delete_database_relation: (params: { p_relation_id: string }) => Promise<void>;
  get_related_data: (params: {
    p_source_database_id: string;
    p_source_row_id: string;
    p_relation_column_id: string;
  }) => Promise<TableRow[]>;
  calculate_rollup: (params: {
    p_source_database_id: string;
    p_source_row_id: string;
    p_rollup_config: RollupConfig;
  }) => Promise<unknown>;
  get_lookup_value: (params: {
    p_source_database_id: string;
    p_source_row_id: string;
    p_relation_column_id: string;
    p_target_column: string;
  }) => Promise<unknown>;
  link_rows: (params: {
    p_source_database_id: string;
    p_source_row_id: string;
    p_relation_id: string;
    p_target_row_ids: string[];
  }) => Promise<void>;
  unlink_rows: (params: {
    p_source_database_id: string;
    p_source_row_id: string;
    p_relation_id: string;
    p_target_row_ids: string[];
  }) => Promise<void>;
  get_relationship_graph: (params: { 
    p_database_id: string | null;
  }) => Promise<{
    nodes: Array<{ id: string; name: string; icon?: string; color?: string }>;
    edges: Array<{ source: string; target: string; type: string }>;
  }>;
  get_available_rollup_columns: (params: { 
    p_relation_column_id: string;
  }) => Promise<string[]>;
}

// Type-safe RPC caller
const callRPC = async <K extends keyof RelationRPCFunctions>(
  functionName: K,
  params: Parameters<RelationRPCFunctions[K]>[0]
): Promise<Awaited<ReturnType<RelationRPCFunctions[K]>>> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(functionName, params);
  if (error) throw error;
  return data;
};

export class RelationAPI {
  // Создание связи между базами данных
  static async createRelation(
    sourceDatabaseId: string,
    config: RelationConfig
  ): Promise<DatabaseRelation> {
    return callRPC('create_database_relation', {
      source_database_id: sourceDatabaseId,
      target_database_id: config.target_database_id,
      relation_type: config.relation_type,
      source_column: config.display_field || 'id',
      target_column: config.display_field || 'id',
    });
  }

  // Получение всех связей базы данных
  static async getRelations(databaseId: string): Promise<DatabaseRelation[]> {
    const result = await callRPC('get_database_relations', { p_database_id: databaseId });
    return result || [];
  }

  // Удаление связи
  static async deleteRelation(relationId: string): Promise<void> {
    await callRPC('delete_database_relation', { p_relation_id: relationId });
  }

  // Получение связанных данных
  static async getRelatedData(
    sourceDatabaseId: string,
    sourceRowId: string,
    relationColumnId: string
  ): Promise<TableRow[]> {
    const result = await callRPC('get_related_data', {
      p_source_database_id: sourceDatabaseId,
      p_source_row_id: sourceRowId,
      p_relation_column_id: relationColumnId,
    });
    return result || [];
  }

  // Вычисление rollup агрегации
  static async calculateRollup(
    sourceDatabaseId: string,
    sourceRowId: string,
    rollupConfig: RollupConfig
  ): Promise<unknown> {
    return callRPC('calculate_rollup', {
      p_source_database_id: sourceDatabaseId,
      p_source_row_id: sourceRowId,
      p_rollup_config: rollupConfig,
    });
  }

  // Получение lookup значения
  static async getLookupValue(
    sourceDatabaseId: string,
    sourceRowId: string,
    relationColumnId: string,
    targetColumn: string
  ): Promise<unknown> {
    return callRPC('get_lookup_value', {
      p_source_database_id: sourceDatabaseId,
      p_source_row_id: sourceRowId,
      p_relation_column_id: relationColumnId,
      p_target_column: targetColumn,
    });
  }

  // Создание/обновление связи в строке
  static async linkRows(
    sourceDatabaseId: string,
    sourceRowId: string,
    relationId: string,
    targetRowIds: string[]
  ): Promise<void> {
    await callRPC('link_rows', {
      p_source_database_id: sourceDatabaseId,
      p_source_row_id: sourceRowId,
      p_relation_id: relationId,
      p_target_row_ids: targetRowIds,
    });
  }

  // Разрыв связи между строками
  static async unlinkRows(
    sourceDatabaseId: string,
    sourceRowId: string,
    relationId: string,
    targetRowIds: string[]
  ): Promise<void> {
    await callRPC('unlink_rows', {
      p_source_database_id: sourceDatabaseId,
      p_source_row_id: sourceRowId,
      p_relation_id: relationId,
      p_target_row_ids: targetRowIds,
    });
  }

  // Получение графа связей между базами данных
  static async getRelationshipGraph(databaseId?: string): Promise<{
    nodes: Array<{ id: string; name: string; icon?: string; color?: string }>;
    edges: Array<{ source: string; target: string; type: string }>;
  }> {
    const result = await callRPC('get_relationship_graph', { 
      p_database_id: databaseId || null 
    });
    return result || { nodes: [], edges: [] };
  }

  // Валидация конфигурации relation
  static validateRelationConfig(config: RelationConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.target_database_id) {
      errors.push('Не указана целевая база данных');
    }

    if (!config.relation_type) {
      errors.push('Не указан тип связи');
    }

    const validTypes = ['one_to_many', 'many_to_one', 'many_to_many'];
    if (config.relation_type && !validTypes.includes(config.relation_type)) {
      errors.push('Недопустимый тип связи');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Валидация конфигурации rollup
  static validateRollupConfig(config: RollupConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.relation_column_id) {
      errors.push('Не указана колонка со связью');
    }

    if (!config.target_column) {
      errors.push('Не указана целевая колонка для агрегации');
    }

    if (!config.aggregation) {
      errors.push('Не указан тип агрегации');
    }

    const validAggregations = [
      'count', 'sum', 'avg', 'min', 'max', 'median', 
      'unique', 'empty', 'not_empty'
    ];
    if (config.aggregation && !validAggregations.includes(config.aggregation)) {
      errors.push('Недопустимый тип агрегации');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Получение доступных колонок для rollup
  static async getAvailableRollupColumns(
    relationColumnId: string
  ): Promise<string[]> {
    const result = await callRPC('get_available_rollup_columns', { 
      p_relation_column_id: relationColumnId 
    });
    return result || [];
  }
}
