import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Reply, Trash2, Edit2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Comment, User } from '@/types/auth';

export interface CommentsPanelProps {
  comments: Comment[];
  currentUser: User;
  rowId: string;
  databaseId: string;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onUpdateComment: (commentId: string, content: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

export function CommentsPanel({
  comments,
  currentUser,
  rowId,
  databaseId,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: CommentsPanelProps) {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Комментарии ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Comment Form */}
        <div className="space-y-2">
          {replyTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Reply className="h-4 w-4" />
              Ответ на комментарий
              <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>
                Отмена
              </Button>
            </div>
          )}
          <Textarea
            placeholder="Добавить комментарий..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={!newComment.trim() || isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              Отправить
            </Button>
          </div>
        </div>

        {/* Comments List */}
        {comments.length > 0 ? (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4 pr-4">
              {topLevelComments.map((comment) => (
                <div key={comment.id} className="space-y-2">
                  {/* Main Comment */}
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.user.avatar_url} />
                      <AvatarFallback>
                        {getInitials(comment.user.full_name, comment.user.email)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.user.full_name || comment.user.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                          {comment.updated_at !== comment.created_at && (
                            <Badge variant="outline" className="text-xs">
                              изменено
                            </Badge>
                          )}
                        </div>

                        {comment.user_id === currentUser.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => startEdit(comment)}>
                                <Edit2 className="mr-2 h-4 w-4" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(comment.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Удалить
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>

                      {editingId === comment.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                            disabled={isSubmitting}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdate(comment.id)}
                              disabled={!editContent.trim() || isSubmitting}
                            >
                              Сохранить
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEdit}>
                              Отмена
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm">{comment.content}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setReplyTo(comment.id)}
                          >
                            <Reply className="mr-1 h-3 w-3" />
                            Ответить
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-11 space-y-3 border-l-2 pl-4">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={reply.user.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {getInitials(reply.user.full_name, reply.user.email)}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs">
                                  {reply.user.full_name || reply.user.email}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(reply.created_at)}
                                </span>
                              </div>

                              {reply.user_id === currentUser.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleDelete(reply.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <p className="text-xs">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>Нет комментариев</p>
            <p className="text-sm">Будьте первым, кто оставит комментарий</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
