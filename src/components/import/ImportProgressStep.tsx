import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export interface ImportProgressStepProps {
  uploading?: boolean;
  parsing?: boolean;
  error?: string | null;
  success?: boolean;
  progressMessage?: string;
  successMessage?: string;
}

export const ImportProgressStep: React.FC<ImportProgressStepProps> = ({
  uploading = false,
  parsing = false,
  error = null,
  success = false,
  progressMessage,
  successMessage,
}) => {
  const isProcessing = uploading || parsing;
  const currentMessage = progressMessage || (parsing ? 'Парсинг файла...' : uploading ? 'Загрузка данных...' : '');

  return (
    <div className="space-y-4">
      {/* Processing State */}
      {isProcessing && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{currentMessage}</p>
              <Progress value={undefined} className="w-full" />
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && !isProcessing && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success State */}
      {success && !isProcessing && !error && (
        <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            {successMessage || 'Операция выполнена успешно!'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
