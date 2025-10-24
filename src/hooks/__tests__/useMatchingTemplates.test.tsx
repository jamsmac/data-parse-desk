import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
  useMatchingTemplates,
  useMatchingTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useIncrementTemplateUsage,
  useApplyTemplate,
  type MatchingTemplate,
} from '../useMatchingTemplates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useMatchingTemplates', () => {
  const mockTemplate: MatchingTemplate = {
    id: 'template-1',
    name: 'Test Template',
    description: 'A test template',
    rules: [
      {
        sourceColumn: 'name',
        targetColumn: 'full_name',
        strategy: 'fuzzy',
        weight: 0.8,
        threshold: 0.7,
      },
    ],
    weights: {
      exact: 1.0,
      fuzzy: 0.8,
      soundex: 0.6,
      time: 0.7,
      pattern: 0.5,
    },
    created_by: 'user-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_public: false,
    usage_count: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useMatchingTemplates', () => {
    it('should fetch all templates successfully', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockTemplate],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useMatchingTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([mockTemplate]);
      expect(supabase.from).toHaveBeenCalledWith('matching_templates');
      expect(mockOrder).toHaveBeenCalledWith('updated_at', { ascending: false });
    });

    it('should handle fetch errors', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useMatchingTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });

    it('should return empty array when no templates exist', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        order: mockOrder,
      });

      const { result } = renderHook(() => useMatchingTemplates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toEqual([]);
      });
    });
  });

  describe('useMatchingTemplate', () => {
    it('should fetch single template by ID', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockTemplate,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useMatchingTemplate('template-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockTemplate);
      expect(mockEq).toHaveBeenCalledWith('id', 'template-1');
    });

    it('should return null when ID is null', async () => {
      const { result } = renderHook(() => useMatchingTemplate(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.data).toBeUndefined();
      });
    });

    it('should not fetch when ID is null', async () => {
      const mockFrom = vi.fn();
      (supabase.from as any) = mockFrom;

      renderHook(() => useMatchingTemplate(null), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(mockFrom).not.toHaveBeenCalled();
      });
    });

    it('should handle fetch error for single template', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Not found'),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useMatchingTemplate('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useCreateTemplate', () => {
    it('should create template successfully', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockTemplate,
        error: null,
      });

      (supabase.auth.getUser as any) = mockGetUser;
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useCreateTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate({
          name: 'New Template',
          description: 'Test description',
          rules: mockTemplate.rules,
          weights: mockTemplate.weights,
          is_public: false,
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Template saved successfully');
    });

    it('should handle user authentication error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      (supabase.auth.getUser as any) = mockGetUser;

      const { result } = renderHook(() => useCreateTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate({
          name: 'New Template',
          rules: [],
          weights: mockTemplate.weights,
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to save template');

      consoleErrorSpy.mockRestore();
    });

    it('should handle database insert error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Insert failed'),
      });

      (supabase.auth.getUser as any) = mockGetUser;
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useCreateTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate({
          name: 'New Template',
          rules: [],
          weights: mockTemplate.weights,
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to save template');

      consoleErrorSpy.mockRestore();
    });

    it('should default is_public to false', async () => {
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockTemplate, is_public: false },
        error: null,
      });

      (supabase.auth.getUser as any) = mockGetUser;
      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      mockInsert.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useCreateTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate({
          name: 'New Template',
          rules: [],
          weights: mockTemplate.weights,
        });
      });

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({ is_public: false })
        );
      });
    });
  });

  describe('useUpdateTemplate', () => {
    it('should update template successfully', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { ...mockTemplate, name: 'Updated Template' },
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate({
          id: 'template-1',
          name: 'Updated Template',
        });
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Template updated successfully');
      expect(mockEq).toHaveBeenCalledWith('id', 'template-1');
    });

    it('should handle update error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Update failed'),
      });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });

      mockUpdate.mockReturnValue({
        eq: mockEq,
      });

      mockEq.mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const { result } = renderHook(() => useUpdateTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate({
          id: 'template-1',
          name: 'Updated',
        });
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to update template');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useDeleteTemplate', () => {
    it('should delete template successfully', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      const { result } = renderHook(() => useDeleteTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate('template-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Template deleted successfully');
      expect(mockEq).toHaveBeenCalledWith('id', 'template-1');
    });

    it('should handle delete error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({
        error: new Error('Delete failed'),
      });

      (supabase.from as any).mockReturnValue({
        delete: mockDelete,
      });

      mockDelete.mockReturnValue({
        eq: mockEq,
      });

      const { result } = renderHook(() => useDeleteTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate('template-1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalledWith('Failed to delete template');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useIncrementTemplateUsage', () => {
    it('should increment usage count successfully', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      (supabase.rpc as any) = mockRpc;

      const { result } = renderHook(() => useIncrementTemplateUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate('template-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockRpc).toHaveBeenCalledWith('increment_template_usage', {
        template_id: 'template-1',
      });
    });

    it('should handle increment error silently', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockRpc = vi.fn().mockResolvedValue({
        error: new Error('RPC failed'),
      });
      (supabase.rpc as any) = mockRpc;

      const { result } = renderHook(() => useIncrementTemplateUsage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.mutate('template-1');
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Should not show toast for increment errors
      expect(toast.error).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('useApplyTemplate', () => {
    it('should apply template and increment usage', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      (supabase.rpc as any) = mockRpc;

      const onApply = vi.fn();

      const { result } = renderHook(() => useApplyTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.applyTemplate(mockTemplate, onApply);
      });

      expect(onApply).toHaveBeenCalledWith(mockTemplate.rules, mockTemplate.weights);
      expect(toast.success).toHaveBeenCalledWith(`Applied template: ${mockTemplate.name}`);

      // Should also increment usage
      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('increment_template_usage', {
          template_id: mockTemplate.id,
        });
      });
    });

    it('should call onApply with rules and weights', async () => {
      const mockRpc = vi.fn().mockResolvedValue({ error: null });
      (supabase.rpc as any) = mockRpc;

      const onApply = vi.fn();
      const customRules = [
        {
          sourceColumn: 'email',
          targetColumn: 'email_address',
          strategy: 'exact' as const,
          weight: 1.0,
        },
      ];
      const customWeights = {
        exact: 1.0,
        fuzzy: 0.7,
        soundex: 0.5,
        time: 0.6,
        pattern: 0.4,
      };

      const customTemplate = {
        ...mockTemplate,
        rules: customRules,
        weights: customWeights,
      };

      const { result } = renderHook(() => useApplyTemplate(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        result.current.applyTemplate(customTemplate, onApply);
      });

      expect(onApply).toHaveBeenCalledWith(customRules, customWeights);
    });
  });

  describe('Integration tests', () => {
    it('should handle complete CRUD workflow', async () => {
      // Mock for create
      const mockGetUser = vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
      (supabase.auth.getUser as any) = mockGetUser;

      const mockInsert = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnThis();
      const mockDelete = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockTemplate,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      });

      mockInsert.mockReturnValue({ select: mockSelect });
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockDelete.mockReturnValue({ eq: mockEq });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockEq.mockReturnValue({ select: mockSelect });

      const createHook = renderHook(() => useCreateTemplate(), {
        wrapper: createWrapper(),
      });

      // Create
      await waitFor(() => {
        createHook.result.current.mutate({
          name: 'Test',
          rules: [],
          weights: mockTemplate.weights,
        });
      });

      await waitFor(() => {
        expect(createHook.result.current.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith('Template saved successfully');
    });
  });
});
