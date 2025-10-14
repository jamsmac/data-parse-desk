import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Save,
  X,
  Copy,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  user_count?: number;
  created_at: string;
  updated_at: string;
}

interface RoleEditorProps {
  roles: Role[];
  permissions: Permission[];
  onCreateRole?: (role: Omit<Role, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onUpdateRole?: (roleId: string, updates: Partial<Role>) => Promise<void>;
  onDeleteRole?: (roleId: string) => Promise<void>;
  onDuplicateRole?: (roleId: string) => Promise<void>;
}

interface RoleFormState {
  name: string;
  description: string;
  permissions: string[];
}

export const RoleEditor: React.FC<RoleEditorProps> = ({
  roles,
  permissions,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onDuplicateRole,
}) => {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<RoleFormState>({
    name: '',
    description: '',
    permissions: [],
  });

  // Группировка разрешений по категориям
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const categoryLabels: Record<string, string> = {
    databases: 'Базы данных',
    tables: 'Таблицы',
    rows: 'Строки',
    columns: 'Столбцы',
    views: 'Представления',
    reports: 'Отчёты',
    analytics: 'Аналитика',
    users: 'Пользователи',
    settings: 'Настройки',
    integrations: 'Интеграции',
  };

  // Начать создание новой роли
  const handleStartCreate = () => {
    setIsCreating(true);
    setSelectedRole(null);
    setForm({
      name: '',
      description: '',
      permissions: [],
    });
  };

  // Выбрать роль для редактирования
  const handleSelectRole = (role: Role) => {
    if (role.is_system) {
      toast({
        title: 'Системная роль',
        description: 'Системные роли нельзя редактировать',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(false);
    setSelectedRole(role);
    setForm({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
  };

  // Отменить редактирование
  const handleCancel = () => {
    setIsCreating(false);
    setSelectedRole(null);
    setForm({
      name: '',
      description: '',
      permissions: [],
    });
  };

  // Переключить разрешение
  const togglePermission = (permissionId: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((id) => id !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  // Выбрать все разрешения в категории
  const toggleCategory = (category: string) => {
    const categoryPermissions = permissionsByCategory[category].map((p) => p.id);
    const allSelected = categoryPermissions.every((id) =>
      form.permissions.includes(id)
    );

    if (allSelected) {
      setForm((prev) => ({
        ...prev,
        permissions: prev.permissions.filter(
          (id) => !categoryPermissions.includes(id)
        ),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...categoryPermissions])],
      }));
    }
  };

  // Сохранить роль
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Укажите название роли',
        variant: 'destructive',
      });
      return;
    }

    if (form.permissions.length === 0) {
      toast({
        title: 'Ошибка',
        description: 'Выберите хотя бы одно разрешение',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      if (isCreating) {
        await onCreateRole?.({
          name: form.name,
          description: form.description,
          permissions: form.permissions,
          is_system: false,
        });
        toast({
          title: 'Роль создана',
          description: `Роль "${form.name}" успешно создана`,
        });
      } else if (selectedRole) {
        await onUpdateRole?.(selectedRole.id, {
          name: form.name,
          description: form.description,
          permissions: form.permissions,
        });
        toast({
          title: 'Роль обновлена',
          description: `Роль "${form.name}" успешно обновлена`,
        });
      }
      handleCancel();
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить роль',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Дублировать роль
  const handleDuplicate = async (role: Role) => {
    setLoading(true);
    try {
      await onDuplicateRole?.(role.id);
      toast({
        title: 'Роль дублирована',
        description: `Создана копия роли "${role.name}"`,
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось дублировать роль',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Удалить роль
  const handleDelete = async () => {
    if (!roleToDelete) return;

    setLoading(true);
    try {
      await onDeleteRole?.(roleToDelete.id);
      toast({
        title: 'Роль удалена',
        description: `Роль "${roleToDelete.name}" успешно удалена`,
      });
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
      if (selectedRole?.id === roleToDelete.id) {
        handleCancel();
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить роль',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isCategoryFullySelected = (category: string) => {
    const categoryPermissions = permissionsByCategory[category].map((p) => p.id);
    return categoryPermissions.every((id) => form.permissions.includes(id));
  };

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Роли и разрешения</h2>
        </div>
        <Button onClick={handleStartCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Создать роль
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        {/* Список ролей */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Роли</h3>
          <div className="space-y-1">
            {roles.map((role) => (
              <Card
                key={role.id}
                className={`cursor-pointer transition-colors ${
                  selectedRole?.id === role.id
                    ? 'border-primary'
                    : 'hover:border-muted-foreground/50'
                }`}
                onClick={() => handleSelectRole(role)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{role.name}</span>
                        {role.is_system && (
                          <Badge variant="secondary" className="text-xs">
                            Системная
                          </Badge>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-xs text-muted-foreground">
                          {role.description}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {role.permissions.length} разрешений
                        {role.user_count !== undefined && (
                          <> • {role.user_count} пользователей</>
                        )}
                      </div>
                    </div>
                    {!role.is_system && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(role);
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoleToDelete(role);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Редактор роли */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isCreating ? 'Новая роль' : selectedRole ? 'Редактировать роль' : 'Выберите роль'}
            </CardTitle>
            <CardDescription>
              {isCreating
                ? 'Создайте новую роль с настраиваемыми разрешениями'
                : selectedRole
                ? 'Измените название, описание и разрешения роли'
                : 'Выберите роль из списка слева для редактирования'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(isCreating || selectedRole) && (
              <>
                {/* Основная информация */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role-name">Название роли</Label>
                    <Input
                      id="role-name"
                      placeholder="Например: Менеджер проектов"
                      value={form.name}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role-description">Описание</Label>
                    <Textarea
                      id="role-description"
                      placeholder="Краткое описание роли и её назначения"
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      rows={2}
                    />
                  </div>
                </div>

                <Separator />

                {/* Разрешения */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Разрешения</Label>
                    <Badge variant="secondary">
                      {form.permissions.length} выбрано
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(permissionsByCategory).map(
                      ([category, categoryPermissions]) => {
                        const allSelected = isCategoryFullySelected(category);
                        const someSelected = categoryPermissions.some((p) =>
                          form.permissions.includes(p.id)
                        );

                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">
                                {categoryLabels[category] || category}
                              </Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCategory(category)}
                                className="h-auto py-1 text-xs"
                              >
                                {allSelected
                                  ? 'Снять все'
                                  : someSelected
                                  ? 'Выбрать все'
                                  : 'Выбрать все'}
                              </Button>
                            </div>
                            <div className="space-y-2 rounded-md border p-3">
                              {categoryPermissions.map((permission) => (
                                <div
                                  key={permission.id}
                                  className="flex items-start space-x-2"
                                >
                                  <Switch
                                    id={permission.id}
                                    checked={form.permissions.includes(
                                      permission.id
                                    )}
                                    onCheckedChange={() =>
                                      togglePermission(permission.id)
                                    }
                                  />
                                  <div className="grid gap-1">
                                    <Label
                                      htmlFor={permission.id}
                                      className="cursor-pointer font-normal"
                                    >
                                      {permission.name}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      {permission.description}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Действия */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Отмена
                  </Button>
                </div>
              </>
            )}

            {!isCreating && !selectedRole && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Выберите роль из списка слева или создайте новую роль
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Диалог подтверждения удаления */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить роль?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить роль "{roleToDelete?.name}"?
              {roleToDelete?.user_count && roleToDelete.user_count > 0 && (
                <Alert className="mt-4" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Эта роль назначена {roleToDelete.user_count} пользователям.
                    Они потеряют доступ к функциям этой роли.
                  </AlertDescription>
                </Alert>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setRoleToDelete(null);
              }}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? 'Удаление...' : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
