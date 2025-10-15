/**
 * Утилита для построения SQL запросов для фильтрации, сортировки и пагинации
 */

import type { TableFilters, TableSorting, TablePagination } from '../types/database';
import type { TableRow } from '../types/common';

/**
 * Типы операторов для фильтрации
 */
export type FilterOperator =
  | 'eq'      // равно
  | 'neq'     // не равно
  | 'gt'      // больше
  | 'gte'     // больше или равно
  | 'lt'      // меньше
  | 'lte'     // меньше или равно
  | 'like'    // содержит (для строк)
  | 'ilike'   // содержит (без учета регистра)
  | 'in'      // в списке
  | 'is'      // is null / is not null
  | 'contains'// содержит (для массивов)
  | 'between' // между двумя значениями
  | 'startsWith' // начинается с
  | 'endsWith';  // заканчивается на

/**
 * Расширенный фильтр с оператором
 */
export interface ExtendedFilter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Конфигурация запроса
 */
export interface QueryConfig {
  tableName: string;
  filters?: TableFilters | ExtendedFilter[];
  sorting?: TableSorting | TableSorting[];
  pagination?: TablePagination;
  select?: string[];
  joins?: JoinConfig[];
}

/**
 * Конфигурация JOIN
 */
export interface JoinConfig {
  type: 'inner' | 'left' | 'right' | 'full';
  table: string;
  on: string;
  alias?: string;
}

/**
 * Построитель SQL запросов
 */
export class SQLBuilder {
  private config: QueryConfig;

  constructor(config: QueryConfig) {
    this.config = config;
  }

  /**
   * Строит WHERE условие для фильтров
   */
  buildWhereClause(): { sql: string; params: unknown[] } {
    if (!this.config.filters) {
      return { sql: '', params: [] };
    }

    const params: unknown[] = [];
    const conditions: string[] = [];

    // Простые фильтры (объект)
    if (!Array.isArray(this.config.filters)) {
      for (const [column, value] of Object.entries(this.config.filters)) {
        if (value === null || value === undefined) continue;

        params.push(value);
        conditions.push(`${this.escapeIdentifier(column)} = $${params.length}`);
      }
    }
    // Расширенные фильтры (массив)
    else {
      for (const filter of this.config.filters) {
        const condition = this.buildFilterCondition(filter, params);
        if (condition) {
          conditions.push(condition);
        }
      }
    }

    if (conditions.length === 0) {
      return { sql: '', params: [] };
    }

    return {
      sql: `WHERE ${conditions.join(' AND ')}`,
      params,
    };
  }

  /**
   * Строит условие для одного фильтра
   */
  private buildFilterCondition(filter: ExtendedFilter, params: unknown[]): string | null {
    const column = this.escapeIdentifier(filter.column);

    switch (filter.operator) {
      case 'eq':
        params.push(filter.value);
        return `${column} = $${params.length}`;

      case 'neq':
        params.push(filter.value);
        return `${column} != $${params.length}`;

      case 'gt':
        params.push(filter.value);
        return `${column} > $${params.length}`;

      case 'gte':
        params.push(filter.value);
        return `${column} >= $${params.length}`;

      case 'lt':
        params.push(filter.value);
        return `${column} < $${params.length}`;

      case 'lte':
        params.push(filter.value);
        return `${column} <= $${params.length}`;

      case 'like':
        params.push(`%${filter.value}%`);
        return `${column} LIKE $${params.length}`;

      case 'ilike':
        params.push(`%${filter.value}%`);
        return `${column} ILIKE $${params.length}`;

      case 'startsWith':
        params.push(`${filter.value}%`);
        return `${column} ILIKE $${params.length}`;

      case 'endsWith':
        params.push(`%${filter.value}`);
        return `${column} ILIKE $${params.length}`;

      case 'in': {
        if (!Array.isArray(filter.value)) return null;
        const placeholders = filter.value.map((val: unknown) => {
          params.push(val);
          return `$${params.length}`;
        });
        return `${column} IN (${placeholders.join(', ')})`;
      }

      case 'is':
        if (filter.value === null) {
          return `${column} IS NULL`;
        } else if (filter.value === false) {
          return `${column} IS NOT NULL`;
        }
        return null;

      case 'between': {
        if (!Array.isArray(filter.value) || filter.value.length !== 2) return null;
        params.push(filter.value[0]);
        const param1 = params.length;
        params.push(filter.value[1]);
        const param2 = params.length;
        return `${column} BETWEEN $${param1} AND $${param2}`;
      }

      case 'contains':
        params.push(filter.value);
        return `${column} @> $${params.length}`;

      default:
        return null;
    }
  }

  /**
   * Строит ORDER BY для сортировки
   */
  buildOrderByClause(): string {
    if (!this.config.sorting) {
      return '';
    }

    const sortings = Array.isArray(this.config.sorting)
      ? this.config.sorting
      : [this.config.sorting];

    const orders = sortings.map(sort => {
      const column = this.escapeIdentifier(sort.column);
      const direction = sort.direction.toUpperCase();
      return `${column} ${direction}`;
    });

    return orders.length > 0 ? `ORDER BY ${orders.join(', ')}` : '';
  }

  /**
   * Строит LIMIT и OFFSET для пагинации
   */
  buildPaginationClause(): string {
    if (!this.config.pagination) {
      return '';
    }

    const { page, pageSize } = this.config.pagination;
    const offset = (page - 1) * pageSize;

    return `LIMIT ${pageSize} OFFSET ${offset}`;
  }

  /**
   * Строит SELECT часть
   */
  buildSelectClause(): string {
    if (!this.config.select || this.config.select.length === 0) {
      return '*';
    }

    return this.config.select.map(col => this.escapeIdentifier(col)).join(', ');
  }

  /**
   * Строит JOIN условия
   */
  buildJoinClauses(): string {
    if (!this.config.joins || this.config.joins.length === 0) {
      return '';
    }

    return this.config.joins
      .map(join => {
        const type = join.type.toUpperCase();
        const table = join.alias
          ? `${this.escapeIdentifier(join.table)} AS ${this.escapeIdentifier(join.alias)}`
          : this.escapeIdentifier(join.table);

        return `${type} JOIN ${table} ON ${join.on}`;
      })
      .join(' ');
  }

  /**
   * Строит полный SELECT запрос
   */
  buildSelectQuery(): { sql: string; params: unknown[] } {
    const select = this.buildSelectClause();
    const from = this.escapeIdentifier(this.config.tableName);
    const joins = this.buildJoinClauses();
    const { sql: where, params } = this.buildWhereClause();
    const orderBy = this.buildOrderByClause();
    const pagination = this.buildPaginationClause();

    const parts = [
      `SELECT ${select}`,
      `FROM ${from}`,
      joins,
      where,
      orderBy,
      pagination,
    ].filter(Boolean);

    return {
      sql: parts.join(' '),
      params,
    };
  }

  /**
   * Строит COUNT запрос для получения общего количества
   */
  buildCountQuery(): { sql: string; params: unknown[] } {
    const from = this.escapeIdentifier(this.config.tableName);
    const joins = this.buildJoinClauses();
    const { sql: where, params } = this.buildWhereClause();

    const parts = [
      'SELECT COUNT(*)',
      `FROM ${from}`,
      joins,
      where,
    ].filter(Boolean);

    return {
      sql: parts.join(' '),
      params,
    };
  }

  /**
   * Экранирует идентификаторы (названия таблиц и колонок)
   */
  private escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}

/**
 * Создает построитель запросов
 */
export function createQueryBuilder(config: QueryConfig): SQLBuilder {
  return new SQLBuilder(config);
}

/**
 * Преобразует простые фильтры в расширенные
 */
export function normalizeFilters(filters: TableFilters): ExtendedFilter[] {
  return Object.entries(filters).map(([column, value]) => ({
    column,
    operator: 'eq' as FilterOperator,
    value,
  }));
}

/**
 * Валидирует конфигурацию запроса
 */
export function validateQueryConfig(config: QueryConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.tableName || config.tableName.trim() === '') {
    errors.push('Не указано имя таблицы');
  }

  // Валидация сортировки
  if (config.sorting) {
    const sortings = Array.isArray(config.sorting) ? config.sorting : [config.sorting];
    for (const sort of sortings) {
      if (!sort.column) {
        errors.push('Не указана колонка для сортировки');
      }
      if (!['asc', 'desc'].includes(sort.direction.toLowerCase())) {
        errors.push(`Недопустимое направление сортировки: ${sort.direction}`);
      }
    }
  }

  // Валидация пагинации
  if (config.pagination) {
    if (config.pagination.page < 1) {
      errors.push('Номер страницы должен быть >= 1');
    }
    if (config.pagination.pageSize < 1) {
      errors.push('Размер страницы должен быть >= 1');
    }
    if (config.pagination.pageSize > 1000) {
      errors.push('Размер страницы не может быть больше 1000');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Создает безопасный SQL для вставки данных
 */
export function buildInsertQuery(
  tableName: string,
  data: TableRow
): { sql: string; params: unknown[] } {
  const columns = Object.keys(data);
  const params = Object.values(data);

  const columnList = columns.map(col => `"${col.replace(/"/g, '""')}"`).join(', ');
  const placeholders = params.map((_, i) => `$${i + 1}`).join(', ');

  return {
    sql: `INSERT INTO "${tableName.replace(/"/g, '""')}" (${columnList}) VALUES (${placeholders}) RETURNING *`,
    params,
  };
}

/**
 * Создает безопасный SQL для обновления данных
 */
export function buildUpdateQuery(
  tableName: string,
  id: string,
  data: TableRow
): { sql: string; params: unknown[] } {
  const updates: string[] = [];
  const params: unknown[] = [];

  for (const [column, value] of Object.entries(data)) {
    params.push(value);
    updates.push(`"${column.replace(/"/g, '""')}" = $${params.length}`);
  }

  params.push(id);

  return {
    sql: `UPDATE "${tableName.replace(/"/g, '""')}" SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params,
  };
}

/**
 * Создает безопасный SQL для удаления данных
 */
export function buildDeleteQuery(
  tableName: string,
  id: string
): { sql: string; params: unknown[] } {
  return {
    sql: `DELETE FROM "${tableName.replace(/"/g, '""')}" WHERE id = $1`,
    params: [id],
  };
}

/**
 * Создает SQL для bulk insert
 */
export function buildBulkInsertQuery(
  tableName: string,
  data: TableRow[]
): { sql: string; params: unknown[] } {
  if (data.length === 0) {
    throw new Error('Нет данных для вставки');
  }

  const columns = Object.keys(data[0]);
  const params: unknown[] = [];
  const valueSets: string[] = [];

  for (const row of data) {
    const placeholders: string[] = [];
    for (const column of columns) {
      params.push(row[column]);
      placeholders.push(`$${params.length}`);
    }
    valueSets.push(`(${placeholders.join(', ')})`);
  }

  const columnList = columns.map(col => `"${col.replace(/"/g, '""')}"`).join(', ');

  return {
    sql: `INSERT INTO "${tableName.replace(/"/g, '""')}" (${columnList}) VALUES ${valueSets.join(', ')} RETURNING *`,
    params,
  };
}
