import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Comment } from '@/types/auth';
import { useAuth } from '@/contexts/AuthContext';

export function useComments(databaseId: string, rowId?: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadComments = async () => {
    if (!databaseId) return;

    try {
      setLoading(true);

      let query = supabase
        .from('comments')
        .select(`
          *,
          user:user_id (
            id,
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('database_id', databaseId)
        .order('created_at', { ascending: true });

      if (rowId) {
        query = query.eq('row_id', rowId);
      } else {
        query = query.is('row_id', null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Build tree structure with replies
      const commentsMap = new Map<string, Comment>();
      const topLevel: Comment[] = [];

      // First pass: create all comment objects
      (data || []).forEach((comment: any) => {
        const commentObj: Comment = {
          ...comment,
          user: comment.user || { id: comment.user_id, email: 'Unknown', role: 'viewer', created_at: '', updated_at: '' },
          replies: [],
        };
        commentsMap.set(comment.id, commentObj);
      });

      // Second pass: build tree structure
      commentsMap.forEach((comment) => {
        if (comment.parent_id) {
          const parent = commentsMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(comment);
          }
        } else {
          topLevel.push(comment);
        }
      });

      setComments(topLevel);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`comments:${databaseId}${rowId ? `:${rowId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: rowId ? `database_id=eq.${databaseId},row_id=eq.${rowId}` : `database_id=eq.${databaseId}`,
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [databaseId, rowId]);

  const addComment = async (content: string, parentId?: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase.from('comments').insert({
      database_id: databaseId,
      row_id: rowId || null,
      user_id: user.id,
      content,
      parent_id: parentId || null,
    });

    if (error) throw error;
    await loadComments();
  };

  const updateComment = async (commentId: string, content: string) => {
    const { error } = await supabase
      .from('comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error) throw error;
    await loadComments();
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
    await loadComments();
  };

  const resolveComment = async (commentId: string) => {
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('comments')
      .update({
        resolved: true,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', commentId);

    if (error) throw error;
    await loadComments();
  };

  const unresolveComment = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .update({
        resolved: false,
        resolved_by: null,
        resolved_at: null,
      })
      .eq('id', commentId);

    if (error) throw error;
    await loadComments();
  };

  const addReaction = async (commentId: string, emoji: string) => {
    if (!user) throw new Error('User not authenticated');

    // Get current comment
    const { data: comment } = await supabase
      .from('comments')
      .select('reactions')
      .eq('id', commentId)
      .single();

    if (!comment) return;

    const reactions = { ...(comment.reactions || {}) };
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (!reactions[emoji].includes(user.id)) {
      reactions[emoji].push(user.id);
    }

    const { error } = await supabase
      .from('comments')
      .update({ reactions })
      .eq('id', commentId);

    if (error) throw error;
    await loadComments();
  };

  const removeReaction = async (commentId: string, emoji: string) => {
    if (!user) throw new Error('User not authenticated');

    // Get current comment
    const { data: comment } = await supabase
      .from('comments')
      .select('reactions')
      .eq('id', commentId)
      .single();

    if (!comment) return;

    const reactions = { ...(comment.reactions || {}) };
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter((id: string) => id !== user.id);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    const { error } = await supabase
      .from('comments')
      .update({ reactions })
      .eq('id', commentId);

    if (error) throw error;
    await loadComments();
  };

  // Flatten all comments (including replies) for total count
  const flattenComments = (comments: Comment[]): Comment[] => {
    const result: Comment[] = [];
    comments.forEach((comment) => {
      result.push(comment);
      if (comment.replies && comment.replies.length > 0) {
        result.push(...flattenComments(comment.replies));
      }
    });
    return result;
  };

  return {
    comments: flattenComments(comments),
    topLevelComments: comments,
    loading,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    unresolveComment,
    addReaction,
    removeReaction,
    refresh: loadComments,
  };
}
