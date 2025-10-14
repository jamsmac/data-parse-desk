import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  Trash2,
  Edit,
  Ban,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import type { User, UserRole } from '@/types/auth';

interface UserManagementProps {
  users: User[];
  currentUserId: string;
  onInviteUser?: (email: string, role: UserRole) => Promise<void>;
  onUpdateUserRole?: (userId: string, role: UserRole) => Promise<void>;
  onRemoveUser?: (userId: string) => Promise<void>;
  onDeactivateUser?: (userId: string) => Promise<void>;
  onActivateUser?: (userId: string) => Promise<void>;
}

interface InviteDialogState {
  open: boolean;
  email: string;
  role: UserRole;
  loading: boolean;
}

interface EditDialogState {
  open: boolean;
  user: User | null;
  role: UserRole;
  loading: boolean;
}

const roleLabels: Record<UserRole, string> = {
  owner: 'Владелец',
  admin: 'Администратор',
  editor: 'Редактор',
  viewer: 'Наблюдатель',
};

const roleColors: Record<UserRole, string> = {
  owner: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  admin: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentUserId,
  onInviteUser,
  onUpdateUserRole,
  onRemoveUser,
  onDeactivateUser,
  onActivateUser,
}) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  
  const [inviteDialog, setInviteDialog] = useState<InviteDialogState>({
    open: false,
    email: '',
    role: 'viewer',
    loading: false,
  });

  const [editDialog, setEditDialog] = useState<EditDialogState>({
    open: false,
    user: null,
    role: 'viewer',
    loading: false,
  });

  // Фильтрация пользователей
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Получить инициалы пользователя
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email ? email.slice(0, 2).toUpperCase() : '??';
  };

  // Пригласить пользователя
  const handleInviteUser = async () => {
    if (!inviteDialog.email) {
      toast({
        title: 'Ошибка',
        description: 'Введите email пользователя',
        variant: 'destructive',
      });
      return;
    }

    setInviteDialog((prev) => ({ ...prev, loading: true }));
    try {
      await onInviteUser?.(inviteDialog.email, inviteDialog.role);
      toast({
        title: 'Приглашение отправлено',
        description: `Приглашение отправлено на ${inviteDialog.email}`,
      });
      setInviteDialog({
        open: false,
        email: '',
        role: 'viewer',
        loading: false,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить приглашение',
        variant: 'destructive',
      });
      setInviteDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Обновить роль пользователя
  const handleUpdateRole = async () => {
    if (!editDialog.user) return;

    setEditDialog((prev) => ({ ...prev, loading: true }));
    try {
      await onUpdateUserRole?.(editDialog.user.id, editDialog.role);
      toast({
        title: 'Роль обновлена',
        description: `Роль пользователя ${editDialog.user.email} обновлена`,
      });
      setEditDialog({
        open: false,
        user: null,
        role: 'viewer',
        loading: false,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить роль',
        variant: 'destructive',
      });
      setEditDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  // Удалить пользователя
  const handleRemoveUser = async (user: User) => {
    if (user.id === currentUserId) {
      toast({
        title: 'Ошибка',
        description: 'Вы не можете удалить самого себя',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onRemoveUser?.(user.id);
      toast({
        title: 'Пользователь удален',
        description: `Пользователь ${user.email} удален`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить пользователя',
        variant: 'destructive',
      });
    }
  };

  // Деактивировать пользователя
  const handleDeactivateUser = async (user: User) => {
    if (user.id === currentUserId) {
      toast({
        title: 'Ошибка',
        description: 'Вы не можете деактивировать самого себя',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onDeactivateUser?.(user.id);
      toast({
        title: 'Пользователь деактивирован',
        description: `Пользователь ${user.email} деактивирован`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось деактивировать пользователя',
        variant: 'destructive',
      });
    }
  };

  // Активировать пользователя
  const handleActivateUser = async (user: User) => {
    try {
      await onActivateUser?.(user.id);
      toast({
        title: 'Пользователь активирован',
        description: `Пользователь ${user.email} активирован`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось активировать пользователя',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Заголовок и кнопка приглашения */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Пользователи</h2>
          <Badge variant="secondary">{users.length}</Badge>
        </div>
        <Button
          onClick={() => setInviteDialog({ ...inviteDialog, open: true })}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Пригласить пользователя
        </Button>
      </div>

      {/* Поиск и фильтры */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск по email или имени..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as UserRole | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Фильтр по роли" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="owner">Владелец</SelectItem>
            <SelectItem value="admin">Администратор</SelectItem>
            <SelectItem value="editor">Редактор</SelectItem>
            <SelectItem value="viewer">Наблюдатель</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Таблица пользователей */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Последний вход</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Пользователи не найдены
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {user.full_name || 'Без имени'}
                        </div>
                        {user.id === currentUserId && (
                          <div className="text-xs text-muted-foreground">
                            (Вы)
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>
                      <Shield className="mr-1 h-3 w-3" />
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Никогда'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={user.id === currentUserId && user.role === 'owner'}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            setEditDialog({
                              open: true,
                              user,
                              role: user.role,
                              loading: false,
                            })
                          }
                          disabled={user.id === currentUserId}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Изменить роль
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeactivateUser(user)}
                          disabled={user.id === currentUserId}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Деактивировать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleActivateUser(user)}
                          disabled={user.id === currentUserId}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Активировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleRemoveUser(user)}
                          disabled={user.id === currentUserId}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Диалог приглашения пользователя */}
      <Dialog
        open={inviteDialog.open}
        onOpenChange={(open) =>
          setInviteDialog({ ...inviteDialog, open, email: '', role: 'viewer' })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пригласить пользователя</DialogTitle>
            <DialogDescription>
              Отправьте приглашение новому пользователю для присоединения к
              проекту
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteDialog.email}
                onChange={(e) =>
                  setInviteDialog({ ...inviteDialog, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Роль</Label>
              <Select
                value={inviteDialog.role}
                onValueChange={(value) =>
                  setInviteDialog({ ...inviteDialog, role: value as UserRole })
                }
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Наблюдатель</SelectItem>
                  <SelectItem value="editor">Редактор</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setInviteDialog({
                  ...inviteDialog,
                  open: false,
                  email: '',
                  role: 'viewer',
                })
              }
              disabled={inviteDialog.loading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={inviteDialog.loading || !inviteDialog.email}
            >
              {inviteDialog.loading ? 'Отправка...' : 'Отправить приглашение'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Диалог редактирования роли */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) =>
          setEditDialog({ ...editDialog, open, user: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить роль пользователя</DialogTitle>
            <DialogDescription>
              Выберите новую роль для пользователя {editDialog.user?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role">Роль</Label>
              <Select
                value={editDialog.role}
                onValueChange={(value) =>
                  setEditDialog({ ...editDialog, role: value as UserRole })
                }
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Наблюдатель</SelectItem>
                  <SelectItem value="editor">Редактор</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                  <SelectItem value="owner">Владелец</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setEditDialog({ ...editDialog, open: false, user: null })
              }
              disabled={editDialog.loading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={editDialog.loading || !editDialog.user}
            >
              {editDialog.loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
