import { useOffline } from '@/hooks/useOffline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, RefreshCw, Database, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function OfflineIndicator() {
  const {
    isOnline,
    isOfflineReady,
    pendingChanges,
    isSyncing,
    lastSyncTime,
    syncPendingChanges,
    clearOfflineData,
    getStorageInfo,
  } = useOffline();

  const [showDetails, setShowDetails] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    usage: number;
    quota: number;
    usagePercent: number;
  } | null>(null);

  useEffect(() => {
    if (showDetails) {
      loadStorageInfo();
    }
  }, [showDetails]);

  const loadStorageInfo = async () => {
    const info = await getStorageInfo();
    setStorageInfo(info);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Никогда';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн назад`;
  };

  if (!isOfflineReady) return null;

  return (
    <>
      {/* Offline Banner */}
      {!isOnline && (
        <Alert variant="destructive" className="fixed top-0 left-0 right-0 z-50 rounded-none border-0">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>Вы работаете в офлайн-режиме. Изменения будут синхронизированы при подключении к сети.</span>
            {pendingChanges > 0 && (
              <Badge variant="outline" className="ml-2">
                {pendingChanges} ожидают синхронизации
              </Badge>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Status Indicator - Bottom Right */}
      <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2">
        {/* Sync Status */}
        {isSyncing && (
          <Badge variant="secondary" className="flex items-center gap-2">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Синхронизация...
          </Badge>
        )}

        {/* Pending Changes Badge */}
        {pendingChanges > 0 && !isSyncing && (
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-accent"
            onClick={() => setShowDetails(true)}
          >
            <Database className="h-3 w-3 mr-1" />
            {pendingChanges} несинхр.
          </Badge>
        )}

        {/* Online/Offline Indicator */}
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center gap-2 ${
            isOnline ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
          }`}
          onClick={() => setShowDetails(true)}
        >
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span className="hidden sm:inline">Онлайн</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span className="hidden sm:inline">Офлайн</span>
            </>
          )}
        </Button>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isOnline ? (
                <>
                  <Wifi className="h-5 w-5 text-green-600" />
                  Статус подключения: Онлайн
                </>
              ) : (
                <>
                  <WifiOff className="h-5 w-5 text-red-600" />
                  Статус подключения: Офлайн
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isOnline
                ? 'Приложение подключено к интернету и синхронизируется с сервером.'
                : 'Приложение работает в автономном режиме. Ваши изменения будут синхронизированы при восстановлении подключения.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Pending Changes */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Несинхронизированные изменения</span>
              </div>
              <Badge variant={pendingChanges > 0 ? 'default' : 'secondary'}>{pendingChanges}</Badge>
            </div>

            {/* Last Sync */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Последняя синхронизация</span>
              </div>
              <span className="text-sm text-muted-foreground">{formatLastSync(lastSyncTime)}</span>
            </div>

            {/* Storage Info */}
            {storageInfo && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Использование хранилища</span>
                  <span className="text-sm text-muted-foreground">
                    {formatBytes(storageInfo.usage)} / {formatBytes(storageInfo.quota)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      storageInfo.usagePercent > 80
                        ? 'bg-red-500'
                        : storageInfo.usagePercent > 50
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(storageInfo.usagePercent, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {storageInfo.usagePercent.toFixed(1)}% использовано
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              {isOnline && pendingChanges > 0 && (
                <Button
                  onClick={() => {
                    syncPendingChanges();
                    setShowDetails(false);
                  }}
                  disabled={isSyncing}
                  className="w-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Синхронизировать сейчас
                </Button>
              )}

              <Button
                variant="outline"
                onClick={async () => {
                  if (confirm('Вы уверены? Все офлайн данные и несинхронизированные изменения будут удалены.')) {
                    await clearOfflineData();
                    await loadStorageInfo();
                  }
                }}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Очистить офлайн данные
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
