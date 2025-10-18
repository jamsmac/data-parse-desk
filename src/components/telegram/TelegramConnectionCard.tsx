import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TelegramConnectionCardProps {
  isConnected: boolean;
  username?: string;
  firstName?: string;
  linkedAt?: string;
  lastInteraction?: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const TelegramConnectionCard = ({
  isConnected,
  username,
  firstName,
  linkedAt,
  lastInteraction,
  onConnect,
  onDisconnect,
}: TelegramConnectionCardProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Telegram Bot</CardTitle>
              <CardDescription>
                {isConnected
                  ? 'Подключено к вашему аккаунту'
                  : 'Управляйте данными через Telegram'}
              </CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'}>
            {isConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Подключено
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Не подключено
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Пользователь:</span>
                <span className="font-medium">
                  {firstName} {username && `(@${username})`}
                </span>
              </div>
              {linkedAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Подключено:</span>
                  <span>{format(new Date(linkedAt), 'dd MMM yyyy', { locale: ru })}</span>
                </div>
              )}
              {lastInteraction && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Последняя активность:</span>
                  <span>{format(new Date(lastInteraction), 'dd MMM yyyy, HH:mm', { locale: ru })}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Доступные команды:</p>
              <div className="bg-muted p-3 rounded-lg space-y-1 text-xs font-mono">
                <div>/start - Начать работу</div>
                <div>/report - Создать отчет</div>
                <div>/import - Импортировать файл</div>
                <div>/stats - Статистика баз данных</div>
              </div>
            </div>

            <Button variant="destructive" size="sm" onClick={onDisconnect} className="w-full">
              Отключить Telegram
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Подключите Telegram бота для:
              </p>
              <ul className="text-sm space-y-1 ml-4 list-disc">
                <li>Импорта файлов через чат</li>
                <li>Создания баз данных голосом</li>
                <li>Получения отчетов</li>
                <li>Уведомлений о изменениях</li>
              </ul>
            </div>

            <Button onClick={onConnect} className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              Подключить Telegram
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
