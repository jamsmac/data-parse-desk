import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Coins, TrendingUp, TrendingDown, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const CREDIT_PACKAGES = [
  { credits: 100, price: 5, label: 'Стартовый' },
  { credits: 500, price: 20, label: 'Базовый', popular: true },
  { credits: 1000, price: 35, label: 'Профессиональный' },
  { credits: 5000, price: 150, label: 'Корпоративный' },
];

export const CreditsPanel = () => {
  const { user } = useAuth();

  const { data: credits } = useQuery({
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
  });

  const { data: transactions } = useQuery({
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
  });

  const totalCredits = (credits?.free_credits || 0) + (credits?.paid_credits || 0);

  const handlePurchase = (packageItem: typeof CREDIT_PACKAGES[0]) => {
    // TODO: Интеграция со Stripe
    console.log('Purchase:', packageItem);
  };

  return (
    <div className="space-y-6">
      {/* Баланс */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Баланс кредитов
          </CardTitle>
          <CardDescription>
            Используйте кредиты для AI функций
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-3xl font-bold text-primary">{totalCredits.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Всего</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-semibold text-green-600">{(credits?.free_credits || 0).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Бесплатные</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-semibold text-blue-600">{(credits?.paid_credits || 0).toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-1">Платные</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Пакеты */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Купить кредиты
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {CREDIT_PACKAGES.map((pkg) => (
              <div
                key={pkg.credits}
                className={`border rounded-lg p-4 space-y-3 ${
                  pkg.popular ? 'border-primary shadow-lg' : ''
                }`}
              >
                {pkg.popular && (
                  <Badge className="mb-2">Популярный</Badge>
                )}
                <div>
                  <p className="text-2xl font-bold">{pkg.credits}</p>
                  <p className="text-sm text-muted-foreground">кредитов</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">${pkg.price}</p>
                  <p className="text-xs text-muted-foreground">
                    ${(pkg.price / pkg.credits).toFixed(3)} за кредит
                  </p>
                </div>
                <Button
                  onClick={() => handlePurchase(pkg)}
                  variant={pkg.popular ? 'default' : 'outline'}
                  className="w-full"
                >
                  Купить
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* История */}
      <Card>
        <CardHeader>
          <CardTitle>История транзакций</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {transactions && transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {tx.amount > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <p className="font-medium">{tx.description || tx.transaction_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Баланс: {tx.balance_after}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                История транзакций пуста
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};
