import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  element: React.ReactElement;
  redirectTo?: string;
}

/**
 * ProtectedRoute component that enforces authentication
 * Redirects to login page if user is not authenticated
 * Shows loading spinner while checking authentication status
 */
export function ProtectedRoute({
  element,
  redirectTo = '/login'
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Проверка авторизации...</p>
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

  // User is authenticated, render the protected component
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