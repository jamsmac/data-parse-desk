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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  free_credits: number;
  paid_credits: number;
}

interface CreditsManagementDialogProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreditsManagementDialog({
  user,
  open,
  onOpenChange,
}: CreditsManagementDialogProps) {
  const [freeCredits, setFreeCredits] = useState(0);
  const [paidCredits, setPaidCredits] = useState(0);
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const adjustCreditsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("admin_adjust_credits", {
        p_user_id: user.id,
        p_free_credits_delta: freeCredits,
        p_paid_credits_delta: paidCredits,
        p_description: description || "Admin adjustment",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Кредиты успешно обновлены");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setFreeCredits(0);
      setPaidCredits(0);
      setDescription("");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Ошибка обновления кредитов: " + error.message);
    },
  });

  const handleSubmit = () => {
    if (freeCredits === 0 && paidCredits === 0) {
      toast.error("Укажите изменение кредитов");
      return;
    }
    adjustCreditsMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Управление кредитами</DialogTitle>
          <DialogDescription>
            Пользователь: <strong>{user.email}</strong>
            <br />
            Текущий баланс: {user.free_credits.toFixed(2)} бесплатных +{" "}
            {user.paid_credits.toFixed(2)} платных
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="free-credits">
              Изменение бесплатных кредитов
            </Label>
            <Input
              id="free-credits"
              type="number"
              step="0.01"
              value={freeCredits}
              onChange={(e) => setFreeCredits(parseFloat(e.target.value) || 0)}
              placeholder="Укажите изменение (+ или -)"
            />
            <p className="text-xs text-muted-foreground">
              Новый баланс: {(user.free_credits + freeCredits).toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paid-credits">Изменение платных кредитов</Label>
            <Input
              id="paid-credits"
              type="number"
              step="0.01"
              value={paidCredits}
              onChange={(e) => setPaidCredits(parseFloat(e.target.value) || 0)}
              placeholder="Укажите изменение (+ или -)"
            />
            <p className="text-xs text-muted-foreground">
              Новый баланс: {(user.paid_credits + paidCredits).toFixed(2)}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Причина изменения кредитов"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={adjustCreditsMutation.isPending}
          >
            {adjustCreditsMutation.isPending ? "Сохранение..." : "Применить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
