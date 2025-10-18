import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { LoginCredentials, RegisterData } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { full_name?: string; avatar_url?: string }) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Подписываемся на изменения авторизации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка входа',
        description: error.message,
      });
      throw error;
    }

    toast({
      title: 'Успешный вход',
      description: 'Добро пожаловать!',
    });

    navigate('/projects');
  };

  const register = async (data: RegisterData) => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
        },
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка регистрации',
        description: error.message,
      });
      throw error;
    }

    toast({
      title: 'Регистрация успешна',
      description: 'Проверьте email для подтверждения аккаунта',
    });

    navigate('/login');
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка выхода',
        description: error.message,
      });
      throw error;
    }

    toast({
      title: 'Вы вышли из системы',
    });

    navigate('/login');
  };

  const updateProfile = async (data: { full_name?: string; avatar_url?: string }) => {
    if (!user) throw new Error('Пользователь не авторизован');

    const { error } = await supabase.auth.updateUser({
      data,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка обновления профиля',
        description: error.message,
      });
      throw error;
    }

    toast({
      title: 'Профиль обновлен',
      description: 'Ваши данные успешно сохранены',
    });
  };

  const updatePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) throw new Error('Пользователь не авторизован');

    // Сначала проверяем текущий пароль
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });

    if (signInError) {
      toast({
        variant: 'destructive',
        title: 'Неверный текущий пароль',
      });
      throw signInError;
    }

    // Обновляем пароль
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Ошибка обновления пароля',
        description: error.message,
      });
      throw error;
    }

    toast({
      title: 'Пароль обновлен',
      description: 'Ваш пароль успешно изменен',
    });
  };

  const value = {
    user,
    session,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
