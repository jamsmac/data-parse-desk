import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Database, Eye, EyeOff } from 'lucide-react';
import { LoginCredentials } from '@/types/auth';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState<number[]>([]);
  const lockoutEndRef = useRef<number | null>(null);

  // Get the page user tried to access before being redirected
  const from = (location.state as any)?.from || '/projects';

  // Rate limiting config
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 60000; // 1 minute
  const LOCKOUT_MS = 300000; // 5 minutes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const now = Date.now();

    // Check if locked out
    if (lockoutEndRef.current && now < lockoutEndRef.current) {
      const remainingSeconds = Math.ceil((lockoutEndRef.current - now) / 1000);
      toast({
        title: "Слишком много попыток",
        description: `Пожалуйста, подождите ${remainingSeconds} секунд`,
        variant: "destructive",
      });
      return;
    }

    // Clean old attempts
    const recentAttempts = loginAttempts.filter((timestamp) => now - timestamp < WINDOW_MS);

    // Check rate limit
    if (recentAttempts.length >= MAX_ATTEMPTS) {
      const lockEnd = now + LOCKOUT_MS;
      lockoutEndRef.current = lockEnd;
      
      toast({
        title: "Слишком много попыток входа",
        description: `Аккаунт временно заблокирован на ${LOCKOUT_MS / 60000} минут для защиты от несанкционированного доступа`,
        variant: "destructive",
      });

      setTimeout(() => {
        lockoutEndRef.current = null;
        setLoginAttempts([]);
      }, LOCKOUT_MS);

      return;
    }

    // Record attempt
    setLoginAttempts([...recentAttempts, now]);
    setIsLoading(true);

    try {
      await login(credentials);
      // Clear attempts on successful login
      setLoginAttempts([]);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Ошибка входа. Проверьте данные.');
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = credentials.email && credentials.password;

  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Database className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center" id="login-title">Вход в VHData</CardTitle>
          <CardDescription className="text-center">
            Введите свои учетные данные для входа
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" aria-labelledby="login-title">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={credentials.email}
                onChange={(e) =>
                  setCredentials((prev) => ({ ...prev, email: e.target.value }))
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
                  placeholder="••••••••"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, password: e.target.value }))
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
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link to="/reset-password" className="text-primary hover:underline">
                Забыли пароль?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={!isValid || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Зарегистрироваться
              </Link>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t">
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>Безопасный вход через Supabase Auth</p>
              <p>Все данные защищены шифрованием</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
