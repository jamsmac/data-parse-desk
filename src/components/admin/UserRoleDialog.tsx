import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type AppRole = "admin" | "moderator" | "user";

interface User {
  id: string;
  email: string;
  role: AppRole;
}

interface UserRoleDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserRoleDialog({ user, open, onOpenChange }: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<string>(user.role);
  const queryClient = useQueryClient();

  const assignRoleMutation = useMutation({
    mutationFn: async (role: AppRole) => {
      const { data, error } = await supabase.rpc("admin_assign_role", {
        p_user_id: user.id,
        p_role: role as any,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Роль успешно обновлена");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Ошибка обновления роли: " + error.message);
    },
  });

  const handleSubmit = () => {
    assignRoleMutation.mutate(selectedRole as AppRole);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Изменить роль пользователя</DialogTitle>
          <DialogDescription>
            Пользователь: <strong>{user.email}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="user" id="user" />
              <Label htmlFor="user" className="cursor-pointer">
                <div>
                  <div className="font-medium">Пользователь</div>
                  <div className="text-sm text-muted-foreground">
                    Базовый доступ к функциям
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="moderator" id="moderator" />
              <Label htmlFor="moderator" className="cursor-pointer">
                <div>
                  <div className="font-medium">Модератор</div>
                  <div className="text-sm text-muted-foreground">
                    Расширенные возможности управления
                  </div>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="admin" id="admin" />
              <Label htmlFor="admin" className="cursor-pointer">
                <div>
                  <div className="font-medium">Администратор</div>
                  <div className="text-sm text-muted-foreground">
                    Полный доступ к системе
                  </div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={assignRoleMutation.isPending || selectedRole === user.role}
          >
            {assignRoleMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
