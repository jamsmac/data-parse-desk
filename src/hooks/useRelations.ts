import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RelationAPI } from '../api/relationAPI';
import type { 
  DatabaseRelation, 
  RelationConfig, 
  RollupConfig,
  RelationshipGraphData 
} from '../types/database';

/**
 * Hook для получения всех отношений базы данных
 */
export function useRelations(databaseId: string) {
  return useQuery({
    queryKey: ['relations', databaseId],
    queryFn: () => RelationAPI.getRelations(databaseId),
    staleTime: 60000, // 1 минута
  });
}

/**
 * Hook для получения конкретного отношения
 */
export function useRelation(relationId: string) {
  return useQuery({
    queryKey: ['relation', relationId],
    queryFn: async () => {
      // TODO: Implement get single relation RPC function
      throw new Error('Get single relation not yet implemented');
    },
    enabled: !!relationId,
  });
}

/**
 * Hook для создания отношения между базами данных
 */
export function useCreateRelation(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: RelationConfig) => {
      return await RelationAPI.createRelation(databaseId, config);
    },
    onSuccess: (data, variables) => {
      // Инвалидируем отношения для обеих баз данных
      queryClient.invalidateQueries({ queryKey: ['relations', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['relations', variables.target_database_id] });
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
  });
}

/**
 * Hook для удаления отношения
 */
export function useDeleteRelation(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationId: string) => {
      return await RelationAPI.deleteRelation(relationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relations', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['databases'] });
    },
  });
}

/**
 * Hook для получения связанных данных
 */
export function useRelatedData(
  databaseId: string,
  recordId: string,
  relationId: string
) {
  return useQuery({
    queryKey: ['relatedData', databaseId, recordId, relationId],
    queryFn: () => RelationAPI.getRelatedData(databaseId, recordId, relationId),
    enabled: !!databaseId && !!recordId && !!relationId,
    staleTime: 30000, // 30 секунд
  });
}

/**
 * Hook для вычисления rollup значения
 */
export function useRollupValue(
  databaseId: string,
  recordId: string,
  rollupConfig: RollupConfig
) {
  return useQuery({
    queryKey: ['rollup', databaseId, recordId, rollupConfig.relationId, rollupConfig.aggregation],
    queryFn: () => RelationAPI.calculateRollup(databaseId, recordId, rollupConfig),
    enabled: !!databaseId && !!recordId && !!rollupConfig.relationId,
    staleTime: 30000,
  });
}

/**
 * Hook для получения lookup значения
 */
export function useLookupValue(
  databaseId: string,
  recordId: string,
  relationId: string,
  targetColumnId: string
) {
  return useQuery({
    queryKey: ['lookup', databaseId, recordId, relationId, targetColumnId],
    queryFn: () => RelationAPI.getLookupValue(databaseId, recordId, relationId, targetColumnId),
    enabled: !!databaseId && !!recordId && !!relationId && !!targetColumnId,
    staleTime: 30000,
  });
}

/**
 * Hook для связывания записей
 */
export function useLinkRows(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      relationId,
      targetRecordIds,
    }: {
      recordId: string;
      relationId: string;
      targetRecordIds: string[];
    }) => {
      return await RelationAPI.linkRows(databaseId, recordId, relationId, targetRecordIds);
    },
    onSuccess: (_, variables) => {
      // Инвалидируем данные для обеих записей
      queryClient.invalidateQueries({ queryKey: ['relatedData', databaseId, variables.recordId] });
      queryClient.invalidateQueries({ queryKey: ['tableData', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['rollup'] });
    },
  });
}

/**
 * Hook для отвязывания записей
 */
export function useUnlinkRows(databaseId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      relationId,
      targetRecordIds,
    }: {
      recordId: string;
      relationId: string;
      targetRecordIds: string[];
    }) => {
      return await RelationAPI.unlinkRows(databaseId, recordId, relationId, targetRecordIds);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['relatedData', databaseId, variables.recordId] });
      queryClient.invalidateQueries({ queryKey: ['tableData', databaseId] });
      queryClient.invalidateQueries({ queryKey: ['rollup'] });
    },
  });
}

/**
 * Hook для получения графа отношений
 */
export function useRelationshipGraph(databaseId?: string) {
  return useQuery({
    queryKey: ['relationshipGraph', databaseId],
    queryFn: () => RelationAPI.getRelationshipGraph(databaseId),
    staleTime: 60000,
  });
}

/**
 * Hook для валидации конфигурации отношения
 */
export function useValidateRelation() {
  return useMutation({
    mutationFn: async (config: RelationConfig) => {
      return RelationAPI.validateRelationConfig(config);
    },
  });
}

/**
 * Hook для валидации конфигурации rollup
 */
export function useValidateRollup() {
  return useMutation({
    mutationFn: async (config: RollupConfig) => {
      return RelationAPI.validateRollupConfig(config);
    },
  });
}

/**
 * Комбинированный hook для работы с отношениями
 */
export function useRelationManager(databaseId: string) {
  const relations = useRelations(databaseId);
  const createRelation = useCreateRelation(databaseId);
  const deleteRelation = useDeleteRelation(databaseId);
  const linkRows = useLinkRows(databaseId);
  const unlinkRows = useUnlinkRows(databaseId);
  const validateRelation = useValidateRelation();

  return {
    // Данные
    relations: relations.data,
    isLoading: relations.isLoading,
    error: relations.error,
    
    // Действия
    createRelation,
    deleteRelation,
    linkRows,
    unlinkRows,
    validateRelation,
    
    // Обновление
    refetch: relations.refetch,
  };
}
