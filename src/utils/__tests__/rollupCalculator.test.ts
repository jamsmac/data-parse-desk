/**
 * Тесты для калькулятора rollup-колонок
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateRollup,
  calculateRollupsForRecords,
  formatRollupValue
} from '../rollupCalculator';
import type { RollupConfig } from '../../types/database';
import { resolveRelation } from '../relationResolver';

// Mock resolveRelation
vi.mock('../relationResolver', () => ({
  resolveRelation: vi.fn()
}));

describe('RollupCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateRollup', () => {
    it('должен вычислять SUM агрегацию', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'price',
        aggregation: 'sum',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { price: 100 },
        { price: 200 },
        { price: 300 }
      ]);

      const result = await calculateRollup(config, ['id1', 'id2', 'id3']);
      expect(result).toBe(600);
    });

    it('должен вычислять AVG агрегацию', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'score',
        aggregation: 'avg',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { score: 10 },
        { score: 20 },
        { score: 30 }
      ]);

      const result = await calculateRollup(config, ['id1', 'id2', 'id3']);
      expect(result).toBe(20);
    });

    it('должен вычислять MIN агрегацию', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'value',
        aggregation: 'min',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { value: 5 },
        { value: 2 },
        { value: 8 }
      ]);

      const result = await calculateRollup(config, ['id1', 'id2', 'id3']);
      expect(result).toBe(2);
    });

    it('должен вычислять MAX агрегацию', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'value',
        aggregation: 'max',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { value: 5 },
        { value: 2 },
        { value: 8 }
      ]);

      const result = await calculateRollup(config, ['id1', 'id2', 'id3']);
      expect(result).toBe(8);
    });

    it('должен вычислять COUNT агрегацию', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'name',
        aggregation: 'count',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { name: 'Item 1' },
        { name: 'Item 2' },
        { name: null },
        { name: 'Item 3' }
      ]);

      const result = await calculateRollup(config, ['id1', 'id2', 'id3', 'id4']);
      expect(result).toBe(3); // null не учитывается
    });

    it('должен вычислять MEDIAN агрегацию', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'value',
        aggregation: 'median',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { value: 1 },
        { value: 3 },
        { value: 5 },
        { value: 7 },
        { value: 9 }
      ]);

      const result = await calculateRollup(config, ['id1', 'id2', 'id3', 'id4', 'id5']);
      expect(result).toBe(5);
    });

    it('должен вычислять UNIQUE агрегацию', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'category',
        aggregation: 'unique',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { category: 'A' },
        { category: 'B' },
        { category: 'A' },
        { category: 'C' }
      ]);

      const result = await calculateRollup(config, ['id1', 'id2', 'id3', 'id4']);
      expect(result).toBe(3); // A, B, C
    });

    it('должен вычислять EMPTY агрегацию', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'description',
        aggregation: 'empty',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { description: 'Text' },
        { description: '' },
        { description: null },
        { description: 'More text' }
      ]);

      const result = await calculateRollup(config, ['id1', 'id2', 'id3', 'id4']);
      expect(result).toBe(1); // только пустая строка (null отфильтрован на line 34)
    });

    it('должен вычислять NOT_EMPTY агрегацию', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'description',
        aggregation: 'not_empty',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { description: 'Text' },
        { description: '' },
        { description: null },
        { description: 'More text' }
      ]);

      const result = await calculateRollup(config, ['id1', 'id2', 'id3', 'id4']);
      expect(result).toBe(2); // 'Text' и 'More text'
    });

    it('должен возвращать null для пустого массива ID', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'value',
        aggregation: 'sum',
        relation_column_id: 'rel_col'
      };

      const result = await calculateRollup(config, []);
      expect(result).toBe(null);
    });

    it('должен возвращать null если нет связанных записей', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'value',
        aggregation: 'sum',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([]);

      const result = await calculateRollup(config, ['id1']);
      expect(result).toBe(null);
    });

    it('должен обрабатывать ошибки и возвращать null', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'value',
        aggregation: 'sum',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockRejectedValue(new Error('Database error'));

      const result = await calculateRollup(config, ['id1']);
      expect(result).toBe(null);
    });

    it('должен принимать одиночное значение relationValue', async () => {
      const config: RollupConfig = {
        target_database_id: 'db_123',
        target_column: 'value',
        aggregation: 'sum',
        relation_column_id: 'rel_col'
      };

      vi.mocked(resolveRelation).mockResolvedValue([
        { value: 100 }
      ]);

      const result = await calculateRollup(config, 'single_id');
      expect(result).toBe(100);
    });
  });

  describe('calculateRollupsForRecords', () => {
    it('должен вычислять rollup для нескольких записей', async () => {
      const records = [
        { id: 1, name: 'Record 1', rel_ids: ['a', 'b'] },
        { id: 2, name: 'Record 2', rel_ids: ['c', 'd'] }
      ];

      const rollupConfigs = [
        {
          columnName: 'total_price',
          target_database_id: 'db_123',
          target_column: 'price',
          aggregation: 'sum' as const,
          relation_column_id: 'rel_ids'
        }
      ];

      vi.mocked(resolveRelation)
        .mockResolvedValueOnce([{ price: 10 }, { price: 20 }])
        .mockResolvedValueOnce([{ price: 30 }, { price: 40 }]);

      const result = await calculateRollupsForRecords(records, rollupConfigs);

      expect(result).toHaveLength(2);
      expect(result[0].total_price).toBe(30);
      expect(result[1].total_price).toBe(70);
    });

    it('должен обрабатывать несколько rollup конфигураций', async () => {
      const records = [
        { id: 1, name: 'Record 1', rel_ids: ['a', 'b'] }
      ];

      const rollupConfigs = [
        {
          columnName: 'total',
          target_database_id: 'db_123',
          target_column: 'amount',
          aggregation: 'sum' as const,
          relation_column_id: 'rel_ids'
        },
        {
          columnName: 'count',
          target_database_id: 'db_123',
          target_column: 'amount',
          aggregation: 'count' as const,
          relation_column_id: 'rel_ids'
        }
      ];

      vi.mocked(resolveRelation)
        .mockResolvedValue([{ amount: 10 }, { amount: 20 }]);

      const result = await calculateRollupsForRecords(records, rollupConfigs);

      expect(result[0].total).toBe(30);
      expect(result[0].count).toBe(2);
    });

    it('должен пропускать записи без relation значений', async () => {
      const records = [
        { id: 1, name: 'Record 1' } // нет rel_ids
      ];

      const rollupConfigs = [
        {
          columnName: 'total',
          target_database_id: 'db_123',
          target_column: 'amount',
          aggregation: 'sum' as const,
          relation_column_id: 'rel_ids'
        }
      ];

      const result = await calculateRollupsForRecords(records, rollupConfigs);

      expect(result[0].total).toBeUndefined();
    });
  });

  describe('formatRollupValue', () => {
    it('должен форматировать числовые агрегации с двумя знаками после запятой', () => {
      expect(formatRollupValue(123.456, 'sum')).toBe('123.46');
      expect(formatRollupValue(10.1, 'avg')).toBe('10.10');
      expect(formatRollupValue(5, 'min')).toBe('5.00');
      expect(formatRollupValue(99.999, 'max')).toBe('100.00');
      expect(formatRollupValue(7.5, 'median')).toBe('7.50');
    });

    it('должен форматировать счетные агрегации без десятичных знаков', () => {
      expect(formatRollupValue(10, 'count')).toBe('10');
      expect(formatRollupValue(5, 'unique')).toBe('5');
      expect(formatRollupValue(3, 'empty')).toBe('3');
      expect(formatRollupValue(7, 'not_empty')).toBe('7');
    });

    it('должен возвращать дефис для null значений', () => {
      expect(formatRollupValue(null, 'sum')).toBe('-');
      expect(formatRollupValue(undefined as never, 'count')).toBe('-');
    });

    it('должен обрабатывать строковые значения', () => {
      expect(formatRollupValue('text', 'sum')).toBe('text');
    });
  });
});