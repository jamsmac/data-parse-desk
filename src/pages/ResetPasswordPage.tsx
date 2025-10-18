import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isUpdateMode = searchParams.get("type") === "recovery";

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?type=recovery`,
      });

      if (error) throw error;

      toast.success("Password reset email sent! Check your inbox.");
      setEmail("");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Пароль должен содержать минимум 8 символов");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Пароль успешно обновлен!");
      navigate("/login");
    } catch (error: any) {
      // Handle weak password errors
      if (error.message?.toLowerCase().includes('weak') || 
          error.message?.toLowerCase().includes('compromised') ||
          error.message?.toLowerCase().includes('leaked')) {
        toast.error("Этот пароль слишком простой или был скомпрометирован", {
          description: "Используйте уникальный пароль или менеджер паролей (например, 1Password, Bitwarden)."
        });
      } else {
        toast.error(error.message || "Ошибка обновления пароля");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isUpdateMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Обновить пароль</CardTitle>
            <CardDescription>Введите новый пароль</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Минимум 8 символов"
                />
                <p className="text-xs text-muted-foreground">
                  💡 Используйте уникальный пароль. Рекомендуется менеджер паролей (1Password, Bitwarden).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Повторите пароль"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Обновление..." : "Обновить пароль"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Сброс пароля</CardTitle>
          <CardDescription>
            Введите email для получения ссылки сброса пароля
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправка..." : "Отправить ссылку"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => navigate("/login")}
            >
              Назад к входу
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
