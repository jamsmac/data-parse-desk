/**
 * Aurora CommentsPanel - Панель комментариев с Aurora эффектами
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GlassCard, 
  GlassCardHeader, 
  GlassCardTitle, 
  GlassCardContent 
} from '@/components/aurora/core/GlassCard';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Reply, Trash2, Edit2, MoreVertical, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Comment, User } from '@/types/auth';

export interface AuroraCommentsPanelProps {
  comments: Comment[];
  currentUser: User;
  rowId: string;
  databaseId: string;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export function AuroraCommentsPanel({
  comments,
  currentUser,
  rowId,
  databaseId,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: AuroraCommentsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment, replyTo || undefined);
      setNewComment('');
      setReplyTo(null);
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdateComment(commentId, editContent);
      setEditingId(null);
      setEditContent('');
    } catch (error) {
      console.error('Failed to update comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Удалить комментарий?')) return;

    try {
      await onDeleteComment(commentId);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    }
    return email?.substring(0, 2).toUpperCase() || '??';
  };

  const formatDate = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} д назад`;
    return commentDate.toLocaleDateString('ru-RU');
  };

  const topLevelComments = comments.filter((c) => !c.parent_id);

  return (
    <GlassCard variant="elevated" intensity="medium" className="overflow-hidden">
      <GlassCardHeader className="relative">
        <div className="absolute -top-2 -right-2 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-3xl" />
        <GlassCardTitle gradient className="flex items-center gap-2 relative z-10">
          <MessageSquare className="h-5 w-5" />
          Комментарии
          {comments.length > 0 && (
            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
              {comments.length}
            </Badge>
          )}
        </GlassCardTitle>
      </GlassCardHeader>

      <GlassCardContent className="space-y-4">
        {/* New Comment Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <AnimatePresence>
            {replyTo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 text-sm text-cyan-400"
              >
                <Reply className="h-4 w-4" />
                Ответ на комментарий
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setReplyTo(null)}
                  className="h-6 text-xs hover:bg-cyan-500/10"
                >
                  Отмена
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Textarea
              placeholder="Добавить комментарий..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              disabled={isSubmitting}
              className="bg-white/5 border-white/10 focus:border-cyan-400/50 focus:ring-cyan-400/20 resize-none"
            />
            <div className="absolute bottom-3 right-3">
              <Button
                onClick={handleSubmit}
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
                className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 border-0"
              >
                <Send className="mr-2 h-4 w-4" />
                Отправить
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Comments List */}
        {comments.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {topLevelComments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2"
                  >
                    {/* Main Comment */}
                    <div className="group relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-purple-500/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                        <Avatar className="h-8 w-8 ring-2 ring-cyan-500/20">
                          <AvatarImage src={comment.user.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white text-xs">
                            {getInitials(comment.user.full_name, comment.user.email)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-gray-200">
                                {comment.user.full_name || comment.user.email}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(comment.created_at)}
                              </span>
                              {comment.updated_at !== comment.created_at && (
                                <Badge variant="outline" className="text-xs border-cyan-500/30 text-cyan-400">
                                  изменено
                                </Badge>
                              )}
                            </div>

                            {comment.user_id === currentUser.id && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-gray-900/95 border-white/10 backdrop-blur-xl">
                                  <DropdownMenuItem 
                                    onClick={() => startEdit(comment)}
                                    className="hover:bg-white/10 focus:bg-white/10"
                                  >
                                    <Edit2 className="mr-2 h-4 w-4 text-cyan-400" />
                                    Редактировать
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(comment.id)}
                                    className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Удалить
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                          {editingId === comment.id ? (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="space-y-2"
                            >
                              <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                rows={2}
                                disabled={isSubmitting}
                                className="bg-white/5 border-white/10 focus:border-cyan-400/50"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdate(comment.id)}
                                  disabled={!editContent.trim() || isSubmitting}
                                  className="bg-gradient-to-r from-cyan-500 to-purple-500"
                                >
                                  Сохранить
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={cancelEdit}
                                  className="hover:bg-white/10"
                                >
                                  Отмена
                                </Button>
                              </div>
                            </motion.div>
                          ) : (
                            <>
                              <p className="text-sm text-gray-300">{comment.content}</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
                                onClick={() => setReplyTo(comment.id)}
                              >
                                <Reply className="mr-1 h-3 w-3" />
                                Ответить
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-11 space-y-3 border-l-2 border-cyan-500/20 pl-4">
                        <AnimatePresence>
                          {comment.replies.map((reply, replyIndex) => (
                            <motion.div
                              key={reply.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: replyIndex * 0.05 }}
                              className="flex gap-3 p-2 rounded-lg bg-white/5 border border-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors"
                            >
                              <Avatar className="h-6 w-6 ring-1 ring-purple-500/20">
                                <AvatarImage src={reply.user.avatar_url} />
                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                  {getInitials(reply.user.full_name, reply.user.email)}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-xs text-gray-200">
                                      {reply.user.full_name || reply.user.email}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(reply.created_at)}
                                    </span>
                                  </div>

                                  {reply.user_id === currentUser.id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 w-6 p-0 hover:bg-red-500/10 hover:text-red-400"
                                      onClick={() => handleDelete(reply.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                                <p className="text-xs text-gray-300">{reply.content}</p>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 rounded-lg blur-2xl" />
            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 mb-4">
                <MessageSquare className="h-8 w-8 text-cyan-400" />
              </div>
              <p className="text-gray-400 font-medium mb-1">Нет комментариев</p>
              <p className="text-sm text-gray-500">Будьте первым, кто оставит комментарий</p>
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-cyan-400">
                <Sparkles className="h-3 w-3" />
                <span>Поделитесь своим мнением</span>
              </div>
            </div>
          </motion.div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
