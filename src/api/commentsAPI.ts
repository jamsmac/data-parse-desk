import { supabase } from '@/integrations/supabase/client';
import type { Comment } from '@/types/auth';

/**
 * API для работы с комментариями
 */

// Получить комментарии для строки
export async function getRowComments(
  databaseId: string,
  rowId: string
): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role
      ),
      replies:comments!parent_id (
        *,
        user:user_id (
          id,
          email,
          full_name,
          avatar_url,
          role
        )
      )
    `)
    .eq('database_id', databaseId)
    .eq('row_id', rowId)
    .is('parent_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }

  return data || [];
}

// Добавить комментарий
export async function addComment(
  databaseId: string,
  rowId: string,
  content: string,
  parentId?: string
): Promise<Comment> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      database_id: databaseId,
      row_id: rowId,
      user_id: user.user.id,
      content,
      parent_id: parentId || null,
    })
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role
      )
    `)
    .single();

  if (error) {
    console.error('Error adding comment:', error);
    throw error;
  }

  return data;
}

// Обновить комментарий
export async function updateComment(
  commentId: string,
  content: string
): Promise<Comment> {
  const { data, error } = await supabase
    .from('comments')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .select(`
      *,
      user:user_id (
        id,
        email,
        full_name,
        avatar_url,
        role
      )
    `)
    .single();

  if (error) {
    console.error('Error updating comment:', error);
    throw error;
  }

  return data;
}

// Удалить комментарий
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

// Подписаться на изменения комментариев
export function subscribeToComments(
  databaseId: string,
  rowId: string,
  callback: (comment: Comment) => void
) {
  return supabase
    .channel(`comments:${databaseId}:${rowId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'comments',
        filter: `database_id=eq.${databaseId},row_id=eq.${rowId}`,
      },
      (payload) => {
        callback(payload.new as Comment);
      }
    )
    .subscribe();
}
