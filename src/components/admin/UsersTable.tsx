import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Coins, Edit } from "lucide-react";
import { toast } from "sonner";
import { UserRoleDialog } from "./UserRoleDialog";
import { CreditsManagementDialog } from "./CreditsManagementDialog";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
  role: "admin" | "moderator" | "user";
  free_credits: number;
  paid_credits: number;
  total_credits_used: number;
  projects_count: number;
  databases_count: number;
}

export function UsersTable() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [creditsDialogOpen, setCreditsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_users", {
        p_limit: 100,
        p_offset: 0,
      });
      if (error) throw error;
      return data as User[];
    },
  });

  const handleEditRole = (user: User) => {
    setSelectedUser(user);
    setRoleDialogOpen(true);
  };

  const handleEditCredits = (user: User) => {
    setSelectedUser(user);
    setCreditsDialogOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      admin: "destructive",
      moderator: "default",
      user: "secondary",
    };
    return (
      <Badge variant={variants[role] || "secondary"}>
        {role === "admin" ? "Админ" : role === "moderator" ? "Модератор" : "Пользователь"}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead>Кредиты</TableHead>
              <TableHead>Проекты/БД</TableHead>
              <TableHead>Регистрация</TableHead>
              <TableHead>Последний вход</TableHead>
              <TableHead className="text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.email}</TableCell>
                <TableCell>{getRoleBadge(user.role)}</TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="text-sm">
                      Бесплатные: {user.free_credits.toFixed(2)}
                    </div>
                    <div className="text-sm">
                      Платные: {user.paid_credits.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Использовано: {user.total_credits_used.toFixed(2)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {user.projects_count} / {user.databases_count}
                </TableCell>
                <TableCell>
                  {format(new Date(user.created_at), "dd MMM yyyy", { locale: ru })}
                </TableCell>
                <TableCell>
                  {user.last_sign_in_at
                    ? format(new Date(user.last_sign_in_at), "dd MMM yyyy HH:mm", {
                        locale: ru,
                      })
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditRole(user)}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Роль
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditCredits(user)}
                    >
                      <Coins className="h-4 w-4 mr-1" />
                      Кредиты
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <>
          <UserRoleDialog
            user={selectedUser}
            open={roleDialogOpen}
            onOpenChange={setRoleDialogOpen}
          />
          <CreditsManagementDialog
            user={selectedUser}
            open={creditsDialogOpen}
            onOpenChange={setCreditsDialogOpen}
          />
        </>
      )}
    </>
  );
}
