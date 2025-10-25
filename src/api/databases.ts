/**
 * Database API - Type-safe database operations
 * All functions return Result types for consistent error handling
 */

import { apiClient } from './client';
import type { AsyncResult } from '@/types/api';
import type { Database, TableSchema, TableRow, ColumnValue } from '@/types/database';

/**
 * Row data type
 */
export type RowData = Record<string, ColumnValue>;

/**
 * Database operations
 */
export const databaseApi = {
  /**
   * Get database by ID
   */
  getDatabase(databaseId: string): AsyncResult<Database> {
    return apiClient.rpc<Database>('get_database', {
      p_id: databaseId,
    });
  },

  /**
   * Get all databases for user
   */
  getDatabases(userId: string): AsyncResult<Database[]> {
    return apiClient.query<Database[]>(
      apiClient.getClient()
        .from('databases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    );
  },

  /**
   * Get databases by project ID
   */
  getDatabasesByProject(projectId: string): AsyncResult<Database[]> {
    return apiClient.query<Database[]>(
      apiClient.getClient()
        .from('databases')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
    );
  },

  /**
   * Create new database
   */
  createDatabase(data: {
    user_id: string;
    project_id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
  }): AsyncResult<Database> {
    return apiClient.mutate<Database>(
      apiClient.getClient()
        .from('databases')
        .insert(data)
        .select()
        .single()
    );
  },

  /**
   * Update database
   */
  updateDatabase(
    databaseId: string,
    updates: Partial<Pick<Database, 'name' | 'description' | 'icon' | 'color' | 'tags'>>
  ): AsyncResult<Database> {
    return apiClient.mutate<Database>(
      apiClient.getClient()
        .from('databases')
        .update(updates)
        .eq('id', databaseId)
        .select()
        .single()
    );
  },

  /**
   * Delete database
   */
  deleteDatabase(databaseId: string): AsyncResult<void> {
    return apiClient.rpc<void>('delete_database', {
      p_id: databaseId,
    });
  },

  /**
   * Clear all data from database (keep structure)
   */
  clearDatabase(databaseId: string): AsyncResult<void> {
    return apiClient.rpc<void>('clear_database_data', {
      p_database_id: databaseId,
    });
  },

  /**
   * Duplicate database
   */
  duplicateDatabase(
    databaseId: string,
    newName: string
  ): AsyncResult<Database> {
    return apiClient.rpc<Database>('duplicate_database', {
      p_database_id: databaseId,
      p_new_name: newName,
    });
  },
};

/**
 * Schema operations
 */
export const schemaApi = {
  /**
   * Get table schemas for database
   */
  getSchemas(databaseId: string): AsyncResult<TableSchema[]> {
    return apiClient.rpc<TableSchema[]>('get_table_schemas', {
      p_database_id: databaseId,
    });
  },

  /**
   * Create new column
   */
  createColumn(data: Omit<TableSchema, 'id' | 'created_at' | 'updated_at'>): AsyncResult<TableSchema> {
    return apiClient.mutate<TableSchema>(
      apiClient.getClient()
        .from('table_schemas')
        .insert(data)
        .select()
        .single()
    );
  },

  /**
   * Update column
   */
  updateColumn(
    columnId: string,
    updates: Partial<Omit<TableSchema, 'id' | 'database_id' | 'created_at' | 'updated_at'>>
  ): AsyncResult<TableSchema> {
    return apiClient.mutate<TableSchema>(
      apiClient.getClient()
        .from('table_schemas')
        .update(updates)
        .eq('id', columnId)
        .select()
        .single()
    );
  },

  /**
   * Delete column
   */
  deleteColumn(columnId: string): AsyncResult<void> {
    return apiClient.mutate<void>(
      apiClient.getClient()
        .from('table_schemas')
        .delete()
        .eq('id', columnId)
    );
  },

  /**
   * Reorder columns
   */
  reorderColumns(
    databaseId: string,
    columnOrder: Array<{ id: string; position: number }>
  ): AsyncResult<void> {
    return apiClient.rpc<void>('reorder_columns', {
      p_database_id: databaseId,
      p_column_order: columnOrder,
    });
  },
};

/**
 * Row data operations
 */
export const rowApi = {
  /**
   * Get rows with pagination, filtering, and sorting
   */
  getRows(params: {
    databaseId: string;
    page?: number;
    pageSize?: number;
    filters?: Array<{ field: string; operator: string; value: unknown }>;
    sort?: { field: string; direction: 'asc' | 'desc' };
    search?: string;
    searchColumns?: string[];
  }): AsyncResult<{ rows: TableRow[]; total: number }> {
    return apiClient.rpc<{ rows: TableRow[]; total: number }>('get_table_data', {
      p_database_id: params.databaseId,
      p_page: params.page || 1,
      p_page_size: params.pageSize || 50,
      p_filters: params.filters || [],
      p_sort: params.sort || null,
      p_search: params.search || null,
      p_search_columns: params.searchColumns || [],
    });
  },

  /**
   * Get single row by ID
   */
  getRow(rowId: string): AsyncResult<TableRow> {
    return apiClient.query<TableRow>(
      apiClient.getClient()
        .from('table_data')
        .select('*')
        .eq('id', rowId)
        .single()
    );
  },

  /**
   * Insert new row
   */
  insertRow(databaseId: string, data: RowData): AsyncResult<TableRow> {
    return apiClient.rpc<TableRow>('insert_table_row', {
      p_database_id: databaseId,
      p_data: data,
    });
  },

  /**
   * Update row
   */
  updateRow(rowId: string, updates: RowData): AsyncResult<TableRow> {
    return apiClient.rpc<TableRow>('update_table_row', {
      p_id: rowId,
      p_data: updates,
    });
  },

  /**
   * Delete row
   */
  deleteRow(rowId: string): AsyncResult<void> {
    return apiClient.rpc<void>('delete_table_row', {
      p_id: rowId,
    });
  },

  /**
   * Bulk insert rows
   */
  bulkInsert(databaseId: string, rows: RowData[]): AsyncResult<TableRow[]> {
    return apiClient.rpc<TableRow[]>('bulk_insert_rows', {
      p_database_id: databaseId,
      p_rows: rows,
    });
  },

  /**
   * Bulk update rows
   */
  bulkUpdate(
    rowIds: string[],
    updates: RowData
  ): AsyncResult<void> {
    return apiClient.rpc<void>('bulk_update_rows', {
      p_row_ids: rowIds,
      p_updates: updates,
    });
  },

  /**
   * Bulk delete rows
   */
  bulkDelete(rowIds: string[]): AsyncResult<void> {
    return apiClient.rpc<void>('bulk_delete_rows', {
      p_row_ids: rowIds,
    });
  },

  /**
   * Duplicate row
   */
  duplicateRow(rowId: string): AsyncResult<TableRow> {
    return apiClient.rpc<TableRow>('duplicate_row', {
      p_row_id: rowId,
    });
  },
};

/**
 * Import/Export operations
 */
export const importExportApi = {
  /**
   * Import CSV data
   */
  importCSV(
    databaseId: string,
    file: File,
    options: {
      hasHeaders?: boolean;
      delimiter?: string;
      columnMapping?: Record<string, string>;
    }
  ): AsyncResult<{ rowsImported: number; errors: unknown[] }> {
    // This would need to be implemented with file upload
    // For now, return a placeholder
    return Promise.resolve({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'CSV import not yet implemented in API layer',
      },
    });
  },

  /**
   * Export to CSV
   */
  exportCSV(databaseId: string): AsyncResult<Blob> {
    return apiClient.rpc<string>('export_to_csv', {
      p_database_id: databaseId,
    }).then(result => {
      if (result.success) {
        const blob = new Blob([result.data], { type: 'text/csv' });
        return { success: true, data: blob };
      }
      return result;
    });
  },

  /**
   * Export to JSON
   */
  exportJSON(databaseId: string): AsyncResult<Blob> {
    return apiClient.rpc<unknown>('export_to_json', {
      p_database_id: databaseId,
    }).then(result => {
      if (result.success) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], {
          type: 'application/json',
        });
        return { success: true, data: blob };
      }
      return result;
    });
  },

  /**
   * Export to Excel
   */
  exportExcel(databaseId: string): AsyncResult<Blob> {
    return Promise.resolve({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Excel export not yet implemented in API layer',
      },
    });
  },
};

/**
 * Statistics operations
 */
export const statsApi = {
  /**
   * Get database statistics
   */
  getStats(databaseId: string): AsyncResult<{
    rowCount: number;
    columnCount: number;
    lastUpdated: string;
    storageSize: number;
  }> {
    return apiClient.rpc('get_database_stats', {
      p_database_id: databaseId,
    });
  },

  /**
   * Get column statistics
   */
  getColumnStats(databaseId: string, columnName: string): AsyncResult<{
    uniqueValues: number;
    nullCount: number;
    distribution: Record<string, number>;
  }> {
    return apiClient.rpc('get_column_stats', {
      p_database_id: databaseId,
      p_column_name: columnName,
    });
  },
};

/**
 * Combined database API export
 */
export const dbApi = {
  ...databaseApi,
  schema: schemaApi,
  row: rowApi,
  importExport: importExportApi,
  stats: statsApi,
};
