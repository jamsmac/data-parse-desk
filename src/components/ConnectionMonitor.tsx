import { useEffect, useState } from 'react';
import { checkSupabaseHealth } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { ENV } from '@/config/env';

interface HealthStatus {
  healthy: boolean;
  latency: number;
  error?: string;
  lastCheck: Date;
}

export function ConnectionMonitor() {
  const [status, setStatus] = useState<HealthStatus>({
    healthy: true,
    latency: 0,
    lastCheck: new Date(),
  });
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      if (!mounted) return;

      const result = await checkSupabaseHealth();

      if (mounted) {
        setStatus({
          healthy: result.healthy,
          latency: result.latency,
          error: result.error,
          lastCheck: new Date(),
        });

        // Show alert if connection becomes unhealthy
        if (!result.healthy) {
          setShowAlert(true);
        } else if (showAlert) {
          // Hide alert after 3 seconds when connection recovers
          setTimeout(() => {
            if (mounted) setShowAlert(false);
          }, 3000);
        }
      }
    }

    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [showAlert]);

  // Don't show anything if healthy and no alert
  if (status.healthy && !showAlert) {
    return null;
  }

  // Status badge in corner
  const StatusBadge = () => {
    if (!status.healthy) {
      return (
        <Badge
          variant="destructive"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2"
        >
          <WifiOff className="h-4 w-4" />
          Нет подключения
        </Badge>
      );
    }

    if (status.latency > 2000) {
      return (
        <Badge
          variant="outline"
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-yellow-50 border-yellow-200 text-yellow-800"
        >
          <AlertTriangle className="h-4 w-4" />
          Медленное соединение ({status.latency}ms)
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-green-50 border-green-200 text-green-800"
      >
        <Wifi className="h-4 w-4" />
        Подключено
      </Badge>
    );
  };

  // Full alert for critical issues
  if (!status.healthy && showAlert) {
    return (
      <>
        <Alert
          variant="destructive"
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg shadow-lg"
        >
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Потеряно подключение к серверу</AlertTitle>
          <AlertDescription>
            {status.error || 'Проверьте интернет-соединение. Приложение работает в автономном режиме.'}
            <br />
            <span className="text-xs text-muted-foreground mt-2 block">
              Последняя проверка: {status.lastCheck.toLocaleTimeString()}
            </span>
          </AlertDescription>
        </Alert>
        <StatusBadge />
      </>
    );
  }

  return <StatusBadge />;
}

// Environment badge for development
export function EnvironmentBadge() {
  if (ENV.isProduction) return null;

  return (
    <Badge
      variant="outline"
      className="fixed bottom-4 left-4 z-50 bg-purple-50 border-purple-200 text-purple-800"
    >
      {ENV.environment.toUpperCase()}
      {ENV.supabase.projectId && ` - ${ENV.supabase.projectId.substring(0, 8)}`}
    </Badge>
  );
}
