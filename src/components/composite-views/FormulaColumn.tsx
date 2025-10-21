import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calculator, History, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface FormulaColumnProps {
  data: {
    expression: string;
    result: any;
    return_type: 'text' | 'number' | 'boolean' | 'date';
    dependencies?: string[];
    calculated_at?: string;
  };
  compositeViewId: string;
  rowIdentifier: string;
  columnName: string;
  onRecalculate?: () => Promise<void>;
  readOnly?: boolean;
}

export function FormulaColumn({
  data,
  compositeViewId,
  rowIdentifier,
  columnName,
  onRecalculate,
  readOnly = false
}: FormulaColumnProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // Load calculation history
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['formula-history', compositeViewId, rowIdentifier, columnName],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_formula_calculation_history', {
        p_composite_view_id: compositeViewId,
        p_row_identifier: rowIdentifier,
        p_column_name: columnName,
        p_limit: 10
      });

      if (error) {
        console.error('Error loading formula history:', error);
        return [];
      }

      return data || [];
    },
    enabled: showHistory
  });

  const handleRecalculate = async () => {
    if (!onRecalculate) return;

    setRecalculating(true);
    try {
      await onRecalculate();
      toast.success('Формула пересчитана');
      refetchHistory();
    } catch (error) {
      console.error('Error recalculating formula:', error);
      toast.error('Ошибка пересчета формулы');
    } finally {
      setRecalculating(false);
    }
  };

  const formatResult = (result: any, returnType: string) => {
    if (result === null || result === undefined) {
      return <span className="text-muted-foreground">—</span>;
    }

    switch (returnType) {
      case 'number':
        return typeof result === 'number'
          ? result.toLocaleString('ru-RU', { maximumFractionDigits: 2 })
          : result;

      case 'boolean':
        return (
          <Badge variant={result ? 'default' : 'secondary'}>
            {result ? 'Да' : 'Нет'}
          </Badge>
        );

      case 'date':
        try {
          const date = new Date(result);
          return format(date, 'PPp', { locale: ru });
        } catch {
          return result;
        }

      default:
        return result;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Result display */}
      <div className="flex-1">
        {formatResult(data.result, data.return_type)}
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        {/* Recalculate button */}
        {!readOnly && onRecalculate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRecalculate}
            disabled={recalculating}
            title="Пересчитать формулу"
          >
            <RefreshCw className={`h-3 w-3 ${recalculating ? 'animate-spin' : ''}`} />
          </Button>
        )}

        {/* History dialog */}
        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              title="История вычислений"
            >
              <History className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                История вычислений
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Formula info */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">Формула:</div>
                <code className="text-sm bg-background px-2 py-1 rounded">
                  {data.expression}
                </code>
                {data.dependencies && data.dependencies.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-muted-foreground">Зависимости:</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.dependencies.map(dep => (
                        <Badge key={dep} variant="outline" className="text-xs">
                          {dep}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Current result */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Текущий результат:</div>
                    <div className="text-lg mt-1">
                      {formatResult(data.result, data.return_type)}
                    </div>
                  </div>
                  {data.calculated_at && (
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(data.calculated_at), 'PPp', { locale: ru })}
                    </div>
                  )}
                </div>
              </div>

              {/* History */}
              <div>
                <div className="text-sm font-medium mb-2">История вычислений:</div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {history && history.length > 0 ? (
                    history.map((calc: any, index: number) => (
                      <div
                        key={calc.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="text-sm">
                              {formatResult(calc.result, calc.return_type || data.return_type)}
                            </div>
                            {calc.calculation_time_ms && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Время вычисления: {calc.calculation_time_ms}ms
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            {format(new Date(calc.calculated_at), 'PPp', { locale: ru })}
                            {index === 0 && (
                              <Badge variant="secondary" className="ml-2">
                                Последнее
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      История вычислений пуста
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
