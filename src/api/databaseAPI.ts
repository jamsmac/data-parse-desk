import { supabase } from '@/lib/supabase';
import { Database, TableSchema, ColumnType } from '@/types/database';
import { AnyObject, SupabaseResponse } from '@/types/common';

// RPC function types
interface DatabaseRPCFunctions {
  create_database: (params: {
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    user_id: string;
  }) => Promise<Database>;
  get_user_databases: (params: { p_user_id: string }) => Promise<Database[]>;
  get_database: (params: { p_id: string }) => Promise<Database>;
  update_database: (params: { p_id: string; p_updates: Partial<Database> }) => Promise<Database>;
  delete_database: (params: { p_id: string }) => Promise<void>;
  create_table_schema: (params: {
    database_id: string;
    column_name: string;
    column_type: ColumnType;
    is_required?: boolean;
    default_value?: unknown;
    relation_config?: AnyObject;
    rollup_config?: AnyObject;
    formula_config?: AnyObject;
  }) => Promise<TableSchema>;
  get_table_schemas: (params: { p_database_id: string }) => Promise<TableSchema[]>;
  update_table_schema: (params: { p_id: string; p_updates: Partial<TableSchema> }) => Promise<TableSchema>;
  delete_table_schema: (params: { p_id: string }) => Promise<void>;
  reorder_columns: (params: { 
    p_database_id: string; 
    p_column_order: { id: string; position: number }[] 
  }) => Promise<void>;
  get_table_data: (params: {
    p_database_id: string;
    p_filters?: Record<string, unknown>;
    p_sorting?: { column: string; direction: 'asc' | 'desc' } | null;
    p_pagination?: { page: number; pageSize: number } | null;
  }) => Promise<{ data: AnyObject[]; total: number }>;
  insert_table_row: (params: {
    p_database_id: string;
    p_row_data: Record<string, unknown>;
  }) => Promise<AnyObject>;
  update_table_row: (params: {
    p_database_id: string;
    p_row_id: string;
    p_updates: Record<string, unknown>;
  }) => Promise<AnyObject>;
  delete_table_row: (params: {
    p_database_id: string;
    p_row_id: string;
  }) => Promise<void>;
  bulk_insert_table_rows: (params: {
    p_database_id: string;
    p_rows: Record<string, unknown>[];
  }) => Promise<AnyObject[]>;
  bulk_delete_table_rows: (params: {
    p_database_id: string;
    p_row_ids: string[];
  }) => Promise<void>;
  get_database_stats: (params: { p_database_id: string }) => Promise<{
    rowCount: number;
    lastUpdated: string;
  }>;
}

// Type-safe RPC caller
const callRPC = async <K extends keyof DatabaseRPCFunctions>(
  functionName: K,
  params: Parameters<DatabaseRPCFunctions[K]>[0]
): Promise<Awaited<ReturnType<DatabaseRPCFunctions[K]>>> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(functionName, params);
  if (error) throw error;
  return data;
};

export class DatabaseAPI {
  // CRUD для databases
  static async getAllDatabases(userId: string) {
    const { data, error } = await supabase
      .from('databases')
      .select('*')
      .eq('created_by', userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  // Create database - supports both app and test signatures
  static async createDatabase(
    request:
      | { display_name: string; description?: string; icon_name?: string; color_hex?: string }
      | { name: string; description?: string; icon?: string; color?: string; user_id: string },
    userId?: string
  ): Promise<Database> {
    const displayName = (request as any).display_name ?? (request as any).name;
    const description = (request as any).description ?? undefined;
    const icon = (request as any).icon_name ?? (request as any).icon ?? 'database';
    const color = (request as any).color_hex ?? (request as any).color ?? '#3B82F6';
    const creator = userId ?? (request as any).user_id;

    if (!creator) throw new Error('user_id is required');

    const system_name = String(displayName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const table_name = `user_${system_name}`;

    const { data: inserted, error } = await supabase
      .from('databases')
      .insert({
        system_name,
        display_name: displayName,
        description: description ?? null,
        icon_name: icon,
        color_hex: color,
        table_name,
        created_by: creator,
      })
      .select();
    if (error) throw new Error(error.message);
    const created = Array.isArray(inserted) ? inserted[0] : inserted;

    await supabase.rpc('create_dynamic_table', { p_table_name: table_name });
    return created as unknown as Database;
  }

  static async getDatabases(userId: string): Promise<Database[]> {
    const result = await callRPC('get_user_databases', { p_user_id: userId });
    return result || [];
  }

  static async getDatabase(id: string): Promise<Database> {
    return callRPC('get_database', { p_id: id });
  }

  static async updateDatabase(
    id: string,
    updates: Partial<Database>
  ): Promise<Database> {
    const { data, error } = await supabase
      .from('databases')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    return (Array.isArray(data) ? data[0] : data) as Database;
  }

  static async deleteDatabase(id: string): Promise<void> {
    const { data: dbRow } = await supabase
      .from('databases')
      .select('table_name')
      .eq('id', id)
      .single();
    if (dbRow?.table_name) {
      await supabase.rpc('drop_dynamic_table', { p_table_name: dbRow.table_name });
    }
    await supabase.from('databases').delete().eq('id', id);
  }

  // CRUD для table_schemas
  static async createTableSchema(schemaData: {
    database_id: string;
    column_name: string;
    column_type: ColumnType;
    is_required?: boolean;
    default_value?: unknown;
    relation_config?: AnyObject;
    rollup_config?: AnyObject;
    formula_config?: AnyObject;
  }): Promise<TableSchema> {
    return callRPC('create_table_schema', schemaData);
  }

  static async getTableSchemas(databaseId: string): Promise<TableSchema[]> {
    const { data, error } = await supabase
      .from('table_schemas')
      .select('*')
      .eq('database_id', databaseId);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  static async getTableSchema(databaseId: string): Promise<TableSchema[]> {
    return this.getTableSchemas(databaseId);
  }

  static async updateTableSchema(
    id: string,
    updates: Partial<TableSchema>
  ): Promise<TableSchema> {
    await supabase.rpc('alter_dynamic_table', { p_table_schema_id: id, p_updates: updates });
    const { data, error } = await supabase
      .from('table_schemas')
      .select('*')
      .eq('id', id);
    if (error) throw new Error(error.message);
    return (data?.[0] ?? null) as unknown as TableSchema;
  }

  static async deleteTableSchema(id: string): Promise<void> {
    await callRPC('delete_table_schema', { p_id: id });
  }

  static async reorderColumns(
    databaseId: string,
    columnOrder: { id: string; position: number }[]
  ): Promise<void> {
    await callRPC('reorder_columns', { 
      p_database_id: databaseId, 
      p_column_order: columnOrder 
    });
  }

  // Работа с динамическими таблицами
  static async getTableData(
    databaseId: string,
    filters?: Record<string, unknown>,
    sorting?: { column: string; direction: 'asc' | 'desc' },
    pagination?: { page: number; pageSize: number } | { page: number; pageSize: number; filters: Array<{ column: string; operator: string; value: unknown }>; sortBy?: string; sortOrder?: 'asc' | 'desc' }
  ): Promise<{ data: AnyObject[]; total: number }> {
    if (pagination && 'filters' in pagination) {
      const opts = pagination as { page: number; pageSize: number; filters: Array<{ column: string; operator: string; value: unknown }>; sortBy?: string; sortOrder?: 'asc' | 'desc' };
      const { data, error } = await supabase.rpc('get_table_data', {
        table_name: databaseId,
        page: opts.page,
        pageSize: opts.pageSize,
        filters: opts.filters,
        sortBy: opts.sortBy,
        sortOrder: opts.sortOrder,
      });
      if (error) throw new Error(error.message);
      return (data as any) || { data: [], total: 0 };
    }

    const result = await callRPC('get_table_data', {
      p_database_id: databaseId,
      p_filters: filters || {},
      p_sorting: sorting || null,
      p_pagination: (pagination as any) || null
    });
    return result || { data: [], total: 0 };
  }

  static async insertTableRow(
    databaseId: string,
    rowData: Record<string, unknown>
  ): Promise<AnyObject> {
    return callRPC('insert_table_row', {
      p_database_id: databaseId,
      p_row_data: rowData
    });
  }

  static async updateTableRow(
    databaseId: string,
    rowId: string,
    updates: Record<string, unknown>
  ): Promise<AnyObject> {
    return callRPC('update_table_row', {
      p_database_id: databaseId,
      p_row_id: rowId,
      p_updates: updates
    });
  }

  static async deleteTableRow(databaseId: string, rowId: string): Promise<void> {
    await callRPC('delete_table_row', {
      p_database_id: databaseId,
      p_row_id: rowId
    });
  }

  static async bulkInsertTableRows(
    databaseId: string,
    rows: Record<string, unknown>[]
  ): Promise<AnyObject[]> {
    const result = await callRPC('bulk_insert_table_rows', {
      p_database_id: databaseId,
      p_rows: rows
    });
    
    return result || [];
  }

  static async bulkDeleteTableRows(
    databaseId: string,
    rowIds: string[]
  ): Promise<void> {
    await callRPC('bulk_delete_table_rows', {
      p_database_id: databaseId,
      p_row_ids: rowIds
    });
  }

  // Статистика
  static async getDatabaseStats(databaseId: string): Promise<{
    rowCount: number;
    lastUpdated: string;
  }> {
    const result = await callRPC('get_database_stats', { p_database_id: databaseId });
    
    return result || { rowCount: 0, lastUpdated: new Date().toISOString() };
  }
}

// Класс DatabaseAPI уже экспортирован выше

// Экспортируем отдельные функции
export const getAllDatabases = DatabaseAPI.getAllDatabases;
export const createDatabase = DatabaseAPI.createDatabase;
export const updateDatabase = DatabaseAPI.updateDatabase;
export const deleteDatabase = DatabaseAPI.deleteDatabase;
export const getTableData = DatabaseAPI.getTableData;
export const getTableSchema = DatabaseAPI.getTableSchema;
export const updateTableSchema = DatabaseAPI.updateTableSchema;
