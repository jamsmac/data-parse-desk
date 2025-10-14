import { supabase } from '@/integrations/supabase/client';
import { Database, TableSchema, ColumnType } from '@/types/database';

export class DatabaseAPI {
  // CRUD для databases
  static async createDatabase(data: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    user_id: string;
  }): Promise<Database> {
    const { data: database, error } = await supabase
      .rpc('create_database', data as any);

    if (error) throw error;
    return database;
  }

  static async getDatabases(userId: string): Promise<Database[]> {
    const { data, error } = await supabase
      .rpc('get_user_databases', { p_user_id: userId });

    if (error) throw error;
    return data || [];
  }

  static async getDatabase(id: string): Promise<Database> {
    const { data, error } = await supabase
      .rpc('get_database', { p_id: id });

    if (error) throw error;
    return data;
  }

  static async updateDatabase(
    id: string,
    updates: Partial<Database>
  ): Promise<Database> {
    const { data, error } = await supabase
      .rpc('update_database', { p_id: id, p_updates: updates as any });

    if (error) throw error;
    return data;
  }

  static async deleteDatabase(id: string): Promise<void> {
    const { error } = await supabase
      .rpc('delete_database', { p_id: id });

    if (error) throw error;
  }

  // CRUD для table_schemas
  static async createTableSchema(data: {
    database_id: string;
    column_name: string;
    column_type: ColumnType;
    is_required?: boolean;
    default_value?: any;
    relation_config?: any;
    rollup_config?: any;
    formula_config?: any;
  }): Promise<TableSchema> {
    const { data: schema, error } = await supabase
      .rpc('create_table_schema', data as any);

    if (error) throw error;
    return schema;
  }

  static async getTableSchemas(databaseId: string): Promise<TableSchema[]> {
    const { data, error } = await supabase
      .rpc('get_table_schemas', { p_database_id: databaseId });

    if (error) throw error;
    return data || [];
  }

  static async updateTableSchema(
    id: string,
    updates: Partial<TableSchema>
  ): Promise<TableSchema> {
    const { data, error } = await supabase
      .rpc('update_table_schema', { p_id: id, p_updates: updates as any });

    if (error) throw error;
    return data;
  }

  static async deleteTableSchema(id: string): Promise<void> {
    const { error } = await supabase
      .rpc('delete_table_schema', { p_id: id });

    if (error) throw error;
  }

  static async reorderColumns(
    databaseId: string,
    columnOrder: { id: string; position: number }[]
  ): Promise<void> {
    const { error } = await supabase
      .rpc('reorder_columns', { 
        p_database_id: databaseId, 
        p_column_order: columnOrder as any 
      });

    if (error) throw error;
  }

  // Работа с динамическими таблицами
  static async getTableData(
    databaseId: string,
    filters?: Record<string, any>,
    sorting?: { column: string; direction: 'asc' | 'desc' },
    pagination?: { page: number; pageSize: number }
  ): Promise<{ data: any[]; total: number }> {
    const { data, error } = await supabase
      .rpc('get_table_data', {
        p_database_id: databaseId,
        p_filters: filters || {},
        p_sorting: sorting || null,
        p_pagination: pagination || null
      });

    if (error) throw error;
    return data || { data: [], total: 0 };
  }

  static async insertTableRow(
    databaseId: string,
    rowData: Record<string, any>
  ): Promise<any> {
    const { data, error } = await supabase
      .rpc('insert_table_row', {
        p_database_id: databaseId,
        p_row_data: rowData as any
      });

    if (error) throw error;
    return data;
  }

  static async updateTableRow(
    databaseId: string,
    rowId: string,
    updates: Record<string, any>
  ): Promise<any> {
    const { data, error } = await supabase
      .rpc('update_table_row', {
        p_database_id: databaseId,
        p_row_id: rowId,
        p_updates: updates as any
      });

    if (error) throw error;
    return data;
  }

  static async deleteTableRow(databaseId: string, rowId: string): Promise<void> {
    const { error } = await supabase
      .rpc('delete_table_row', {
        p_database_id: databaseId,
        p_row_id: rowId
      });

    if (error) throw error;
  }

  static async bulkInsertTableRows(
    databaseId: string,
    rows: Record<string, any>[]
  ): Promise<any[]> {
    const { data, error } = await supabase
      .rpc('bulk_insert_table_rows', {
        p_database_id: databaseId,
        p_rows: rows as any
      });

    if (error) throw error;
    return data || [];
  }

  static async bulkDeleteTableRows(
    databaseId: string,
    rowIds: string[]
  ): Promise<void> {
    const { error } = await supabase
      .rpc('bulk_delete_table_rows', {
        p_database_id: databaseId,
        p_row_ids: rowIds as any
      });

    if (error) throw error;
  }

  // Статистика
  static async getDatabaseStats(databaseId: string): Promise<{
    rowCount: number;
    lastUpdated: string;
  }> {
    const { data, error } = await supabase
      .rpc('get_database_stats', { p_database_id: databaseId });

    if (error) throw error;
    return data || { rowCount: 0, lastUpdated: new Date().toISOString() };
  }
}
