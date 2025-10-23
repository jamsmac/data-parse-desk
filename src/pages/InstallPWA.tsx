import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, CheckCircle2, Chrome, Apple } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <main id="main-content">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl">Установите DATA PARSE DESK</CardTitle>
          <CardDescription className="text-lg">
            Получите полноценное приложение на вашем устройстве
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isInstalled ? (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                ✅ Приложение уже установлено! Вы можете открыть его с главного экрана.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Преимущества установки:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>Работает офлайн - доступ к данным без интернета</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>Быстрая загрузка - мгновенный запуск</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>Иконка на главном экране - как обычное приложение</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>Полноэкранный режим - без браузерных элементов</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                    <span>Push-уведомления (скоро)</span>
                  </li>
                </ul>
              </div>

              {isIOS ? (
                <Alert>
                  <Apple className="h-5 w-5" />
                  <AlertDescription>
                    <strong>Для iOS/iPhone:</strong>
                    <ol className="mt-2 space-y-1 text-sm">
                      <li>1. Нажмите кнопку "Поделиться" в Safari</li>
                      <li>2. Выберите "На экран Домой"</li>
                      <li>3. Нажмите "Добавить"</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              ) : deferredPrompt ? (
                <Button onClick={handleInstall} size="lg" className="w-full">
                  <Download className="mr-2 h-5 w-5" />
                  Установить приложение
                </Button>
              ) : (
                <Alert>
                  <Chrome className="h-5 w-5" />
                  <AlertDescription>
                    <strong>Для Android/Chrome:</strong>
                    <ol className="mt-2 space-y-1 text-sm">
                      <li>1. Откройте меню браузера (⋮)</li>
                      <li>2. Выберите "Установить приложение" или "Добавить на главный экран"</li>
                      <li>3. Подтвердите установку</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <div className="pt-6 border-t">
            <h4 className="font-semibold mb-3">Системные требования:</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">iOS</p>
                <p className="text-muted-foreground">Safari 11.1+</p>
              </div>
              <div>
                <p className="font-medium">Android</p>
                <p className="text-muted-foreground">Chrome 40+</p>
              </div>
              <div>
                <p className="font-medium">Windows</p>
                <p className="text-muted-foreground">Chrome, Edge</p>
              </div>
              <div>
                <p className="font-medium">macOS</p>
                <p className="text-muted-foreground">Chrome, Safari 16.4+</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
