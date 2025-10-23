import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Upload, Clipboard, Sparkles, Database, Loader2, CheckCircle, AlertTriangle, CreditCard, Clock, Edit2, Link2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnounce } from '@/components/accessibility/LiveAnnouncer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { SchemaEditor } from './SchemaEditor';
import { SchemaStepper } from './SchemaStepper';
import { RelationshipPreview } from './RelationshipPreview';
import { useSchemaAutoSave } from './useSchemaAutoSave';
import {
  validateInputStep,
  validatePreviewStep,
  validateEditStep,
  validateCredits,
  ValidationResult
} from './validation';
import { GeneratedSchema, StepId } from './types';

interface SchemaGeneratorDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

const STEPS = [
  { id: 'input' as StepId, title: 'Ввод данных', description: 'Опишите схему' },
  { id: 'preview' as StepId, title: 'Просмотр', description: 'Проверьте результат' },
  { id: 'edit' as StepId, title: 'Редактирование', description: 'Настройте детали' },
  { id: 'creating' as StepId, title: 'Создание', description: 'Финальный шаг' },
];

export function SchemaGeneratorDialog({ open, onClose, projectId }: SchemaGeneratorDialogProps) {
  const { user } = useAuth();
  const announce = useAnnounce();
  const [step, setStep] = useState<StepId>('input');
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);
  const [inputType, setInputType] = useState<'text' | 'json' | 'csv'>('text');
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<GeneratedSchema | null>(null);
  const [errorDetails, setErrorDetails] = useState<{type: string; message: string} | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showRelationships, setShowRelationships] = useState(false);

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

  // Auto-save functionality
  const { loadData, clearData } = useSchemaAutoSave({
    projectId,
    step,
    inputType,
    textInput,
    generatedSchema,
    enabled: open,
  });

  // Load saved data on dialog open
  useEffect(() => {
    if (open) {
      const savedData = loadData();
      if (savedData) {
        setStep(savedData.step);
        setInputType(savedData.inputType);
        setTextInput(savedData.textInput);
        setGeneratedSchema(savedData.generatedSchema);

        toast.success('Восстановлен сохраненный прогресс', {
          description: 'Продолжайте с того места, где остановились',
          action: {
            label: 'Начать заново',
            onClick: () => {
              clearData();
              handleClose();
            },
          },
        });
      }
    }
  }, [open]);

  // Validate current step
  useEffect(() => {
    let result: ValidationResult | null = null;

    switch (step) {
      case 'input':
        result = validateInputStep(inputType, textInput, fileInput);
        break;
      case 'preview':
        result = validatePreviewStep(generatedSchema);
        break;
      case 'edit':
        result = validateEditStep(generatedSchema);
        break;
      default:
        result = null;
    }

    setValidationResult(result);
  }, [step, inputType, textInput, fileInput, generatedSchema]);

  // Temporarily disable templates until table is created
  const templates: any[] = [];

  // Analyze schema with AI
  const analyzeMutation = useMutation({
    mutationFn: async (input: { type: string; data: string }) => {
      announce('Начинается генерация схемы с помощью AI', 'polite');
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
      setCompletedSteps(prev => [...new Set([...prev, 'input'])]);
      setErrorDetails(null);
      toast.success('Схема сгенерирована AI');
      announce('Схема успешно сгенерирована. Переход к просмотру результата', 'assertive');
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
        announce('Ошибка: превышен лимит запросов к AI. Подождите минуту', 'assertive');
      } else if (errorMessage.includes('402') || errorMessage.toLowerCase().includes('credits') || errorMessage.toLowerCase().includes('insufficient')) {
        const totalCredits = (credits?.free_credits || 0) + (credits?.paid_credits || 0);
        setErrorDetails({
          type: 'insufficient_credits',
          message: `У вас недостаточно AI кредитов (доступно: ${totalCredits.toFixed(2)}). Для генерации схемы требуется 20 кредитов.`
        });
        toast.error('Недостаточно кредитов', {
          description: 'Пополните баланс для продолжения работы.'
        });
        announce('Ошибка: недостаточно AI кредитов для генерации схемы', 'assertive');
      } else {
        setErrorDetails({
          type: 'general',
          message: errorMessage || 'Произошла ошибка при анализе схемы'
        });
        toast.error('Ошибка анализа', {
          description: errorMessage
        });
        announce(`Ошибка при анализе схемы: ${errorMessage}`, 'assertive');
      }
    },
  });

  // Create schema
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!generatedSchema) throw new Error('No schema');

      announce('Начинается создание таблиц в базе данных', 'polite');
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
      announce('Таблицы успешно созданы в базе данных', 'assertive');
      handleClose();
    },
    onError: (error: any) => {
      if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
        toast.error('Превышен лимит запросов', {
          description: 'Слишком много запросов. Пожалуйста, попробуйте через минуту.'
        });
        announce('Ошибка: превышен лимит запросов при создании таблиц', 'assertive');
      } else if (error.message?.includes('402') || error.message?.includes('credits')) {
        toast.error('Недостаточно кредитов', {
          description: 'Пополните баланс кредитов в настройках для продолжения работы.'
        });
        announce('Ошибка: недостаточно кредитов для создания таблиц', 'assertive');
      } else {
        toast.error(error.message || 'Ошибка создания таблиц');
        announce(`Ошибка при создании таблиц: ${error.message || 'Неизвестная ошибка'}`, 'assertive');
      }
    },
  });

  const handleClose = () => {
    setStep('input');
    setCompletedSteps([]);
    setTextInput('');
    setFileInput(null);
    setGeneratedSchema(null);
    setErrorDetails(null);
    setValidationResult(null);
    setShowRelationships(false);
    clearData();
    onClose();
  };

  const handleNextStep = () => {
    // Validate before moving to next step
    if (validationResult && !validationResult.isValid) {
      toast.error('Исправьте ошибки перед продолжением', {
        description: validationResult.errors[0],
      });
      return;
    }

    // Mark current step as completed
    setCompletedSteps(prev => [...new Set([...prev, step])]);

    // Move to next step
    const stepMap: Record<StepId, StepId> = {
      input: 'preview',
      preview: 'edit',
      edit: 'creating',
      creating: 'creating', // Stay on creating
    };

    setStep(stepMap[step]);
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Умный генератор схем
          </DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        {step !== 'creating' && (
          <SchemaStepper steps={STEPS} currentStep={step} completedSteps={completedSteps} />
        )}

        {/* Validation Messages */}
        {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
          <div className="space-y-2">
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Ошибки валидации</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {validationResult.warnings.length > 0 && (
              <Alert variant="default" className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-700 dark:text-yellow-500">Предупреждения</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {validationResult.warnings.map((warning, idx) => (
                      <li key={idx} className="text-yellow-700 dark:text-yellow-400">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

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
            {/* View Tabs */}
            <Tabs defaultValue="entities" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entities">
                  <Database className="h-4 w-4 mr-2" />
                  Таблицы ({generatedSchema.entities.length})
                </TabsTrigger>
                <TabsTrigger value="relationships">
                  <Link2 className="h-4 w-4 mr-2" />
                  Связи ({generatedSchema.relationships.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="entities" className="space-y-4 mt-4">
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

              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="relationships" className="space-y-4 mt-4">
            <RelationshipPreview schema={generatedSchema} />
          </TabsContent>
        </Tabs>
      </div>
    )}

        {step === 'edit' && generatedSchema && (
          <div className="space-y-4">
            <Alert>
              <AlertTitle>Редактирование схемы</AlertTitle>
              <AlertDescription>
                Вы можете изменить названия таблиц и колонок, типы данных, добавить или удалить колонки.
              </AlertDescription>
            </Alert>

            <SchemaEditor
              schema={generatedSchema}
              onChange={setGeneratedSchema}
            />
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
                variant="outline"
                onClick={() => setStep('edit')}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Редактировать
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

          {step === 'edit' && (
            <>
              <Button variant="outline" onClick={() => setStep('preview')}>
                Назад к просмотру
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
