import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, MessageSquare, Workflow, Send, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { TelegramConnectionCard } from '@/components/telegram/TelegramConnectionCard';

export default function Integrations() {
  const [zapierWebhook, setZapierWebhook] = useState('');
  const [isTestingZapier, setIsTestingZapier] = useState(false);

  const handleTestZapier = async () => {
    if (!zapierWebhook) {
      toast.error('Введите Zapier Webhook URL');
      return;
    }

    setIsTestingZapier(true);

    try {
      await fetch(zapierWebhook, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: 'test',
          timestamp: new Date().toISOString(),
          source: 'DATA PARSE DESK 2.0',
          message: 'Тестовое событие из интеграции'
        }),
      });

      toast.success('Запрос отправлен в Zapier! Проверьте историю Zap.');
    } catch (error) {
      console.error('Zapier error:', error);
      toast.error('Ошибка отправки в Zapier');
    } finally {
      setIsTestingZapier(false);
    }
  };

  const copyWebhookExample = () => {
    const example = `{
  "event": "record_created",
  "table": "orders",
  "data": {
    "id": "123",
    "status": "pending",
    "total": 1000
  }
}`;
    navigator.clipboard.writeText(example);
    toast.success('Пример скопирован');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Интеграции</h1>
            <p className="text-muted-foreground mt-2">
              Подключите внешние сервисы для автоматизации workflow
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            3 доступно
          </Badge>
        </div>

        <Tabs defaultValue="zapier" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="zapier">
              <Zap className="h-4 w-4 mr-2" />
              Zapier
            </TabsTrigger>
            <TabsTrigger value="telegram">
              <MessageSquare className="h-4 w-4 mr-2" />
              Telegram
            </TabsTrigger>
            <TabsTrigger value="webhooks">
              <Workflow className="h-4 w-4 mr-2" />
              Webhooks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="zapier" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-orange-500 flex items-center justify-center">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Zapier Integration</CardTitle>
                    <CardDescription>
                      Автоматизируйте процессы с 6000+ приложениями
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="webhook">Zapier Webhook URL</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        id="webhook"
                        placeholder="https://hooks.zapier.com/hooks/catch/..."
                        value={zapierWebhook}
                        onChange={(e) => setZapierWebhook(e.target.value)}
                      />
                      <Button onClick={handleTestZapier} disabled={isTestingZapier}>
                        <Send className="h-4 w-4 mr-2" />
                        Test
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      Создайте Zap в Zapier и вставьте Webhook URL сюда
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Пример payload:</h4>
                      <Button variant="ghost" size="sm" onClick={copyWebhookExample}>
                        <Copy className="h-4 w-4 mr-2" />
                        Копировать
                      </Button>
                    </div>
                    <pre className="text-xs bg-background p-3 rounded overflow-x-auto">
{`{
  "event": "record_created",
  "table": "orders",
  "data": {
    "id": "123",
    "status": "pending",
    "total": 1000
  }
}`}
                    </pre>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold">Доступные события:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">record_created</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">record_updated</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950 rounded">
                        <CheckCircle2 className="h-4 w-4 text-red-600" />
                        <span className="text-sm">record_deleted</span>
                      </div>
                      <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950 rounded">
                        <CheckCircle2 className="h-4 w-4 text-purple-600" />
                        <span className="text-sm">import_completed</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
                      💡 Примеры использования:
                    </h4>
                    <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li>• Отправка email при создании заказа</li>
                      <li>• Создание задачи в Trello при импорте данных</li>
                      <li>• Уведомление в Slack при изменении статуса</li>
                      <li>• Синхронизация с Google Sheets</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="telegram">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-blue-500 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle>Telegram Bot</CardTitle>
                    <CardDescription>
                      Управляйте данными через Telegram
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Откройте Settings → Integrations для настройки Telegram бота
                </p>
                <Button variant="outline" onClick={() => window.location.href = '/settings'}>
                  Открыть настройки
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Custom Webhooks</CardTitle>
                <CardDescription>
                  Настройте собственные webhook endpoints для интеграции
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Функция в разработке. Скоро вы сможете создавать custom webhooks
                  для отправки данных в любые внешние системы.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
