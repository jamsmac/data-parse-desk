import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Check, Database, FileSpreadsheet, Clock, ArrowRight, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ImportSuccessScreenProps {
  databaseName: string;
  fileName: string;
  recordsImported: number;
  columnsDetected: number;
  duration: number; // in milliseconds
  importedAt: Date;
  onViewData: () => void;
  onImportMore: () => void;
}

export function ImportSuccessScreen({
  databaseName,
  fileName,
  recordsImported,
  columnsDetected,
  duration,
  importedAt,
  onViewData,
  onImportMore,
}: ImportSuccessScreenProps) {
  useEffect(() => {
    // Trigger confetti animation on mount
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: NodeJS.Timeout = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}мс`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}с`;
    return `${Math.floor(ms / 60000)}м ${Math.floor((ms % 60000) / 1000)}с`;
  };

  return (
    <div className="flex items-center justify-center min-h-[600px] p-6">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4 pb-4">
          {/* Success Icon */}
          <div className="mx-auto w-20 h-20 bg-success/10 rounded-full flex items-center justify-center">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center animate-pulse">
              <Check className="w-10 h-10 text-success" strokeWidth={3} />
            </div>
          </div>

          <div>
            <CardTitle className="text-3xl mb-2">Данные успешно импортированы!</CardTitle>
            <CardDescription className="text-lg">
              Файл <span className="font-semibold text-foreground">{fileName}</span> обработан и сохранён
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Import Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Database className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{recordsImported.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Записей</div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{columnsDetected}</div>
              <div className="text-xs text-muted-foreground">Колонок</div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{formatDuration(duration)}</div>
              <div className="text-xs text-muted-foreground">Время</div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Check className="w-8 h-8 mx-auto mb-2 text-success" />
              <div className="text-2xl font-bold">100%</div>
              <div className="text-xs text-muted-foreground">Успешно</div>
            </div>
          </div>

          {/* Database Info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-foreground mb-1">
                  База данных: {databaseName}
                </div>
                <div className="text-sm text-muted-foreground">
                  Импортировано {formatDistanceToNow(importedAt, { addSuffix: true, locale: ru })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              size="lg"
              className="flex-1"
              onClick={onViewData}
            >
              Просмотреть данные
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="flex-1"
              onClick={onImportMore}
            >
              <Upload className="mr-2 h-5 w-5" />
              Импортировать ещё
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-center text-sm text-muted-foreground pt-2 border-t">
            💡 Совет: Вы можете редактировать данные, добавлять фильтры и настраивать представления
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
