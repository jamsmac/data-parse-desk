import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Upload, Clipboard, Sparkles, Database, Loader2, CheckCircle, AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface SchemaGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

interface SchemaEntity {
  name: string;
  confidence: number;
  reasoning?: string;
  columns: Array<{
    name: string;
    type: string;
    primary_key?: boolean;
    nullable?: boolean;
    unique?: boolean;
    default?: string;
    references?: string;
  }>;
}

interface GeneratedSchema {
  entities: SchemaEntity[];
  relationships: Array<{
    from: string;
    to: string;
    type: string;
    on: string;
    confidence: number;
  }>;
  indexes?: Array<{
    table: string;
    columns: string[];
    reason: string;
  }>;
  warnings?: string[];
}

export function SchemaGeneratorDialog({ open, onClose, projectId }: SchemaGeneratorDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'input' | 'preview' | 'creating'>('input');
  const [inputType, setInputType] = useState<'text' | 'json' | 'csv'>('text');
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<GeneratedSchema | null>(null);
  const [errorDetails, setErrorDetails] = useState<{type: string; message: string} | null>(null);

  // Load user credits
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
    enabled: !!user?.id && open,
  });

  // Temporarily disable templates until table is created
  const templates: any[] = [];

  // Analyze schema with AI
  const analyzeMutation = useMutation({
    mutationFn: async (input: { type: string; data: string }) => {
      const { data, error } = await supabase.functions.invoke('ai-analyze-schema', {
        body: {
          input: input.data,
          inputType: input.type,
          projectId,
        },
      });

      if (error) throw error;
      return data as GeneratedSchema;
    },
    onSuccess: (schema) => {
      setGeneratedSchema(schema);
      setStep('preview');
      setErrorDetails(null);
      toast.success('Схема сгенерирована AI');
    },
    onError: (error: any) => {
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
        setErrorDetails({
          type: 'rate_limit',
          message: 'Превышен лимит запросов к AI. Пожалуйста, подождите минуту перед следующей попыткой.'
        });
        toast.error('Слишком много запросов', {
          description: 'Превышен лимит. Подождите 60 секунд.'
        });
      } else if (errorMessage.includes('402') || errorMessage.toLowerCase().includes('credits') || errorMessage.toLowerCase().includes('insufficient')) {
        const totalCredits = (credits?.free_credits || 0) + (credits?.paid_credits || 0);
        setErrorDetails({
          type: 'insufficient_credits',
          message: `У вас недостаточно AI кредитов (доступно: ${totalCredits.toFixed(2)}). Для генерации схемы требуется 20 кредитов.`
        });
        toast.error('Недостаточно кредитов', {
          description: 'Пополните баланс для продолжения работы.'
        });
      } else {
        setErrorDetails({
          type: 'general',
          message: errorMessage || 'Произошла ошибка при анализе схемы'
        });
        toast.error('Ошибка анализа', {
          description: errorMessage
        });
      }
    },
  });

  // Create schema
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!generatedSchema) throw new Error('No schema');

      const { data, error } = await supabase.functions.invoke('ai-create-schema', {
        body: {
          projectId,
          schema: generatedSchema,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Таблицы созданы успешно');
      handleClose();
    },
    onError: (error: any) => {
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('Превышен лимит запросов', {
          description: 'Слишком много запросов. Пожалуйста, попробуйте через минуту.'
        });
      } else if (error.message?.includes('402') || error.message?.includes('credits')) {
        toast.error('Недостаточно кредитов', {
          description: 'Пополните баланс кредитов в настройках для продолжения работы.'
        });
      } else {
        toast.error(error.message || 'Ошибка создания таблиц');
      }
    },
  });

  const handleClose = () => {
    setStep('input');
    setTextInput('');
    setFileInput(null);
    setGeneratedSchema(null);
    setErrorDetails(null);
    onClose();
  };

  const handleAnalyze = async () => {
    if (inputType === 'text' && !textInput.trim()) {
      toast.error('Введите описание схемы');
      return;
    }

    if (inputType !== 'text' && !fileInput) {
      toast.error('Выберите файл');
      return;
    }

    let inputData = textInput;

    if (fileInput) {
      const text = await fileInput.text();
      inputData = text;
    }

    analyzeMutation.mutate({ type: inputType, data: inputData });
  };

  const handleUseTemplate = (template: any) => {
    setGeneratedSchema(template.schema);
    setStep('preview');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Умный генератор схем
          </DialogTitle>
        </DialogHeader>

        {step === 'input' && (
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
                        {((credits.free_credits || 0) + (credits.paid_credits || 0)).toFixed(2)}
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

            {/* Templates */}
            {templates && templates.length > 0 && (
              <div className="space-y-3">
                <Label>Готовые шаблоны</Label>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {template.category}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Input Methods */}
            <div className="space-y-3">
              <Label>Или создайте новую схему</Label>
              <Tabs value={inputType} onValueChange={(v: any) => setInputType(v)}>
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
                    onChange={(e) => setTextInput(e.target.value)}
                    rows={10}
                  />
                </TabsContent>

                <TabsContent value="json" className="space-y-3">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      accept=".json"
                      onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                      className="max-w-xs mx-auto"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Загрузите JSON файл с примером ваших данных
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="csv" className="space-y-3">
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={(e) => setFileInput(e.target.files?.[0] || null)}
                      className="max-w-xs mx-auto"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Загрузите CSV файл для анализа структуры
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {step === 'preview' && generatedSchema && (
          <div className="space-y-4">
            {/* Overall Confidence Score */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Общая уверенность AI</span>
                  <span className="text-sm font-bold">
                    {Math.round(generatedSchema.entities.reduce((sum, e) => sum + e.confidence, 0) / generatedSchema.entities.length)}%
                  </span>
                </div>
                <Progress 
                  value={generatedSchema.entities.reduce((sum, e) => sum + e.confidence, 0) / generatedSchema.entities.length} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {generatedSchema.entities.length} таблиц, {generatedSchema.relationships.length} связей
                </p>
              </CardContent>
            </Card>

            {/* Warnings - Show at top if present */}
            {generatedSchema.warnings && generatedSchema.warnings.length > 0 && (
              <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-700 dark:text-yellow-500">
                  Предупреждения ({generatedSchema.warnings.length})
                </AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {generatedSchema.warnings.map((warning, idx) => (
                      <li key={idx} className="text-yellow-700 dark:text-yellow-400">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="space-y-4">
                {/* Entities */}
                {generatedSchema.entities.map((entity, idx) => (
                  <Card key={idx} className={entity.confidence < 70 ? 'border-yellow-500/30' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          <CardTitle className="text-base">{entity.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {entity.confidence < 70 ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {entity.confidence}% низкая уверенность
                            </Badge>
                          ) : entity.confidence < 85 ? (
                            <Badge variant="secondary" className="text-xs">
                              {entity.confidence}% средняя уверенность
                            </Badge>
                          ) : (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {entity.confidence}% высокая уверенность
                            </Badge>
                          )}
                        </div>
                      </div>
                      {entity.reasoning && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          💡 {entity.reasoning}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1">
                        {entity.columns.map((col, colIdx) => (
                          <div key={colIdx} className="flex items-center gap-2 text-sm">
                            <span className="font-mono text-xs">{col.name}</span>
                            <Badge variant="outline" className="text-xs">{col.type}</Badge>
                            {col.primary_key && <Badge className="text-xs">PK</Badge>}
                            {col.unique && <Badge variant="secondary" className="text-xs">UNIQUE</Badge>}
                            {!col.nullable && <Badge variant="secondary" className="text-xs">NOT NULL</Badge>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Relationships */}
                {generatedSchema.relationships.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Связи</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {generatedSchema.relationships.map((rel, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">{rel.type}</Badge>
                            <span className="font-mono text-xs">
                              {rel.from} → {rel.to}
                            </span>
                            {rel.confidence < 70 ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {rel.confidence}%
                              </Badge>
                            ) : rel.confidence < 85 ? (
                              <Badge variant="secondary" className="text-xs">
                                {rel.confidence}%
                              </Badge>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {step === 'creating' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Создание таблиц...</h3>
            <p className="text-sm text-muted-foreground">
              Это может занять несколько секунд
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Анализ...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Анализировать с AI
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('input')}>
                Назад
              </Button>
              <Button
                onClick={() => {
                  setStep('creating');
                  createMutation.mutate();
                }}
                disabled={createMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Создать таблицы
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
