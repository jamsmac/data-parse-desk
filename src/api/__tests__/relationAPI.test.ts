import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelationAPI } from '../relationAPI';
import { DatabaseRelation, RelationConfig, RollupConfig } from '@/types/database';
import { TableRow } from '@/types/common';

// Мокаем Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

describe('RelationAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createRelation', () => {
    it('должен создавать связь между базами данных', async () => {
      const mockRelation: DatabaseRelation = {
        id: 'rel123',
        source_database_id: 'db1',
        target_database_id: 'db2',
        relation_type: 'one_to_many',
        source_column: 'id',
        target_column: 'id',
        created_at: new Date().toISOString(),
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRelation,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const config: RelationConfig = {
        target_database_id: 'db2',
        relation_type: 'one_to_many',
        display_field: 'name',
      };

      const result = await RelationAPI.createRelation('db1', config);

      expect(result).toEqual(mockRelation);
      expect(supabase.rpc).toHaveBeenCalledWith('create_database_relation', {
        source_database_id: 'db1',
        target_database_id: 'db2',
        relation_type: 'one_to_many',
        source_column: 'name',
        target_column: 'name',
      });
    });

    it('должен использовать id по умолчанию если display_field не указан', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {} as DatabaseRelation,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const config: RelationConfig = {
        target_database_id: 'db2',
        relation_type: 'many_to_one',
      };

      await RelationAPI.createRelation('db1', config);

      expect(supabase.rpc).toHaveBeenCalledWith('create_database_relation', {
        source_database_id: 'db1',
        target_database_id: 'db2',
        relation_type: 'many_to_one',
        source_column: 'id',
        target_column: 'id',
      });
    });

    it('должен выбрасывать ошибку при неудачном создании', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Failed to create relation' },
        count: null,
        status: 400,
        statusText: 'Bad Request'
      } as never);

      const config: RelationConfig = {
        target_database_id: 'db2',
        relation_type: 'one_to_many',
      };

      await expect(RelationAPI.createRelation('db1', config))
        .rejects.toThrow();
    });
  });

  describe('getRelations', () => {
    it('должен возвращать список связей базы данных', async () => {
      const mockRelations: DatabaseRelation[] = [
        {
          id: 'rel1',
          source_database_id: 'db1',
          target_database_id: 'db2',
          relation_type: 'one_to_many',
          source_column: 'id',
          target_column: 'parent_id',
          created_at: new Date().toISOString(),
        },
        {
          id: 'rel2',
          source_database_id: 'db1',
          target_database_id: 'db3',
          relation_type: 'many_to_many',
          source_column: 'id',
          target_column: 'id',
          created_at: new Date().toISOString(),
        },
      ];

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockRelations,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getRelations('db1');

      expect(result).toEqual(mockRelations);
      expect(supabase.rpc).toHaveBeenCalledWith('get_database_relations', {
        p_database_id: 'db1',
      });
    });

    it('должен возвращать пустой массив если связей нет', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getRelations('db1');

      expect(result).toEqual([]);
    });
  });

  describe('deleteRelation', () => {
    it('должен удалять связь', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      await RelationAPI.deleteRelation('rel123');

      expect(supabase.rpc).toHaveBeenCalledWith('delete_database_relation', {
        p_relation_id: 'rel123',
      });
    });

    it('должен выбрасывать ошибку при неудачном удалении', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Failed to delete' },
        count: null,
        status: 400,
        statusText: 'Bad Request'
      } as never);

      await expect(RelationAPI.deleteRelation('rel123'))
        .rejects.toThrow();
    });
  });

  describe('getRelatedData', () => {
    it('должен возвращать связанные данные', async () => {
      const mockData: TableRow[] = [
        { id: '1', name: 'Item 1', value: 100 },
        { id: '2', name: 'Item 2', value: 200 },
      ];

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockData,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getRelatedData('db1', 'row1', 'col1');

      expect(result).toEqual(mockData);
      expect(supabase.rpc).toHaveBeenCalledWith('get_related_data', {
        p_source_database_id: 'db1',
        p_source_row_id: 'row1',
        p_relation_column_id: 'col1',
      });
    });

    it('должен возвращать пустой массив если данных нет', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getRelatedData('db1', 'row1', 'col1');

      expect(result).toEqual([]);
    });
  });

  describe('calculateRollup', () => {
    it('должен вычислять rollup агрегацию', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 1500,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const rollupConfig: RollupConfig = {
        relationId: 'rel1',
        relation_column_id: 'rel1',
        target_column: 'amount',
        aggregation: 'sum',
      };

      const result = await RelationAPI.calculateRollup('db1', 'row1', rollupConfig);

      expect(result).toBe(1500);
      expect(supabase.rpc).toHaveBeenCalledWith('calculate_rollup', {
        p_source_database_id: 'db1',
        p_source_row_id: 'row1',
        p_rollup_config: rollupConfig,
      });
    });

    it('должен обрабатывать различные типы агрегации', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 5,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const rollupConfig: RollupConfig = {
        relationId: 'rel1',
        relation_column_id: 'rel1',
        target_column: 'id',
        aggregation: 'count',
      };

      const result = await RelationAPI.calculateRollup('db1', 'row1', rollupConfig);

      expect(result).toBe(5);
    });
  });

  describe('getLookupValue', () => {
    it('должен получать lookup значение', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'Lookup Value',
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getLookupValue('db1', 'row1', 'rel1', 'name');

      expect(result).toBe('Lookup Value');
      expect(supabase.rpc).toHaveBeenCalledWith('get_lookup_value', {
        p_source_database_id: 'db1',
        p_source_row_id: 'row1',
        p_relation_column_id: 'rel1',
        p_target_column: 'name',
      });
    });

    it('должен обрабатывать различные типы значений', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { complex: 'object', with: ['array'] },
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getLookupValue('db1', 'row1', 'rel1', 'data');

      expect(result).toEqual({ complex: 'object', with: ['array'] });
    });
  });

  describe('linkRows', () => {
    it('должен связывать строки', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      await RelationAPI.linkRows('db1', 'row1', 'rel1', ['target1', 'target2']);

      expect(supabase.rpc).toHaveBeenCalledWith('link_rows', {
        p_source_database_id: 'db1',
        p_source_row_id: 'row1',
        p_relation_id: 'rel1',
        p_target_row_ids: ['target1', 'target2'],
      });
    });

    it('должен обрабатывать пустой массив целевых строк', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      await RelationAPI.linkRows('db1', 'row1', 'rel1', []);

      expect(supabase.rpc).toHaveBeenCalledWith('link_rows', {
        p_source_database_id: 'db1',
        p_source_row_id: 'row1',
        p_relation_id: 'rel1',
        p_target_row_ids: [],
      });
    });
  });

  describe('unlinkRows', () => {
    it('должен разрывать связи между строками', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      await RelationAPI.unlinkRows('db1', 'row1', 'rel1', ['target1']);

      expect(supabase.rpc).toHaveBeenCalledWith('unlink_rows', {
        p_source_database_id: 'db1',
        p_source_row_id: 'row1',
        p_relation_id: 'rel1',
        p_target_row_ids: ['target1'],
      });
    });
  });

  describe('getRelationshipGraph', () => {
    it('должен возвращать граф связей', async () => {
      const mockGraph = {
        nodes: [
          { id: 'db1', name: 'Database 1', icon: '📊', color: 'blue' },
          { id: 'db2', name: 'Database 2', icon: '📈', color: 'green' },
        ],
        edges: [
          { source: 'db1', target: 'db2', type: 'one_to_many' },
        ],
      };

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockGraph,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getRelationshipGraph('db1');

      expect(result).toEqual(mockGraph);
      expect(supabase.rpc).toHaveBeenCalledWith('get_relationship_graph', {
        p_database_id: 'db1',
      });
    });

    it('должен возвращать пустой граф при отсутствии данных', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getRelationshipGraph();

      expect(result).toEqual({ nodes: [], edges: [] });
    });
  });

  describe('validateRelationConfig', () => {
    it('должен валидировать корректную конфигурацию', () => {
      const config: RelationConfig = {
        target_database_id: 'db2',
        relation_type: 'one_to_many',
        display_field: 'name',
      };

      const result = RelationAPI.validateRelationConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('должен находить ошибки в конфигурации', () => {
      const config = {
        target_database_id: '',
        relation_type: 'invalid_type',
      } as unknown as RelationConfig;

      const result = RelationAPI.validateRelationConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('Не указана целевая база данных');
      expect(result.errors).toContain('Недопустимый тип связи');
    });

    it('должен требовать тип связи', () => {
      const config = {
        target_database_id: 'db2',
      } as RelationConfig;

      const result = RelationAPI.validateRelationConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Не указан тип связи');
    });
  });

  describe('validateRollupConfig', () => {
    it('должен валидировать корректную конфигурацию rollup', () => {
      const config: RollupConfig = {
        relationId: 'rel1',
        relation_column_id: 'col1',
        target_column: 'amount',
        aggregation: 'sum',
      };

      const result = RelationAPI.validateRollupConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('должен находить ошибки в конфигурации rollup', () => {
      const config = {
        relationId: 'rel1',
        relation_column_id: '',
        target_column: '',
        aggregation: 'invalid',
      } as unknown as RollupConfig;

      const result = RelationAPI.validateRollupConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Не указана колонка со связью');
      expect(result.errors).toContain('Не указана целевая колонка для агрегации');
      expect(result.errors).toContain('Недопустимый тип агрегации');
    });

    it('должен проверять все типы агрегации', () => {
      const validAggregations = [
        'count', 'sum', 'avg', 'min', 'max', 
        'median', 'unique', 'empty', 'not_empty'
      ];

      validAggregations.forEach(aggregation => {
        const config: RollupConfig = {
          relationId: 'rel1',
          relation_column_id: 'col1',
          target_column: 'value',
          aggregation: aggregation as RollupConfig['aggregation'],
        };

        const result = RelationAPI.validateRollupConfig(config);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('getAvailableRollupColumns', () => {
    it('должен возвращать доступные колонки для rollup', async () => {
      const mockColumns = ['name', 'amount', 'status', 'created_at'];

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockColumns,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getAvailableRollupColumns('rel1');

      expect(result).toEqual(mockColumns);
      expect(supabase.rpc).toHaveBeenCalledWith('get_available_rollup_columns', {
        p_relation_column_id: 'rel1',
      });
    });

    it('должен возвращать пустой массив при отсутствии колонок', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK'
      } as never);

      const result = await RelationAPI.getAvailableRollupColumns('rel1');

      expect(result).toEqual([]);
    });

    it('должен выбрасывать ошибку при неудачном запросе', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Failed to get columns' },
        count: null,
        status: 400,
        statusText: 'Bad Request'
      } as never);

      await expect(RelationAPI.getAvailableRollupColumns('rel1'))
        .rejects.toThrow();
    });
  });
});
