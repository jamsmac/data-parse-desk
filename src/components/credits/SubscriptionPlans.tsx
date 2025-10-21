import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, Crown, Star, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  credits: number;
  features: string[];
  icon: 'star' | 'zap' | 'crown';
  popular?: boolean;
  savings?: string;
}

const MONTHLY_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter_monthly',
    name: 'Starter',
    price: 15,
    interval: 'month',
    credits: 200,
    icon: 'star',
    features: [
      '200 AI кредитов/месяц',
      'Базовая аналитика',
      'Импорт/экспорт данных',
      'Email поддержка',
    ],
  },
  {
    id: 'pro_monthly',
    name: 'Professional',
    price: 49,
    interval: 'month',
    credits: 750,
    icon: 'zap',
    popular: true,
    features: [
      '750 AI кредитов/месяц',
      'Расширенная аналитика',
      'Приоритетная поддержка',
      'Composite Views',
      'Telegram интеграция',
      'Без лимитов на проекты',
    ],
  },
  {
    id: 'enterprise_monthly',
    name: 'Enterprise',
    price: 149,
    interval: 'month',
    credits: 2500,
    icon: 'crown',
    features: [
      '2500 AI кредитов/месяц',
      'Неограниченные проекты',
      'Выделенный менеджер',
      'API доступ',
      'Webhooks',
      'SSO авторизация',
      'Кастомная интеграция',
    ],
  },
];

const YEARLY_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter_yearly',
    name: 'Starter',
    price: 144,
    interval: 'year',
    credits: 200,
    icon: 'star',
    savings: 'Экономия $36/год',
    features: [
      '200 AI кредитов/месяц',
      'Базовая аналитика',
      'Импорт/экспорт данных',
      'Email поддержка',
      '2 месяца бесплатно',
    ],
  },
  {
    id: 'pro_yearly',
    name: 'Professional',
    price: 470,
    interval: 'year',
    credits: 750,
    icon: 'zap',
    popular: true,
    savings: 'Экономия $118/год',
    features: [
      '750 AI кредитов/месяц',
      'Расширенная аналитика',
      'Приоритетная поддержка',
      'Composite Views',
      'Telegram интеграция',
      'Без лимитов на проекты',
      '2 месяца бесплатно',
    ],
  },
  {
    id: 'enterprise_yearly',
    name: 'Enterprise',
    price: 1430,
    interval: 'year',
    credits: 2500,
    icon: 'crown',
    savings: 'Экономия $358/год',
    features: [
      '2500 AI кредитов/месяц',
      'Неограниченные проекты',
      'Выделенный менеджер',
      'API доступ',
      'Webhooks',
      'SSO авторизация',
      'Кастомная интеграция',
      '2 месяца бесплатно',
    ],
  },
];

const ICONS = {
  star: Star,
  zap: Zap,
  crown: Crown,
};

export function SubscriptionPlans() {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const plans = billingInterval === 'month' ? MONTHLY_PLANS : YEARLY_PLANS;

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(planId);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { price_id: planId },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать подписку',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <Tabs value={billingInterval} onValueChange={(v) => setBillingInterval(v as 'month' | 'year')}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="month">Помесячно</TabsTrigger>
            <TabsTrigger value="year">
              Ежегодно
              <Badge variant="secondary" className="ml-2 text-xs">
                -20%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {plans.map((plan) => {
          const Icon = ICONS[plan.icon];
          const monthlyPrice = plan.interval === 'year' ? (plan.price / 12).toFixed(0) : plan.price;

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative transition-all duration-300 hover:shadow-xl',
                plan.popular && 'border-primary border-2 shadow-lg scale-105'
              )}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-1">
                    🔥 Рекомендуем
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  {plan.credits} кредитов/месяц
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold tracking-tight">${monthlyPrice}</span>
                    <span className="text-muted-foreground text-sm">/мес</span>
                  </div>
                  {plan.interval === 'year' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      оплата ${plan.price}/год
                    </p>
                  )}
                  {plan.savings && (
                    <Badge variant="outline" className="mt-2 text-xs text-green-600">
                      {plan.savings}
                    </Badge>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  variant={plan.popular ? 'default' : 'outline'}
                  className={cn(
                    'w-full',
                    plan.popular && 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70'
                  )}
                  size="lg"
                >
                  {loading === plan.id ? 'Обработка...' : 'Подписаться'}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        <p>
          Все планы включают базовые функции платформы. Вы можете отменить подписку в любое время.
          Кредиты не переносятся на следующий месяц.
        </p>
      </div>
    </div>
  );
}
