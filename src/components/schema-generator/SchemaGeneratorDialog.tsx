import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, CheckCircle, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnounce } from '@/components/accessibility/LiveAnnouncer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SchemaStepper } from './SchemaStepper';
import { useSchemaAutoSave } from './useSchemaAutoSave';
import { SchemaInputStep } from './SchemaInputStep';
import { SchemaPreviewStep } from './SchemaPreviewStep';
import { SchemaEditStep } from './SchemaEditStep';
import { SchemaCreatingStep } from './SchemaCreatingStep';
import {
  validateInputStep,
  validatePreviewStep,
  validateEditStep,
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

interface ErrorDetails {
  type: 'rate_limit' | 'insufficient_credits' | 'general';
  message: string;
}

export function SchemaGeneratorDialog({ open, onClose, projectId }: SchemaGeneratorDialogProps) {
  const { user } = useAuth();
  const announce = useAnnounce();
  const [step, setStep] = useState<StepId>('input');
  const [completedSteps, setCompletedSteps] = useState<StepId[]>([]);
  const [inputType, setInputType] = useState<'text' | 'json' | 'csv'>('text');
  const [textInput, setTextInput] = useState('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [generatedSchema, setGeneratedSchema] = useState<GeneratedSchema | null>(null);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

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
    clearData();
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

  const handleCreateTables = () => {
    setStep('creating');
    createMutation.mutate();
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

        {/* Step Content */}
        {step === 'input' && (
          <SchemaInputStep
            inputType={inputType}
            textInput={textInput}
            fileInput={fileInput}
            credits={credits}
            errorDetails={errorDetails}
            onInputTypeChange={setInputType}
            onTextInputChange={setTextInput}
            onFileInputChange={setFileInput}
          />
        )}

        {step === 'preview' && generatedSchema && (
          <SchemaPreviewStep generatedSchema={generatedSchema} />
        )}

        {step === 'edit' && generatedSchema && (
          <SchemaEditStep
            generatedSchema={generatedSchema}
            onSchemaChange={setGeneratedSchema}
          />
        )}

        {step === 'creating' && (
          <SchemaCreatingStep
            creating={createMutation.isPending}
            error={createMutation.error?.message || null}
            success={createMutation.isSuccess}
          />
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
                onClick={handleCreateTables}
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
                onClick={handleCreateTables}
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
