import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SchemaCreatingStepProps {
  creating: boolean;
  error: string | null;
  success: boolean;
}

export function SchemaCreatingStep({ creating, error, success }: SchemaCreatingStepProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Ошибка создания</h3>
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Произошла ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Таблицы созданы успешно!</h3>
        <p className="text-sm text-muted-foreground">
          Ваша схема базы данных готова к использованию
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h3 className="text-lg font-semibold mb-2">Создание таблиц...</h3>
      <p className="text-sm text-muted-foreground">
        Это может занять несколько секунд
      </p>
    </div>
  );
}
