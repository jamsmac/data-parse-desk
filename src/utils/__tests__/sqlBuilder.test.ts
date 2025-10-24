import { describe, it, expect } from 'vitest';
import {
  SQLBuilder,
  createQueryBuilder,
  normalizeFilters,
  validateQueryConfig,
  buildInsertQuery,
  buildUpdateQuery,
  buildDeleteQuery,
  buildBulkInsertQuery,
  type QueryConfig,
  type ExtendedFilter,
} from '../sqlBuilder';

describe('SQLBuilder', () => {
  describe('buildWhereClause', () => {
    it('should return empty clause when no filters', () => {
      const builder = new SQLBuilder({ tableName: 'users' });
      const result = builder.buildWhereClause();

      expect(result.sql).toBe('');
      expect(result.params).toEqual([]);
    });

    it('should build simple equality filters', () => {
      const builder = new SQLBuilder({
        tableName: 'users',
        filters: { name: 'John', age: 30 },
      });
      const result = builder.buildWhereClause();

      expect(result.sql).toBe('WHERE "name" = $1 AND "age" = $2');
      expect(result.params).toEqual(['John', 30]);
    });

    it('should skip null and undefined values', () => {
      const builder = new SQLBuilder({
        tableName: 'users',
        filters: { name: 'John', age: null, email: undefined },
      });
      const result = builder.buildWhereClause();

      expect(result.sql).toBe('WHERE "name" = $1');
      expect(result.params).toEqual(['John']);
    });

    it('should build extended filters with operators', () => {
      const filters: ExtendedFilter[] = [
        { column: 'name', operator: 'eq', value: 'John' },
        { column: 'age', operator: 'gt', value: 18 },
        { column: 'status', operator: 'in', value: ['active', 'pending'] },
      ];
      const builder = new SQLBuilder({ tableName: 'users', filters });
      const result = builder.buildWhereClause();

      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('AND');
      expect(result.params.length).toBe(4);
    });

    it('should handle LIKE operators', () => {
      const filters: ExtendedFilter[] = [
        { column: 'name', operator: 'like', value: 'John' },
      ];
      const builder = new SQLBuilder({ tableName: 'users', filters });
      const result = builder.buildWhereClause();

      expect(result.sql).toBe('WHERE "name" LIKE $1');
      expect(result.params).toEqual(['%John%']);
    });

    it('should handle BETWEEN operator', () => {
      const filters: ExtendedFilter[] = [
        { column: 'age', operator: 'between', value: [18, 65] },
      ];
      const builder = new SQLBuilder({ tableName: 'users', filters });
      const result = builder.buildWhereClause();

      expect(result.sql).toBe('WHERE "age" BETWEEN $1 AND $2');
      expect(result.params).toEqual([18, 65]);
    });

    it('should handle IS NULL', () => {
      const filters: ExtendedFilter[] = [
        { column: 'deleted_at', operator: 'is', value: null },
      ];
      const builder = new SQLBuilder({ tableName: 'users', filters });
      const result = builder.buildWhereClause();

      expect(result.sql).toBe('WHERE "deleted_at" IS NULL');
    });

    it('should escape column names', () => {
      const builder = new SQLBuilder({
        tableName: 'users',
        filters: { 'user"name': 'test' },
      });
      const result = builder.buildWhereClause();

      expect(result.sql).toContain('"user""name"');
    });
  });

  describe('buildOrderByClause', () => {
    it('should return empty string when no sorting', () => {
      const builder = new SQLBuilder({ tableName: 'users' });
      expect(builder.buildOrderByClause()).toBe('');
    });

    it('should build single column sorting', () => {
      const builder = new SQLBuilder({
        tableName: 'users',
        sorting: { column: 'name', direction: 'asc' },
      });
      expect(builder.buildOrderByClause()).toBe('ORDER BY "name" ASC');
    });

    it('should build multiple column sorting', () => {
      const builder = new SQLBuilder({
        tableName: 'users',
        sorting: [
          { column: 'name', direction: 'asc' },
          { column: 'age', direction: 'desc' },
        ],
      });
      expect(builder.buildOrderByClause()).toBe('ORDER BY "name" ASC, "age" DESC');
    });
  });

  describe('buildPaginationClause', () => {
    it('should return empty when no pagination', () => {
      const builder = new SQLBuilder({ tableName: 'users' });
      expect(builder.buildPaginationClause()).toBe('');
    });

    it('should build pagination for first page', () => {
      const builder = new SQLBuilder({
        tableName: 'users',
        pagination: { page: 1, pageSize: 10 },
      });
      expect(builder.buildPaginationClause()).toBe('LIMIT 10 OFFSET 0');
    });

    it('should calculate offset correctly', () => {
      const builder = new SQLBuilder({
        tableName: 'users',
        pagination: { page: 5, pageSize: 20 },
      });
      expect(builder.buildPaginationClause()).toBe('LIMIT 20 OFFSET 80');
    });
  });

  describe('buildSelectQuery', () => {
    it('should build simple query', () => {
      const builder = new SQLBuilder({ tableName: 'users' });
      const result = builder.buildSelectQuery();

      expect(result.sql).toBe('SELECT * FROM "users"');
      expect(result.params).toEqual([]);
    });

    it('should build query with all parts', () => {
      const builder = new SQLBuilder({
        tableName: 'users',
        select: ['id', 'name'],
        filters: { active: true },
        sorting: { column: 'name', direction: 'asc' },
        pagination: { page: 1, pageSize: 10 },
      });
      const result = builder.buildSelectQuery();

      expect(result.sql).toContain('SELECT');
      expect(result.sql).toContain('FROM');
      expect(result.sql).toContain('WHERE');
      expect(result.sql).toContain('ORDER BY');
      expect(result.sql).toContain('LIMIT');
      expect(result.params).toEqual([true]);
    });
  });

  describe('buildCountQuery', () => {
    it('should build count query', () => {
      const builder = new SQLBuilder({ tableName: 'users' });
      const result = builder.buildCountQuery();

      expect(result.sql).toBe('SELECT COUNT(*) FROM "users"');
    });

    it('should not include pagination in count', () => {
      const builder = new SQLBuilder({
        tableName: 'users',
        pagination: { page: 2, pageSize: 10 },
      });
      const result = builder.buildCountQuery();

      expect(result.sql).not.toContain('LIMIT');
      expect(result.sql).not.toContain('OFFSET');
    });
  });
});

describe('Helper functions', () => {
  describe('createQueryBuilder', () => {
    it('should create SQLBuilder instance', () => {
      const builder = createQueryBuilder({ tableName: 'users' });
      expect(builder).toBeInstanceOf(SQLBuilder);
    });
  });

  describe('normalizeFilters', () => {
    it('should convert simple filters to extended', () => {
      const result = normalizeFilters({ name: 'John', age: 30 });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ column: 'name', operator: 'eq', value: 'John' });
    });
  });

  describe('validateQueryConfig', () => {
    it('should validate correct config', () => {
      const config: QueryConfig = {
        tableName: 'users',
        sorting: { column: 'name', direction: 'asc' },
        pagination: { page: 1, pageSize: 10 },
      };
      const result = validateQueryConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid configs', () => {
      const configs = [
        { tableName: '' },
        { tableName: 'users', pagination: { page: 0, pageSize: 10 } },
        { tableName: 'users', pagination: { page: 1, pageSize: 0 } },
        { tableName: 'users', pagination: { page: 1, pageSize: 2000 } },
      ];

      configs.forEach(config => {
        const result = validateQueryConfig(config);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('buildInsertQuery', () => {
    it('should build insert query', () => {
      const result = buildInsertQuery('users', { name: 'John', age: 30 });

      expect(result.sql).toContain('INSERT INTO');
      expect(result.sql).toContain('VALUES');
      expect(result.sql).toContain('RETURNING *');
      expect(result.params).toEqual(['John', 30]);
    });

    it('should escape identifiers', () => {
      const result = buildInsertQuery('my"table', { 'user"name': 'test' });

      expect(result.sql).toContain('"my""table"');
      expect(result.sql).toContain('"user""name"');
    });
  });

  describe('buildUpdateQuery', () => {
    it('should build update query', () => {
      const result = buildUpdateQuery('users', '123', { name: 'John' });

      expect(result.sql).toContain('UPDATE');
      expect(result.sql).toContain('SET');
      expect(result.sql).toContain('WHERE id =');
      expect(result.params).toContain('John');
      expect(result.params).toContain('123');
    });
  });

  describe('buildDeleteQuery', () => {
    it('should build delete query', () => {
      const result = buildDeleteQuery('users', '123');

      expect(result.sql).toContain('DELETE FROM');
      expect(result.sql).toContain('WHERE id =');
      expect(result.params).toEqual(['123']);
    });
  });

  describe('buildBulkInsertQuery', () => {
    it('should build bulk insert', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ];
      const result = buildBulkInsertQuery('users', data);

      expect(result.sql).toContain('INSERT INTO');
      expect(result.sql).toContain('VALUES');
      expect(result.params).toHaveLength(4);
    });

    it('should throw for empty data', () => {
      expect(() => buildBulkInsertQuery('users', [])).toThrow();
    });
  });
});

describe('Security tests', () => {
  it('should escape quotes in table names', () => {
    const builder = new SQLBuilder({ tableName: 'users"; DROP TABLE users; --' });
    const result = builder.buildSelectQuery();

    expect(result.sql).toContain('"users""; DROP TABLE users; --"');
  });

  it('should use parameterized queries for values', () => {
    const builder = new SQLBuilder({
      tableName: 'users',
      filters: { name: "'; DROP TABLE users; --" },
    });
    const result = builder.buildWhereClause();

    expect(result.sql).toBe('WHERE "name" = $1');
    expect(result.params).toEqual(["'; DROP TABLE users; --"]);
  });
});
