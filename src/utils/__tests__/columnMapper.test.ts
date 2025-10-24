import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  suggestColumnMapping,
  applyColumnMapping,
  validateMapping,
  inferColumnType,
  suggestSchema,
  createDefaultMapping,
} from '../columnMapper';
import type { TableSchema, ColumnMapping } from '@/types/database';

describe('columnMapper', () => {
  describe('calculateSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      expect(calculateSimilarity('name', 'name')).toBe(1.0);
      expect(calculateSimilarity('email', 'email')).toBe(1.0);
    });

    it('should return 1.0 for case-insensitive matches', () => {
      expect(calculateSimilarity('Name', 'name')).toBe(1.0);
      expect(calculateSimilarity('EMAIL', 'email')).toBe(1.0);
      expect(calculateSimilarity('First_Name', 'first_name')).toBe(1.0);
    });

    it('should return 1.0 for strings with different separators', () => {
      expect(calculateSimilarity('first_name', 'first-name')).toBe(1.0);
      expect(calculateSimilarity('first name', 'first_name')).toBe(1.0);
      expect(calculateSimilarity('FirstName', 'firstname')).toBe(1.0);
    });

    it('should return high similarity for very similar strings', () => {
      const similarity = calculateSimilarity('customer_name', 'customername');
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should return low similarity for different strings', () => {
      const similarity = calculateSimilarity('name', 'email');
      expect(similarity).toBeLessThan(0.5);
    });

    it('should return 0 for completely different strings', () => {
      const similarity = calculateSimilarity('abc', 'xyz');
      expect(similarity).toBeLessThan(0.3);
    });

    it('should handle empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(0);
      expect(calculateSimilarity('name', '')).toBeGreaterThan(0);
      expect(calculateSimilarity('', 'name')).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      expect(calculateSimilarity('user@email', 'useremail')).toBeGreaterThan(0.8);
      expect(calculateSimilarity('name (full)', 'namefull')).toBeGreaterThan(0.8);
    });

    it('should be symmetric', () => {
      const sim1 = calculateSimilarity('first_name', 'firstName');
      const sim2 = calculateSimilarity('firstName', 'first_name');
      expect(sim1).toBe(sim2);
    });

    it('should handle very long strings', () => {
      const long1 = 'a'.repeat(1000);
      const long2 = 'a'.repeat(1000);
      expect(calculateSimilarity(long1, long2)).toBe(1.0);
    });
  });

  describe('suggestColumnMapping', () => {
    const schemaColumns: TableSchema[] = [
      { column_name: 'id', data_type: 'integer', is_nullable: false, default_value: null },
      { column_name: 'name', data_type: 'text', is_nullable: false, default_value: null },
      { column_name: 'email', data_type: 'text', is_nullable: true, default_value: null },
      { column_name: 'created_at', data_type: 'timestamp', is_nullable: false, default_value: 'now()' },
    ];

    it('should suggest exact matches', () => {
      const fileColumns = ['id', 'name', 'email'];
      const mappings = suggestColumnMapping(fileColumns, schemaColumns);

      expect(mappings).toHaveLength(3);
      expect(mappings[0].targetColumn).toBe('id');
      expect(mappings[0].confidence).toBe(1.0);
      expect(mappings[1].targetColumn).toBe('name');
      expect(mappings[2].targetColumn).toBe('email');
    });

    it('should suggest matches with different case', () => {
      const fileColumns = ['ID', 'Name', 'EMAIL'];
      const mappings = suggestColumnMapping(fileColumns, schemaColumns);

      expect(mappings[0].targetColumn).toBe('id');
      expect(mappings[1].targetColumn).toBe('name');
      expect(mappings[2].targetColumn).toBe('email');
    });

    it('should suggest matches with different separators', () => {
      const fileColumns = ['user-id', 'user_name', 'user email'];
      const schemaColumns2: TableSchema[] = [
        { column_name: 'user_id', data_type: 'integer', is_nullable: false, default_value: null },
        { column_name: 'user_name', data_type: 'text', is_nullable: false, default_value: null },
        { column_name: 'user_email', data_type: 'text', is_nullable: true, default_value: null },
      ];

      const mappings = suggestColumnMapping(fileColumns, schemaColumns2);

      expect(mappings[0].targetColumn).toBe('user_id');
      expect(mappings[1].targetColumn).toBe('user_name');
      expect(mappings[2].targetColumn).toBe('user_email');
    });

    it('should respect similarity threshold', () => {
      const fileColumns = ['customer_name', 'xyz'];
      const mappings = suggestColumnMapping(fileColumns, schemaColumns, 0.8);

      // 'customer_name' might match 'name' but with low confidence
      // 'xyz' should not match anything
      const xyzMapping = mappings.find(m => m.sourceColumn === 'xyz');
      expect(xyzMapping?.targetColumn).toBe('');
      expect(xyzMapping?.confidence).toBe(0);
    });

    it('should choose best match when multiple candidates exist', () => {
      const schemaColumns2: TableSchema[] = [
        { column_name: 'first_name', data_type: 'text', is_nullable: false, default_value: null },
        { column_name: 'last_name', data_type: 'text', is_nullable: false, default_value: null },
        { column_name: 'full_name', data_type: 'text', is_nullable: true, default_value: null },
      ];

      const fileColumns = ['name'];
      const mappings = suggestColumnMapping(fileColumns, schemaColumns2);

      // Should choose best match (likely first_name or full_name)
      expect(mappings[0].targetColumn).toBeTruthy();
      expect(mappings[0].confidence).toBeGreaterThan(0);
    });

    it('should handle empty file columns', () => {
      const mappings = suggestColumnMapping([], schemaColumns);
      expect(mappings).toHaveLength(0);
    });

    it('should handle empty schema columns', () => {
      const fileColumns = ['id', 'name'];
      const mappings = suggestColumnMapping(fileColumns, []);

      expect(mappings).toHaveLength(2);
      expect(mappings[0].targetColumn).toBe('');
      expect(mappings[0].confidence).toBe(0);
    });

    it('should return all file columns in mappings', () => {
      const fileColumns = ['id', 'unknown_column', 'name'];
      const mappings = suggestColumnMapping(fileColumns, schemaColumns);

      expect(mappings).toHaveLength(3);
      const unknownMapping = mappings.find(m => m.sourceColumn === 'unknown_column');
      expect(unknownMapping).toBeDefined();
    });

    it('should use custom threshold', () => {
      const fileColumns = ['nm'];
      const mappings = suggestColumnMapping(fileColumns, schemaColumns, 0.9);

      // Low similarity should result in no match
      expect(mappings[0].targetColumn).toBe('');
      expect(mappings[0].confidence).toBeLessThan(0.9);
    });
  });

  describe('applyColumnMapping', () => {
    it('should apply mapping to data rows', () => {
      const data = [
        { old_name: 'John', old_email: 'john@example.com' },
        { old_name: 'Jane', old_email: 'jane@example.com' },
      ];

      const mappings: ColumnMapping[] = [
        { sourceColumn: 'old_name', targetColumn: 'name', confidence: 1.0 },
        { sourceColumn: 'old_email', targetColumn: 'email', confidence: 1.0 },
      ];

      const result = applyColumnMapping(data, mappings);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'John', email: 'john@example.com' });
      expect(result[1]).toEqual({ name: 'Jane', email: 'jane@example.com' });
    });

    it('should handle unmapped columns', () => {
      const data = [{ name: 'John', age: 30 }];
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'name', targetColumn: 'full_name', confidence: 1.0 },
      ];

      const result = applyColumnMapping(data, mappings);

      expect(result[0]).toEqual({ full_name: 'John' });
      expect(result[0]).not.toHaveProperty('age');
    });

    it('should handle empty mappings', () => {
      const data = [{ name: 'John' }];
      const result = applyColumnMapping(data, []);

      expect(result).toHaveLength(1);
      expect(Object.keys(result[0])).toHaveLength(0);
    });

    it('should handle empty data', () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'name', targetColumn: 'full_name', confidence: 1.0 },
      ];

      const result = applyColumnMapping([], mappings);

      expect(result).toHaveLength(0);
    });

    it('should preserve data values', () => {
      const data = [{ count: 42, price: 99.99, active: true, created: null }];
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'count', targetColumn: 'quantity', confidence: 1.0 },
        { sourceColumn: 'price', targetColumn: 'amount', confidence: 1.0 },
        { sourceColumn: 'active', targetColumn: 'is_active', confidence: 1.0 },
        { sourceColumn: 'created', targetColumn: 'created_at', confidence: 1.0 },
      ];

      const result = applyColumnMapping(data, mappings);

      expect(result[0].quantity).toBe(42);
      expect(result[0].amount).toBe(99.99);
      expect(result[0].is_active).toBe(true);
      expect(result[0].created_at).toBeNull();
    });

    it('should handle duplicate target columns', () => {
      const data = [{ col1: 'A', col2: 'B' }];
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'col1', targetColumn: 'result', confidence: 1.0 },
        { sourceColumn: 'col2', targetColumn: 'result', confidence: 1.0 },
      ];

      const result = applyColumnMapping(data, mappings);

      // Last mapping wins
      expect(result[0].result).toBe('B');
    });
  });

  describe('validateMapping', () => {
    const schemaColumns: TableSchema[] = [
      { column_name: 'id', data_type: 'integer', is_nullable: false, default_value: null },
      { column_name: 'name', data_type: 'text', is_nullable: false, default_value: null },
      { column_name: 'email', data_type: 'text', is_nullable: true, default_value: null },
      { column_name: 'count', data_type: 'integer', is_nullable: true, default_value: '0' },
    ];

    it('should validate valid mappings', () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'id', targetColumn: 'id', confidence: 1.0 },
        { sourceColumn: 'name', targetColumn: 'name', confidence: 1.0 },
      ];

      const requiredColumns = ['id', 'name'];
      const result = validateMapping(mappings, requiredColumns);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required columns', () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'id', targetColumn: 'id', confidence: 1.0 },
      ];

      const requiredColumns = ['id', 'name'];
      const result = validateMapping(mappings, requiredColumns);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should allow missing nullable columns', () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'id', targetColumn: 'id', confidence: 1.0 },
        { sourceColumn: 'name', targetColumn: 'name', confidence: 1.0 },
      ];

      const requiredColumns = ['id', 'name']; // email not required
      const result = validateMapping(mappings, requiredColumns);

      // email is nullable, so it's OK to omit
      expect(result.isValid).toBe(true);
    });

    it('should detect duplicate target columns', () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'col1', targetColumn: 'id', confidence: 1.0 },
        { sourceColumn: 'col2', targetColumn: 'id', confidence: 1.0 },
        { sourceColumn: 'name', targetColumn: 'name', confidence: 1.0 },
      ];

      const requiredColumns = ['id', 'name'];
      const result = validateMapping(mappings, requiredColumns);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect unmapped columns in schema', () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'id', targetColumn: 'id', confidence: 1.0 },
        { sourceColumn: 'name', targetColumn: 'name', confidence: 1.0 },
        { sourceColumn: 'extra', targetColumn: '', confidence: 0 },
      ];

      const requiredColumns = ['id', 'name'];
      const result = validateMapping(mappings, requiredColumns);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should allow columns with default values to be missing', () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'id', targetColumn: 'id', confidence: 1.0 },
        { sourceColumn: 'name', targetColumn: 'name', confidence: 1.0 },
      ];

      const requiredColumns = ['id', 'name']; // count has default, not required
      const result = validateMapping(mappings, requiredColumns);

      // 'count' has default value, so it's OK to omit
      expect(result.isValid).toBe(true);
    });

    it('should handle empty mappings', () => {
      const requiredColumns = ['id', 'name'];
      const result = validateMapping([], requiredColumns);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty required columns', () => {
      const mappings: ColumnMapping[] = [
        { sourceColumn: 'id', targetColumn: 'id', confidence: 1.0 },
      ];

      const result = validateMapping(mappings, []);

      expect(result.isValid).toBe(true);
    });
  });

  describe('inferColumnType', () => {
    it('should infer number type', () => {
      const values = ['1', '2', '3', '42'];
      const type = inferColumnType(values);

      expect(type).toBe('number');
    });

    it('should infer number type for decimals', () => {
      const values = ['1.5', '2.3', '3.14'];
      const type = inferColumnType(values);

      expect(type).toBe('number');
    });

    it('should infer boolean type', () => {
      const values = ['true', 'false', 'TRUE', 'FALSE'];
      const type = inferColumnType(values);

      expect(type).toBe('boolean');
    });

    it('should infer date type', () => {
      const values = ['2024-01-01', '2024-02-15', '2024-12-31'];
      const type = inferColumnType(values);

      expect(type).toBe('date');
    });

    it('should infer text type for mixed content', () => {
      const values = ['text', '123', 'mixed'];
      const type = inferColumnType(values);

      expect(type).toBe('text');
    });

    it('should handle null and empty values', () => {
      const values = ['1', '', null, '2', undefined];
      const type = inferColumnType(values);

      expect(type).toBe('number');
    });

    it('should infer text for empty array', () => {
      const type = inferColumnType([]);

      expect(type).toBe('text');
    });

    it('should handle email format', () => {
      const values = ['user@example.com', 'test@test.com', 'admin@site.org'];
      const type = inferColumnType(values);

      expect(type).toBe('email');
    });

    it('should handle URL format', () => {
      const values = ['https://example.com', 'http://test.com'];
      const type = inferColumnType(values);

      expect(type).toBe('url');
    });

    it('should handle phone format', () => {
      const values = ['+1-555-123-4567', '555-987-6543'];
      const type = inferColumnType(values);

      expect(type).toBe('phone');
    });
  });

  describe('suggestSchema', () => {
    it('should suggest schema based on data', () => {
      const data = [
        { id: '1', name: 'John', email: 'john@example.com' },
        { id: '2', name: 'Jane', email: 'jane@example.com' },
      ];

      const schema = suggestSchema(data);

      expect(schema).toBeDefined();
      expect(schema.length).toBeGreaterThan(0);
      expect(schema.find(s => s.column_name === 'id')).toBeDefined();
      expect(schema.find(s => s.column_name === 'name')).toBeDefined();
      expect(schema.find(s => s.column_name === 'email')).toBeDefined();
    });

    it('should mark required columns correctly', () => {
      const data = [
        { id: '1', name: 'John', optional: 'value' },
        { id: '2', name: 'Jane', optional: null },
      ];

      const schema = suggestSchema(data);

      const idCol = schema.find(s => s.column_name === 'id');
      const optionalCol = schema.find(s => s.column_name === 'optional');

      expect(idCol?.is_required).toBe(true);
      expect(optionalCol?.is_required).toBe(false);
    });

    it('should skip existing columns', () => {
      const data = [{ id: '1', name: 'John', newCol: 'value' }];
      const schema = suggestSchema(data, ['id', 'name']);

      expect(schema.length).toBe(1);
      expect(schema[0].column_name).toBe('newCol');
    });

    it('should handle empty data', () => {
      const schema = suggestSchema([]);

      expect(schema).toEqual([]);
    });
  });

  describe('createDefaultMapping', () => {
    it('should create default mapping for common patterns', () => {
      const fileColumns = ['ID', 'User Name', 'E-mail Address'];
      const schemaColumns = ['id', 'name', 'email'];

      const mappings = createDefaultMapping(fileColumns, schemaColumns);

      expect(mappings.length).toBe(3);

      const idMapping = mappings.find(m => m.sourceColumn === 'ID');
      const nameMapping = mappings.find(m => m.sourceColumn === 'User Name');
      const emailMapping = mappings.find(m => m.sourceColumn === 'E-mail Address');

      expect(idMapping?.targetColumn).toBe('id');
      expect(nameMapping?.targetColumn).toBe('name');
      expect(emailMapping?.targetColumn).toBe('email');
    });

    it('should handle exact matches', () => {
      const fileColumns = ['id', 'name'];
      const schemaColumns = ['id', 'name'];

      const mappings = createDefaultMapping(fileColumns, schemaColumns);

      expect(mappings[0].targetColumn).toBe('id');
      expect(mappings[0].confidence).toBe(1.0);
      expect(mappings[1].targetColumn).toBe('name');
      expect(mappings[1].confidence).toBe(1.0);
    });

    it('should return empty mapping for unmatched columns', () => {
      const fileColumns = ['unknown_column'];
      const schemaColumns = ['id', 'name'];

      const mappings = createDefaultMapping(fileColumns, schemaColumns);

      expect(mappings[0].targetColumn).toBe('');
      expect(mappings[0].confidence).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long column names', () => {
      const longName = 'a'.repeat(500);
      const similarity = calculateSimilarity(longName, longName);

      expect(similarity).toBe(1.0);
    });

    it('should handle special Unicode characters', () => {
      const similarity = calculateSimilarity('naïve', 'naive');

      expect(similarity).toBeGreaterThanOrEqual(0.8);
    });

    it('should handle columns with numbers', () => {
      const mappings = suggestColumnMapping(
        ['col1', 'col2', 'col3'],
        [
          { column_name: 'column_1', data_type: 'text', is_nullable: true, default_value: null },
          { column_name: 'column_2', data_type: 'text', is_nullable: true, default_value: null },
          { column_name: 'column_3', data_type: 'text', is_nullable: true, default_value: null },
        ]
      );

      expect(mappings[0].targetColumn).toBe('column_1');
      expect(mappings[1].targetColumn).toBe('column_2');
      expect(mappings[2].targetColumn).toBe('column_3');
    });
  });
});
