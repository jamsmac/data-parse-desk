import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import {
  getRowComments,
  addComment,
  updateComment,
  deleteComment,
  subscribeToComments,
} from '@/api/commentsAPI';
import type { Comment } from '@/types/auth';

/**
 * Hook для работы с комментариями к строке
 */
export function useComments(databaseId: string, rowId: string) {
  const queryClient = useQueryClient();

  // Получение комментариев
  const { data: comments = [], isLoading, error } = useQuery({
    queryKey: ['comments', databaseId, rowId],
    queryFn: () => getRowComments(databaseId, rowId),
    enabled: !!databaseId && !!rowId,
  });

  // Добавить комментарий
  const addCommentMutation = useMutation({
    mutationFn: ({ content, parentId }: { content: string; parentId?: string }) =>
      addComment(databaseId, rowId, content, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', databaseId, rowId] });
    },
  });

  // Обновить комментарий
  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', databaseId, rowId] });
    },
  });

  // Удалить комментарий
  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', databaseId, rowId] });
    },
  });

  // Real-time подписка
  useEffect(() => {
    if (!databaseId || !rowId) return;

    const subscription = subscribeToComments(databaseId, rowId, (newComment) => {
      queryClient.setQueryData<Comment[]>(
        ['comments', databaseId, rowId],
        (old = []) => [newComment, ...old]
      );
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [databaseId, rowId, queryClient]);

  return {
    comments,
    isLoading,
    error,
    addComment: addCommentMutation.mutateAsync,
    updateComment: updateCommentMutation.mutateAsync,
    deleteComment: deleteCommentMutation.mutateAsync,
  };
}
