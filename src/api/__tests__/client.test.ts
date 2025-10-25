/**
 * Unit tests for API Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, unwrap, mapResult, chain } from '../client';
import type { AsyncResult, ApiError } from '@/types/api';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Handlers', () => {
    it('should register and call error handlers', async () => {
      const mockHandler = vi.fn();
      apiClient.addErrorHandler(mockHandler);

      // Mock a failing RPC call
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Test error', code: 'TEST_ERROR' },
      });

      await apiClient.rpc('test_function');

      expect(mockHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SUPABASE_ERROR',
          message: 'Test error',
        })
      );
    });
  });

  describe('RPC Operations', () => {
    it('should successfully execute RPC call', async () => {
      const mockData = { id: '123', name: 'Test' };
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await apiClient.rpc('get_database', { p_id: '123' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockData);
      }
    });

    it('should handle RPC errors', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Not found', code: 'PGRST116' },
      });

      const result = await apiClient.rpc('get_database', { p_id: '999' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('SUPABASE_ERROR');
        expect(result.error.message).toBe('Not found');
      }
    });

    it('should skip error logging when configured', async () => {
      const mockHandler = vi.fn();
      apiClient.addErrorHandler(mockHandler);

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Test error' },
      });

      await apiClient.rpc('test_function', {}, { skipErrorLogging: true });

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('Query Operations', () => {
    it('should successfully execute query', async () => {
      const mockData = [{ id: '1' }, { id: '2' }];
      const mockPromise = Promise.resolve({ data: mockData, error: null });

      const result = await apiClient.query(mockPromise);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockData);
      }
    });

    it('should handle null data as NOT_FOUND error', async () => {
      const mockPromise = Promise.resolve({ data: null, error: null });

      const result = await apiClient.query(mockPromise);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should handle query errors', async () => {
      const mockPromise = Promise.resolve({
        data: null,
        error: { message: 'Query failed' },
      });

      const result = await apiClient.query(mockPromise);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Query failed');
      }
    });
  });

  describe('Request Interceptors', () => {
    it('should apply request interceptors', async () => {
      const mockInterceptor = vi.fn((config) => ({
        ...config,
        intercepted: true,
      }));

      apiClient.addRequestInterceptor(mockInterceptor);

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { test: 'data' },
        error: null,
      });

      await apiClient.rpc('test_function');

      expect(mockInterceptor).toHaveBeenCalled();
    });
  });

  describe('Response Interceptors', () => {
    it('should apply response interceptors', async () => {
      const mockInterceptor = vi.fn((response) => ({
        ...response,
        transformed: true,
      }));

      apiClient.addResponseInterceptor(mockInterceptor);

      const { supabase } = await import('@/integrations/supabase/client');
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: { test: 'data' },
        error: null,
      });

      const result = await apiClient.rpc('test_function');

      expect(mockInterceptor).toHaveBeenCalled();
      if (result.success) {
        expect(result.data).toHaveProperty('transformed', true);
      }
    });
  });
});

describe('Utility Functions', () => {
  describe('unwrap', () => {
    it('should return data on success', async () => {
      const successResult: AsyncResult<string> = Promise.resolve({
        success: true,
        data: 'test data',
      });

      const data = await unwrap(successResult);
      expect(data).toBe('test data');
    });

    it('should throw on failure', async () => {
      const failureResult: AsyncResult<string> = Promise.resolve({
        success: false,
        error: {
          code: 'TEST_ERROR',
          message: 'Test error message',
        },
      });

      await expect(unwrap(failureResult)).rejects.toThrow('Test error message');
    });
  });

  describe('mapResult', () => {
    it('should transform success data', async () => {
      const result: AsyncResult<number> = Promise.resolve({
        success: true,
        data: 10,
      });

      const mapped = await mapResult(result, (n) => n * 2);

      expect(mapped.success).toBe(true);
      if (mapped.success) {
        expect(mapped.data).toBe(20);
      }
    });

    it('should pass through errors unchanged', async () => {
      const error: ApiError = {
        code: 'TEST_ERROR',
        message: 'Test error',
      };

      const result: AsyncResult<number> = Promise.resolve({
        success: false,
        error,
      });

      const mapped = await mapResult(result, (n) => n * 2);

      expect(mapped.success).toBe(false);
      if (!mapped.success) {
        expect(mapped.error).toEqual(error);
      }
    });
  });

  describe('chain', () => {
    it('should chain successful operations', async () => {
      const result1: AsyncResult<number> = Promise.resolve({
        success: true,
        data: 10,
      });

      const chained = await chain(result1, (n) =>
        Promise.resolve({
          success: true,
          data: n * 2,
        })
      );

      expect(chained.success).toBe(true);
      if (chained.success) {
        expect(chained.data).toBe(20);
      }
    });

    it('should stop chain on first error', async () => {
      const error: ApiError = {
        code: 'TEST_ERROR',
        message: 'First operation failed',
      };

      const result1: AsyncResult<number> = Promise.resolve({
        success: false,
        error,
      });

      const nextFn = vi.fn();
      const chained = await chain(result1, nextFn);

      expect(nextFn).not.toHaveBeenCalled();
      expect(chained.success).toBe(false);
      if (!chained.success) {
        expect(chained.error).toEqual(error);
      }
    });
  });
});
