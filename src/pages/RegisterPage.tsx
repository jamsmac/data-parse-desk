import { useState } from 'react';
import { 
  GlassCard, 
  GlassCardContent, 
  GlassCardDescription, 
  GlassCardHeader, 
  GlassCardTitle,
  AuroraBackground,
  FadeIn
} from '@/components/aurora';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Database, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { RegisterData } from '@/types/auth';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const [formData, setFormData] = useState<RegisterData>({
    email: '',
    password: '',
    full_name: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const isValid = formData.email && formData.password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setIsLoading(true);

    try {
      await register(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации. Попробуйте снова.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuroraBackground variant="aurora" intensity="subtle">
      <div className="min-h-screen flex items-center justify-center p-4">
        <FadeIn direction="up" duration={600}>
          <GlassCard 
            className="w-full max-w-md"
            intensity="strong"
            variant="elevated"
            animated={true}
          >
            <GlassCardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Database className="h-8 w-8 text-primary" />
            </div>
          </div>
              <GlassCardTitle className="text-2xl text-center" gradient={true}>
                Регистрация в VHData
              </GlassCardTitle>
              <GlassCardDescription className="text-center">
                Создайте аккаунт для доступа к платформе
              </GlassCardDescription>
            </GlassCardHeader>
            <GlassCardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name">Полное имя (опционально)</Label>
              <Input
                id="full_name"
                type="text"
                placeholder="Иван Иванов"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, full_name: e.target.value }))
                }
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Минимум 6 символов"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {formData.password && formData.password.length < 6 && (
                <p className="text-xs text-muted-foreground">Минимум 6 символов</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Регистрация...
                </>
              ) : (
                'Зарегистрироваться'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Войти
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t">
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>После регистрации вы будете автоматически авторизованы</p>
            </div>
          </div>
            </GlassCardContent>
          </GlassCard>
        </FadeIn>
      </div>
    </AuroraBackground>
  );
}
