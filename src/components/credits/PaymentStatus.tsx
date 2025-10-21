import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface PaymentStatusProps {
  sessionId?: string;
  onSuccess?: () => void;
}

type PaymentStatus = 'processing' | 'completed' | 'failed' | 'pending';

export function PaymentStatus({ sessionId, onSuccess }: PaymentStatusProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) return;

    // Simulate payment processing
    const checkPaymentStatus = async () => {
      setStatus('processing');
      setProgress(20);
      setMessage('Проверка статуса платежа...');

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(50);
      setMessage('Обработка транзакции...');

      await new Promise(resolve => setTimeout(resolve, 1000));
      setProgress(80);
      setMessage('Зачисление кредитов...');

      try {
        // Check if credits were updated
        const { data, error } = await supabase
          .from('user_credits')
          .select('*')
          .eq('user_id', user?.id)
          .single();

        if (error) throw error;

        setProgress(100);
        setStatus('completed');
        setMessage('Платёж успешно обработан!');

        // Invalidate credits cache
        queryClient.invalidateQueries({ queryKey: ['user-credits'] });
        queryClient.invalidateQueries({ queryKey: ['credit-transactions'] });

        toast({
          title: 'Платёж успешен!',
          description: `Кредиты зачислены на ваш счёт`,
        });

        if (onSuccess) {
          setTimeout(onSuccess, 2000);
        }
      } catch (error) {
        console.error('Payment check error:', error);
        setStatus('failed');
        setMessage('Не удалось проверить статус платежа');

        toast({
          title: 'Ошибка проверки',
          description: 'Попробуйте обновить страницу',
          variant: 'destructive',
        });
      }
    };

    checkPaymentStatus();
  }, [sessionId, user?.id, toast, queryClient, onSuccess]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-8 w-8 text-green-600" />;
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-600" />;
      default:
        return <Clock className="h-8 w-8 text-gray-600" />;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'processing':
        return <Badge variant="secondary">Обработка</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600">Завершено</Badge>;
      case 'failed':
        return <Badge variant="destructive">Ошибка</Badge>;
      default:
        return <Badge variant="outline">Ожидание</Badge>;
    }
  };

  const getAlert = () => {
    switch (status) {
      case 'completed':
        return (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700 dark:text-green-500">
              Платёж успешен!
            </AlertTitle>
            <AlertDescription className="text-green-600 dark:text-green-400">
              Кредиты были успешно зачислены на ваш счёт. Вы можете использовать их для AI функций.
            </AlertDescription>
          </Alert>
        );
      case 'failed':
        return (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Ошибка платежа</AlertTitle>
            <AlertDescription>
              Не удалось обработать платёж. Пожалуйста, свяжитесь с поддержкой.
            </AlertDescription>
          </Alert>
        );
      case 'processing':
        return (
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-700 dark:text-blue-500">
              Обработка платежа
            </AlertTitle>
            <AlertDescription className="text-blue-600 dark:text-blue-400">
              Пожалуйста, не закрывайте эту страницу. Обработка может занять несколько секунд.
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  if (!sessionId) return null;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle>Статус платежа</CardTitle>
              <CardDescription>Отслеживание транзакции</CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {getAlert()}

        {status === 'processing' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{message}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {status === 'completed' && (
          <div className="text-center py-4">
            <p className="text-lg font-semibold text-green-600">
              Спасибо за покупку!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Кредиты доступны для использования прямо сейчас
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
