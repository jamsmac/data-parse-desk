import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'moderator' | 'user';

interface ProtectedRouteProps {
  element: React.ReactElement;
  redirectTo?: string;
  requireRole?: AppRole;
}

/**
 * ProtectedRoute component that enforces authentication
 * Redirects to login page if user is not authenticated
 * Shows loading spinner while checking authentication status
 */
export function ProtectedRoute({
  element,
  redirectTo = '/login',
  requireRole
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Check user role if required
  const { data: hasRequiredRole, isLoading: isCheckingRole } = useQuery({
    queryKey: ['user-role', user?.id, requireRole],
    queryFn: async () => {
      if (!requireRole || !user) return true;
      
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _project_id: null as any,
        _role: requireRole as any
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!requireRole,
  });

  // Show loading spinner while checking auth status or role
  if (isLoading || (requireRole && isCheckingRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">
            {isLoading ? 'Проверка авторизации...' : 'Проверка прав доступа...'}
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  // Save the attempted location so we can redirect back after login
  if (!user) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Check role access if required
  if (requireRole && hasRequiredRole === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Доступ запрещён</h1>
          <p className="text-muted-foreground mb-6">
            У вас нет прав доступа к этой странице. Требуется роль: {requireRole}
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // User is authenticated and has required role, render the protected component
  return element;
}

/**
 * Higher-order component version for class components (if needed)
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo: string = '/login'
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute
        element={<Component {...props} />}
        redirectTo={redirectTo}
      />
    );
  };
}