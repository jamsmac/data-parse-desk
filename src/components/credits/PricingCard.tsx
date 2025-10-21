import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Zap, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingCardProps {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  features?: string[];
  icon?: 'sparkles' | 'zap' | 'rocket';
  onPurchase: (id: string) => void;
  loading?: boolean;
}

const ICONS = {
  sparkles: Sparkles,
  zap: Zap,
  rocket: Rocket,
};

export function PricingCard({
  id,
  name,
  credits,
  price,
  popular = false,
  features = [],
  icon = 'sparkles',
  onPurchase,
  loading = false,
}: PricingCardProps) {
  const Icon = ICONS[icon];
  const pricePerCredit = (price / credits).toFixed(3);

  return (
    <Card
      className={cn(
        'relative transition-all duration-300 hover:shadow-xl',
        popular && 'border-primary border-2 shadow-lg scale-105'
      )}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-1">
            🔥 Популярный выбор
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>Пакет AI кредитов</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Price */}
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold tracking-tight">${price}</span>
            <span className="text-muted-foreground text-sm">USD</span>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              {credits} кредитов
            </Badge>
            <span className="text-xs text-muted-foreground">
              ${pricePerCredit}/кредит
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>{credits} AI кредитов</span>
          </div>
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-green-600" />
              <span>{feature}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>Никогда не истекают</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600" />
            <span>Мгновенное зачисление</span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => onPurchase(id)}
          disabled={loading}
          variant={popular ? 'default' : 'outline'}
          className={cn(
            'w-full',
            popular && 'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70'
          )}
          size="lg"
        >
          {loading ? 'Обработка...' : 'Купить пакет'}
        </Button>
      </CardFooter>
    </Card>
  );
}
