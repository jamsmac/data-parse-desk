import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FileText, Upload, Clipboard, CreditCard, Clock, AlertTriangle } from 'lucide-react';

interface UserCredits {
  free_credits: number;
  paid_credits: number;
}

interface ErrorDetails {
  type: 'rate_limit' | 'insufficient_credits' | 'general';
  message: string;
}

interface SchemaInputStepProps {
  inputType: 'text' | 'json' | 'csv';
  textInput: string;
  fileInput: File | null;
  credits: UserCredits | null;
  errorDetails: ErrorDetails | null;
  onInputTypeChange: (type: 'text' | 'json' | 'csv') => void;
  onTextInputChange: (value: string) => void;
  onFileInputChange: (file: File | null) => void;
}

export function SchemaInputStep({
  inputType,
  textInput,
  fileInput,
  credits,
  errorDetails,
  onInputTypeChange,
  onTextInputChange,
  onFileInputChange,
}: SchemaInputStepProps) {
  const totalCredits = credits
    ? (credits.free_credits || 0) + (credits.paid_credits || 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {errorDetails && (
        <Alert variant={errorDetails.type === 'rate_limit' ? 'default' : 'destructive'}>
          {errorDetails.type === 'rate_limit' && <Clock className="h-4 w-4" />}
          {errorDetails.type === 'insufficient_credits' && <CreditCard className="h-4 w-4" />}
          {errorDetails.type === 'general' && <AlertTriangle className="h-4 w-4" />}
          <AlertTitle>
            {errorDetails.type === 'rate_limit' && 'Превышен лимит запросов'}
            {errorDetails.type === 'insufficient_credits' && 'Недостаточно AI кредитов'}
            {errorDetails.type === 'general' && 'Ошибка'}
          </AlertTitle>
          <AlertDescription>
            {errorDetails.message}
            {errorDetails.type === 'insufficient_credits' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => window.open('/settings?tab=credits', '_blank')}
              >
                <CreditCard className="h-3 w-3 mr-1" />
                Пополнить баланс
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Credits Display */}
      {credits && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Доступно AI кредитов</p>
                <p className="text-xs text-muted-foreground">
                  Генерация схемы: 20 кредитов
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {totalCredits.toFixed(2)}
                </p>
                <div className="flex gap-1 text-xs text-muted-foreground">
                  <span>{(credits.free_credits || 0).toFixed(2)} бесплатных</span>
                  <span>+</span>
                  <span>{(credits.paid_credits || 0).toFixed(2)} платных</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates - Temporarily disabled */}
      {/* Templates section can be added here when ready */}

      {/* Input Methods */}
      <div className="space-y-3">
        <Label>Создайте новую схему</Label>
        <Tabs value={inputType} onValueChange={(v: any) => onInputTypeChange(v)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">
              <FileText className="h-4 w-4 mr-2" />
              Текст
            </TabsTrigger>
            <TabsTrigger value="json">
              <Upload className="h-4 w-4 mr-2" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="csv">
              <Clipboard className="h-4 w-4 mr-2" />
              CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3">
            <Textarea
              placeholder="Опишите структуру ваших данных, например:&#10;&#10;Мне нужна CRM система с клиентами, сделками и активностями. &#10;У клиентов есть имя, email, телефон.&#10;Сделки привязаны к клиентам и имеют сумму, статус, дату закрытия.&#10;Активности могут быть связаны с клиентами или сделками."
              value={textInput}
              onChange={(e) => onTextInputChange(e.target.value)}
              rows={10}
            />
          </TabsContent>

          <TabsContent value="json" className="space-y-3">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".json"
                onChange={(e) => onFileInputChange(e.target.files?.[0] || null)}
                className="max-w-xs mx-auto"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Загрузите JSON файл с примером ваших данных
              </p>
              {fileInput && (
                <Badge variant="secondary" className="mt-2">
                  {fileInput.name}
                </Badge>
              )}
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-3">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => onFileInputChange(e.target.files?.[0] || null)}
                className="max-w-xs mx-auto"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Загрузите CSV файл для анализа структуры
              </p>
              {fileInput && (
                <Badge variant="secondary" className="mt-2">
                  {fileInput.name}
                </Badge>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
