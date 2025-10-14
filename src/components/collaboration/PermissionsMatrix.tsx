import React, { useState } from 'react';
import { Shield, Check, X, Filter, Download } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { Permission, Role } from './RoleEditor';

interface PermissionsMatrixProps {
  roles: Role[];
  permissions: Permission[];
  onTogglePermission?: (roleId: string, permissionId: string) => Promise<void>;
  readOnly?: boolean;
}

export const PermissionsMatrix: React.FC<PermissionsMatrixProps> = ({
  roles,
  permissions,
  onTogglePermission,
  readOnly = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);

  // Получить уникальные категории
  const categories = Array.from(new Set(permissions.map((p) => p.category)));

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

  // Фильтрация разрешений
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || permission.category === categoryFilter;

    if (!matchesSearch || !matchesCategory) return false;

    if (showOnlyAssigned) {
      const isAssigned = roles.some((role) =>
        role.permissions.includes(permission.id)
      );
      return isAssigned;
    }

    return true;
  });

  // Фильтрация ролей
  const filteredRoles = roles.filter((role) => {
    if (roleFilter === 'all') return true;
    if (roleFilter === 'system') return role.is_system;
    if (roleFilter === 'custom') return !role.is_system;
    return role.id === roleFilter;
  });

  // Проверка наличия разрешения у роли
  const hasPermission = (role: Role, permissionId: string) => {
    return role.permissions.includes(permissionId);
  };

  // Переключить разрешение
  const handleTogglePermission = async (
    role: Role,
    permissionId: string
  ) => {
    if (readOnly || role.is_system) return;
    await onTogglePermission?.(role.id, permissionId);
  };

  // Экспорт матрицы в CSV
  const exportToCSV = () => {
    const headers = ['Разрешение', 'Категория', ...filteredRoles.map((r) => r.name)];
    const rows = filteredPermissions.map((permission) => [
      permission.name,
      categoryLabels[permission.category] || permission.category,
      ...filteredRoles.map((role) =>
        hasPermission(role, permission.id) ? 'Да' : 'Нет'
      ),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'permissions_matrix.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Получить статистику
  const getStatistics = () => {
    const totalPermissions = filteredPermissions.length;
    const totalRoles = filteredRoles.length;
    let assignedCount = 0;

    filteredRoles.forEach((role) => {
      filteredPermissions.forEach((permission) => {
        if (hasPermission(role, permission.id)) {
          assignedCount++;
        }
      });
    });

    const coveragePercent =
      totalPermissions * totalRoles > 0
        ? Math.round((assignedCount / (totalPermissions * totalRoles)) * 100)
        : 0;

    return {
      totalPermissions,
      totalRoles,
      assignedCount,
      coveragePercent,
    };
  };

  const stats = getStatistics();

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Матрица разрешений</h2>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Экспорт CSV
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего ролей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего разрешений
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPermissions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Назначено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Покрытие
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.coveragePercent}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск разрешений..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {categoryLabels[category] || category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Роли" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            <SelectItem value="system">Системные</SelectItem>
            <SelectItem value="custom">Пользовательские</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center space-x-2 rounded-md border px-3">
          <Switch
            id="show-assigned"
            checked={showOnlyAssigned}
            onCheckedChange={setShowOnlyAssigned}
          />
          <Label htmlFor="show-assigned" className="cursor-pointer text-sm">
            Только назначенные
          </Label>
        </div>
      </div>

      {/* Матрица */}
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 z-10 bg-background min-w-[250px]">
                  Разрешение
                </TableHead>
                <TableHead className="min-w-[150px]">Категория</TableHead>
                {filteredRoles.map((role) => (
                  <TableHead key={role.id} className="text-center min-w-[120px]">
                    <div className="space-y-1">
                      <div className="font-medium">{role.name}</div>
                      {role.is_system && (
                        <Badge variant="secondary" className="text-xs">
                          Системная
                        </Badge>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPermissions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={filteredRoles.length + 2}
                    className="text-center text-muted-foreground"
                  >
                    Разрешения не найдены
                  </TableCell>
                </TableRow>
              ) : (
                filteredPermissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell className="sticky left-0 z-10 bg-background">
                      <div className="space-y-1">
                        <div className="font-medium">{permission.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {permission.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryLabels[permission.category] || permission.category}
                      </Badge>
                    </TableCell>
                    {filteredRoles.map((role) => (
                      <TableCell key={role.id} className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 ${
                            hasPermission(role, permission.id)
                              ? 'text-green-600 hover:text-green-700'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() =>
                            handleTogglePermission(role, permission.id)
                          }
                          disabled={readOnly || role.is_system}
                        >
                          {hasPermission(role, permission.id) ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};
