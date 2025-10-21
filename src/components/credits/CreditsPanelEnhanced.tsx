import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Coins, TrendingUp, TrendingDown, ShoppingCart, CreditCard, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { PricingCard } from './PricingCard';
import { SubscriptionPlans } from './SubscriptionPlans';
import { PaymentStatus } from './PaymentStatus';
import { Button } from '@/components/ui/button';

const CREDIT_PACKAGES = [
  {
    id: 'small',
    name: 'Starter',
    credits: 100,
    price: 10,
    icon: 'sparkles' as const,
    features: ['Базовые AI функции', 'Генерация схем', 'Анализ данных']
  },
  {
    id: 'medium',
    name: 'Popular',
    credits: 500,
    price: 40,
    popular: true,
    icon: 'zap' as const,
    features: ['Все из Starter', 'OCR распознавание', 'Voice транскрипция', 'Composite Views']
  },
  {
    id: 'large',
    name: 'Pro',
    credits: 1000,
    price: 70,
    icon: 'rocket' as const,
    features: ['Все из Popular', 'Scheduled AI Analysis', 'Расширенная аналитика', 'Приоритетная обработка']
  },
];

export const CreditsPanelEnhanced = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentSessionId, setPaymentSessionId] = useState<string | null>(null);

  const { data: credits, refetch: refetchCredits } = useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['credit-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const totalCredits = (credits?.free_credits || 0) + (credits?.paid_credits || 0);

  const handlePurchase = async (packageId: string) => {
    try {
      setLoading(packageId);
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: { package_id: packageId }
      });

      if (error) throw error;

      if (data?.url) {
        // Extract session ID from URL if available
        const url = new URL(data.url);
        const sessionId = url.searchParams.get('session_id');
        if (sessionId) {
          setPaymentSessionId(sessionId);
        }
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать платеж',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRefresh = () => {
    refetchCredits();
    refetchTransactions();
    toast({
      title: 'Обновлено',
      description: 'Данные успешно обновлены',
    });
  };

  return (
    <div className="space-y-6">
      {/* Payment Status */}
      {paymentSessionId && (
        <PaymentStatus
          sessionId={paymentSessionId}
          onSuccess={() => {
            setPaymentSessionId(null);
            refetchCredits();
            refetchTransactions();
          }}
        />
      )}

      {/* Баланс */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                Баланс кредитов
              </CardTitle>
              <CardDescription>
                Используйте кредиты для AI функций
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Обновить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
              <p className="text-4xl font-bold text-primary">{totalCredits.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Всего</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20">
              <p className="text-3xl font-semibold text-green-600">{(credits?.free_credits || 0).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Бесплатные</p>
            </div>
            <div className="text-center p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20">
              <p className="text-3xl font-semibold text-blue-600">{(credits?.paid_credits || 0).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Платные</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Пакеты и Подписки */}
      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="packages">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Разовая покупка
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <CreditCard className="h-4 w-4 mr-2" />
            Подписки
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CREDIT_PACKAGES.map((pkg) => (
              <PricingCard
                key={pkg.id}
                id={pkg.id}
                name={pkg.name}
                credits={pkg.credits}
                price={pkg.price}
                popular={pkg.popular}
                features={pkg.features}
                icon={pkg.icon}
                onPurchase={handlePurchase}
                loading={loading === pkg.id}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="subscriptions" className="mt-6">
          <SubscriptionPlans />
        </TabsContent>
      </Tabs>

      {/* История */}
      <Card>
        <CardHeader>
          <CardTitle>История транзакций</CardTitle>
          <CardDescription>
            Последние {transactions?.length || 0} транзакций
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {transactions && transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {tx.amount > 0 ? (
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-950/20">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                      ) : (
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/20">
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{tx.description || tx.transaction_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        Баланс: {tx.balance_after}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">История транзакций пуста</p>
                <p className="text-sm mt-2">Купите кредиты, чтобы начать использовать AI функции</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
