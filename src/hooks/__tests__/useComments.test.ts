import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useComments } from '../useComments';
import { supabase } from '@/integrations/supabase/client';
import type { Comment } from '@/types/auth';
import React from 'react';

// Create a wrapper to provide auth context
const mockUser = { id: 'user-123', email: 'test@example.com' };

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: mockUser,
  })),
}));

describe.skip('useComments', () => {
  const mockDatabaseId = 'db-123';
  const mockRowId = 'row-456';

  const mockComment: Comment = {
    id: 'comment-1',
    database_id: mockDatabaseId,
    row_id: null,
    user_id: 'user-123',
    content: 'Test comment',
    parent_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    resolved: false,
    resolved_by: null,
    resolved_at: null,
    reactions: {},
    user: {
      id: 'user-123',
      email: 'test@example.com',
      role: 'viewer',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    replies: [],
  };

  let mockChannel: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    };

    (supabase.channel as any) = vi.fn().mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading comments', () => {
    it('should load top-level comments', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [mockComment],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.comments).toHaveLength(1);
      expect(result.current.comments[0]).toEqual(mockComment);
    });

    it('should load row-specific comments', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [{ ...mockComment, row_id: mockRowId }],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq, order: mockOrder });

      const { result } = renderHook(() => useComments(mockDatabaseId, mockRowId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockEq).toHaveBeenCalledWith('row_id', mockRowId);
    });

    it('should build comment tree with replies', async () => {
      const parentComment = { ...mockComment, id: 'parent-1' };
      const replyComment = {
        ...mockComment,
        id: 'reply-1',
        parent_id: 'parent-1',
        content: 'Reply to parent',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [parentComment, replyComment],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.topLevelComments).toHaveLength(1);
      expect(result.current.topLevelComments[0].replies).toHaveLength(1);
      expect(result.current.topLevelComments[0].replies![0].content).toBe('Reply to parent');
    });

    it('should flatten comments including replies', async () => {
      const parentComment = { ...mockComment, id: 'parent-1' };
      const replyComment = {
        ...mockComment,
        id: 'reply-1',
        parent_id: 'parent-1',
      };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [parentComment, replyComment],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Flattened comments should include both parent and reply
      expect(result.current.comments).toHaveLength(2);
    });

    it('should handle missing user data', async () => {
      const commentWithoutUser = { ...mockComment, user: null };

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [commentWithoutUser],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.comments[0].user.email).toBe('Unknown');
    });

    it('should handle load errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Load failed'),
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Real-time subscription', () => {
    it('should subscribe to comment changes', () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });

      renderHook(() => useComments(mockDatabaseId));

      expect(supabase.channel).toHaveBeenCalledWith(`comments:${mockDatabaseId}`);
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });

      const { unmount } = renderHook(() => useComments(mockDatabaseId));

      unmount();

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
    });
  });

  describe('addComment', () => {
    it('should add top-level comment', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.addComment('New comment');
      });

      expect(mockInsert).toHaveBeenCalledWith({
        database_id: mockDatabaseId,
        row_id: null,
        user_id: 'user-123',
        content: 'New comment',
        parent_id: null,
      });
    });

    it('should add reply to comment', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockIs = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockIs });
      mockIs.mockReturnValue({ order: mockOrder });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.addComment('Reply comment', 'parent-id');
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_id: 'parent-id',
        })
      );
    });

    it('should throw error when not authenticated', async () => {
      vi.mock('@/contexts/AuthContext', () => ({
        useAuth: () => ({ user: null }),
      }));

      const { result, rerender } = renderHook(() => useComments(mockDatabaseId));

      // Force re-render with null user
      rerender();

      await expect(result.current.addComment('Test')).rejects.toThrow('User not authenticated');
    });
  });

  describe('updateComment', () => {
    it('should update comment content', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockEq, order: mockOrder });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.updateComment('comment-1', 'Updated content');
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Updated content',
        })
      );
      expect(mockEq).toHaveBeenCalledWith('id', 'comment-1');
    });
  });

  describe('deleteComment', () => {
    it('should delete comment', async () => {
      const mockDelete = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        delete: mockDelete,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockEq, order: mockOrder });
      mockDelete.mockReturnValue({ eq: mockEq });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.deleteComment('comment-1');
      });

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'comment-1');
    });
  });

  describe('resolveComment', () => {
    it('should resolve comment', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockEq, order: mockOrder });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.resolveComment('comment-1');
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          resolved: true,
          resolved_by: 'user-123',
        })
      );
    });

    it('should unresolve comment', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockSelect = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ is: mockEq, order: mockOrder });
      mockUpdate.mockReturnValue({ eq: mockEq });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.unresolveComment('comment-1');
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          resolved: false,
          resolved_by: null,
          resolved_at: null,
        })
      );
    });
  });

  describe('reactions', () => {
    it('should add reaction to comment', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { reactions: {} },
      });
      const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle, is: mockEq, order: mockOrder });
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.addReaction('comment-1', '👍');
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          reactions: expect.objectContaining({
            '👍': ['user-123'],
          }),
        })
      );
    });

    it('should not duplicate reactions', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { reactions: { '👍': ['user-123'] } },
      });
      const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle, is: mockEq, order: mockOrder });
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.addReaction('comment-1', '👍');
      });

      // Should still have only one user in the reaction
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          reactions: { '👍': ['user-123'] },
        })
      );
    });

    it('should remove reaction from comment', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { reactions: { '👍': ['user-123', 'user-456'] } },
      });
      const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle, is: mockEq, order: mockOrder });
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.removeReaction('comment-1', '👍');
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          reactions: { '👍': ['user-456'] },
        })
      );
    });

    it('should remove emoji key when last user removes reaction', async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: { reactions: { '👍': ['user-123'] } },
      });
      const mockEqUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
        update: mockUpdate,
      });

      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ single: mockSingle, is: mockEq, order: mockOrder });
      mockUpdate.mockReturnValue({ eq: mockEqUpdate });

      const { result } = renderHook(() => useComments(mockDatabaseId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(async () => {
        await result.current.removeReaction('comment-1', '👍');
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          reactions: {},
        })
      );
    });
  });
});
