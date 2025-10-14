import { supabase } from '@/integrations/supabase/client';
import { DatabaseRelation, RelationConfig, RollupConfig } from '@/types/database';

export class RelationAPI {
  // Создание связи между базами данных
  static async createRelation(
    sourceDatabaseId: string,
    config: RelationConfig
  ): Promise<DatabaseRelation> {
    const { data: relation, error } = await supabase
      .rpc('create_database_relation', {
        source_database_id: sourceDatabaseId,
        target_database_id: config.target_database_id,
        relation_type: config.relation_type,
        source_column: config.display_field || 'id',
        target_column: config.display_field || 'id',
      } as any);

    if (error) throw error;
    return relation;
  }

  // Получение всех связей базы данных
  static async getRelations(databaseId: string): Promise<DatabaseRelation[]> {
    const { data, error } = await supabase
      .rpc('get_database_relations', { p_database_id: databaseId });

    if (error) throw error;
    return data || [];
  }

  // Удаление связи
  static async deleteRelation(relationId: string): Promise<void> {
    const { error } = await supabase
      .rpc('delete_database_relation', { p_relation_id: relationId });

    if (error) throw error;
  }

  // Получение связанных данных
  static async getRelatedData(
    sourceDatabaseId: string,
    sourceRowId: string,
    relationColumnId: string
  ): Promise<any[]> {
    const { data, error } = await supabase
      .rpc('get_related_data', {
        p_source_database_id: sourceDatabaseId,
        p_source_row_id: sourceRowId,
        p_relation_column_id: relationColumnId,
      });

    if (error) throw error;
    return data || [];
  }

  // Вычисление rollup агрегации
  static async calculateRollup(
    sourceDatabaseId: string,
    sourceRowId: string,
    rollupConfig: RollupConfig
  ): Promise<any> {
    const { data, error } = await supabase
      .rpc('calculate_rollup', {
        p_source_database_id: sourceDatabaseId,
        p_source_row_id: sourceRowId,
        p_rollup_config: rollupConfig as any,
      });

    if (error) throw error;
    return data;
  }

  // Получение lookup значения
  static async getLookupValue(
    sourceDatabaseId: string,
    sourceRowId: string,
    relationColumnId: string,
    targetColumn: string
  ): Promise<any> {
    const { data, error } = await supabase
      .rpc('get_lookup_value', {
        p_source_database_id: sourceDatabaseId,
        p_source_row_id: sourceRowId,
        p_relation_column_id: relationColumnId,
        p_target_column: targetColumn,
      });

    if (error) throw error;
    return data;
  }

  // Создание/обновление связи в строке
  static async linkRows(
    sourceDatabaseId: string,
    sourceRowId: string,
    relationId: string,
    targetRowIds: string[]
  ): Promise<void> {
    const { error } = await supabase
      .rpc('link_rows', {
        p_source_database_id: sourceDatabaseId,
        p_source_row_id: sourceRowId,
        p_relation_id: relationId,
        p_target_row_ids: targetRowIds as any,
      });

    if (error) throw error;
  }

  // Разрыв связи между строками
  static async unlinkRows(
    sourceDatabaseId: string,
    sourceRowId: string,
    relationId: string,
    targetRowIds: string[]
  ): Promise<void> {
    const { error } = await supabase
      .rpc('unlink_rows', {
        p_source_database_id: sourceDatabaseId,
        p_source_row_id: sourceRowId,
        p_relation_id: relationId,
        p_target_row_ids: targetRowIds as any,
      });

    if (error) throw error;
  }

  // Получение графа связей между базами данных
  static async getRelationshipGraph(databaseId?: string): Promise<{
    nodes: Array<{ id: string; name: string; icon?: string; color?: string }>;
    edges: Array<{ source: string; target: string; type: string }>;
  }> {
    const { data, error } = await supabase
      .rpc('get_relationship_graph', { 
        p_database_id: databaseId || null 
      });

    if (error) throw error;
    return data || { nodes: [], edges: [] };
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
    const { data, error } = await supabase
      .rpc('get_available_rollup_columns', { 
        p_relation_column_id: relationColumnId 
      });

    if (error) throw error;
    return data || [];
  }
}
