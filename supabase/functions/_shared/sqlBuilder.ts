/**
 * SQL Query Builder with Security Features
 *
 * Provides safe SQL query construction to prevent SQL injection attacks.
 * All user inputs are validated and properly escaped.
 */

export interface FilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';
  value: string | number | boolean | null | Array<string | number>;
}

export interface SortConfig {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface QueryBuilderOptions {
  baseQuery: string;
  filters?: FilterCondition[];
  sort?: SortConfig;
  limit?: number;
  offset?: number;
}

/**
 * Allowed SQL operators mapping
 */
const OPERATOR_MAP: Record<string, string> = {
  'eq': '=',
  'neq': '!=',
  'gt': '>',
  'gte': '>=',
  'lt': '<',
  'lte': '<=',
  'like': 'LIKE',
  'ilike': 'ILIKE',
  'in': 'IN',
  'is': 'IS',
};

/**
 * Validate column name to prevent SQL injection
 * Only allows alphanumeric characters, underscores, and dots (for table.column)
 */
export function validateColumnName(columnName: string): boolean {
  const columnRegex = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
  return columnRegex.test(columnName) && columnName.length <= 100;
}

/**
 * Validate sort direction
 */
export function validateSortDirection(direction: string): 'ASC' | 'DESC' {
  const normalized = direction.toUpperCase();
  if (normalized !== 'ASC' && normalized !== 'DESC') {
    throw new Error(`Invalid sort direction: ${direction}`);
  }
  return normalized as 'ASC' | 'DESC';
}

/**
 * Validate operator
 */
export function validateOperator(operator: string): string {
  if (!OPERATOR_MAP[operator]) {
    throw new Error(`Invalid operator: ${operator}`);
  }
  return OPERATOR_MAP[operator];
}

/**
 * Escape string value for SQL (basic escaping)
 * Note: This is a fallback. Use parameterized queries when possible.
 */
export function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Build a safe WHERE clause from filter conditions
 */
export function buildWhereClause(filters: FilterCondition[]): { clause: string; params: any[] } {
  if (!filters || filters.length === 0) {
    return { clause: '', params: [] };
  }

  const conditions: string[] = [];
  const params: any[] = [];

  for (const filter of filters) {
    // Validate column name
    if (!validateColumnName(filter.column)) {
      throw new Error(`Invalid column name: ${filter.column}`);
    }

    // Validate operator
    const sqlOperator = validateOperator(filter.operator);

    // Handle different value types
    if (filter.value === null || filter.value === undefined) {
      if (filter.operator === 'is') {
        conditions.push(`${filter.column} IS NULL`);
      } else {
        throw new Error(`NULL values only allowed with 'is' operator`);
      }
    } else if (Array.isArray(filter.value)) {
      // Handle IN operator
      if (filter.operator !== 'in') {
        throw new Error(`Array values only allowed with 'in' operator`);
      }
      const placeholders = filter.value.map((_, i) => `$${params.length + i + 1}`).join(', ');
      conditions.push(`${filter.column} IN (${placeholders})`);
      params.push(...filter.value);
    } else {
      // Regular comparison
      params.push(filter.value);
      conditions.push(`${filter.column} ${sqlOperator} $${params.length}`);
    }
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * Build a safe ORDER BY clause
 */
export function buildOrderByClause(sort?: SortConfig): string {
  if (!sort) {
    return '';
  }

  // Validate column name
  if (!validateColumnName(sort.column)) {
    throw new Error(`Invalid sort column: ${sort.column}`);
  }

  // Validate direction
  const direction = validateSortDirection(sort.direction);

  return `ORDER BY ${sort.column} ${direction}`;
}

/**
 * Build a safe LIMIT/OFFSET clause
 */
export function buildPaginationClause(limit?: number, offset?: number): string {
  const parts: string[] = [];

  if (limit !== undefined && limit !== null) {
    const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit))); // Max 1000 rows
    parts.push(`LIMIT ${safeLimit}`);
  }

  if (offset !== undefined && offset !== null) {
    const safeOffset = Math.max(0, Math.floor(offset));
    parts.push(`OFFSET ${safeOffset}`);
  }

  return parts.join(' ');
}

/**
 * Build a complete safe SQL query
 * Returns the query with placeholders and parameters separately
 *
 * Note: This returns a query with placeholders ($1, $2, etc.)
 * In Supabase, you'll need to use rpc with proper parameterization
 */
export function buildSafeQuery(options: QueryBuilderOptions): {
  query: string;
  params: any[];
} {
  const { baseQuery, filters, sort, limit, offset } = options;

  // Validate base query (should be provided by system, not user)
  if (!baseQuery || baseQuery.trim().length === 0) {
    throw new Error('Base query is required');
  }

  const parts: string[] = [baseQuery];
  let params: any[] = [];

  // Add WHERE clause
  if (filters && filters.length > 0) {
    const { clause, params: whereParams } = buildWhereClause(filters);
    if (clause) {
      parts.push(clause);
      params = whereParams;
    }
  }

  // Add ORDER BY clause
  const orderBy = buildOrderByClause(sort);
  if (orderBy) {
    parts.push(orderBy);
  }

  // Add LIMIT/OFFSET clause
  const pagination = buildPaginationClause(limit, offset);
  if (pagination) {
    parts.push(pagination);
  }

  return {
    query: parts.join('\n'),
    params,
  };
}

/**
 * Extract column names from a base SQL query
 * This is a simple parser - enhance as needed
 */
export function extractColumnsFromQuery(baseQuery: string): string[] {
  // Simple extraction of columns from SELECT clause
  const selectMatch = baseQuery.match(/SELECT\s+(.*?)\s+FROM/i);
  if (!selectMatch) {
    return [];
  }

  const columnsStr = selectMatch[1];
  if (columnsStr.trim() === '*') {
    return []; // Can't determine columns from *
  }

  // Split by comma and clean up
  return columnsStr
    .split(',')
    .map(col => col.trim().split(/\s+as\s+/i).pop()?.trim() || '')
    .filter(col => col.length > 0);
}

/**
 * Validate that filter columns exist in the query
 */
export function validateFilterColumns(
  filters: FilterCondition[],
  allowedColumns: string[]
): void {
  if (!allowedColumns || allowedColumns.length === 0) {
    // If we can't determine columns, allow all (for SELECT * queries)
    return;
  }

  for (const filter of filters) {
    if (!allowedColumns.includes(filter.column)) {
      throw new Error(`Column '${filter.column}' is not available in this query`);
    }
  }
}

/**
 * Build a COUNT query from a base query
 */
export function buildCountQuery(baseQuery: string): string {
  // Remove SELECT ... FROM and replace with SELECT COUNT(*)
  const fromMatch = baseQuery.match(/FROM\s+/i);
  if (!fromMatch) {
    throw new Error('Invalid base query: missing FROM clause');
  }

  const fromIndex = fromMatch.index! + fromMatch[0].length;
  const fromClause = baseQuery.substring(fromIndex);

  return `SELECT COUNT(*) as total FROM ${fromClause}`;
}
