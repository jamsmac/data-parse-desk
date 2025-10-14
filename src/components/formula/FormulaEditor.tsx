import React, { useState, useMemo } from 'react';
import { Calculator, Info, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { validateFormula, FORMULA_FUNCTIONS } from '@/utils/formulaEngine';
import type { TableSchema } from '@/types/database';

interface FormulaEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formula: string;
  onSave: (formula: string) => void;
  columns: TableSchema[];
}

export const FormulaEditor: React.FC<FormulaEditorProps> = ({
  open,
  onOpenChange,
  formula: initialFormula,
  onSave,
  columns,
}) => {
  const [formula, setFormula] = useState(initialFormula);
  const [selectedFunction, setSelectedFunction] = useState<string | null>(null);

  // Валидация формулы
  const validation = useMemo(() => {
    if (!formula.trim()) {
      return { isValid: true, errors: [] };
    }
    
    try {
      const columnNames = columns.map(col => col.column_name);
      const config = {
        expression: formula,
        return_type: 'text' as const,
        dependencies: columnNames,
      };
      const result = validateFormula(config);
      return result;
    } catch (error) {
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Неизвестная ошибка'],
      };
    }
  }, [formula, columns]);

  const handleSave = () => {
    if (validation.isValid) {
      onSave(formula);
      onOpenChange(false);
    }
  };

  const insertFunction = (funcName: string) => {
    const func = FORMULA_FUNCTIONS.find(f => f.name === funcName);
    if (!func) return;

    const placeholder = `${funcName}(${func.params.map((p, i) => `arg${i + 1}`).join(', ')})`;
    setFormula(prev => prev + (prev ? ' ' : '') + placeholder);
  };

  const insertColumn = (columnName: string) => {
    setFormula(prev => prev + (prev ? ' ' : '') + `{${columnName}}`);
  };

  // Группируем функции по категориям
  const functionsByCategory = useMemo(() => {
    const categories: Record<string, typeof FORMULA_FUNCTIONS> = {
      math: [],
      string: [],
      date: [],
      logical: [],
      aggregate: [],
    };

    FORMULA_FUNCTIONS.forEach(func => {
      if (categories[func.category]) {
        categories[func.category].push(func);
      }
    });

    return categories;
  }, []);

  const categoryNames = {
    math: 'Математические',
    string: 'Строковые',
    date: 'Дата и время',
    logical: 'Логические',
    aggregate: 'Агрегатные',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Редактор формул
          </DialogTitle>
          <DialogDescription>
            Создайте формулу используя функции и колонки
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 h-[500px]">
          {/* Левая панель - Функции */}
          <div className="col-span-1 border-r pr-4">
            <h3 className="text-sm font-medium mb-3">Функции</h3>
            <Tabs defaultValue="math" className="w-full">
              <TabsList className="w-full grid grid-cols-2 h-auto">
                <TabsTrigger value="math" className="text-xs">Мат.</TabsTrigger>
                <TabsTrigger value="string" className="text-xs">Строки</TabsTrigger>
                <TabsTrigger value="date" className="text-xs">Даты</TabsTrigger>
                <TabsTrigger value="logical" className="text-xs">Логика</TabsTrigger>
              </TabsList>

              {Object.entries(functionsByCategory).map(([category, functions]) => (
                <TabsContent key={category} value={category} className="mt-2">
                  <ScrollArea className="h-64">
                    <div className="space-y-1">
                      {functions.map(func => (
                        <button
                          key={func.name}
                          onClick={() => {
                            setSelectedFunction(func.name);
                            insertFunction(func.name);
                          }}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-sm transition-colors"
                        >
                          <div className="font-medium text-primary">{func.name}</div>
                          <div className="text-xs text-gray-500 truncate">{func.description}</div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Колонки</h3>
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {columns.map(col => (
                    <button
                      key={col.id}
                      onClick={() => insertColumn(col.column_name)}
                      className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{col.column_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {col.column_type}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Центральная панель - Редактор */}
          <div className="col-span-2 flex flex-col">
            <div className="mb-3">
              <label className="text-sm font-medium mb-2 block">Формула</label>
              <Textarea
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                placeholder="Введите формулу, например: SUM({price} * {quantity})"
                className="font-mono text-sm h-32 resize-none"
              />
            </div>

            {/* Валидация */}
            {formula && (
              <div className="mb-3">
                {validation.isValid ? (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-600">
                      Формула корректна
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {validation.errors.join(', ')}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Информация о выбранной функции */}
            {selectedFunction && (
              <div className="flex-1 border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start gap-2 mb-2">
                  <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div className="flex-1">
                    {(() => {
                      const func = FORMULA_FUNCTIONS.find(f => f.name === selectedFunction);
                      if (!func) return null;

                      return (
                        <>
                          <h4 className="font-medium text-sm mb-1">{func.name}</h4>
                          <p className="text-sm text-gray-600 mb-3">{func.description}</p>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium text-gray-500">Синтаксис:</span>
                              <code className="block mt-1 p-2 bg-white rounded text-sm font-mono">
                                {func.name}({func.params.map((p, i) => `${p.name}: ${p.type}`).join(', ')})
                              </code>
                            </div>

                            <div>
                              <span className="text-xs font-medium text-gray-500">Параметры:</span>
                              <ul className="mt-1 space-y-1">
                                {func.params.map((param, idx) => (
                                  <li key={idx} className="text-xs">
                                    <span className="font-medium">{param.name}</span>
                                    <span className="text-gray-500"> ({param.type})</span>
                                    {param.optional && <span className="text-gray-400"> - необязательный</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {func.examples && func.examples.length > 0 && (
                              <div>
                                <span className="text-xs font-medium text-gray-500">Примеры:</span>
                                <div className="mt-1 space-y-1">
                                  {func.examples.map((example, idx) => (
                                    <code key={idx} className="block p-2 bg-white rounded text-xs font-mono">
                                      {example}
                                    </code>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Подсказки */}
            {!selectedFunction && (
              <div className="flex-1 border rounded-lg p-4 bg-blue-50">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 mt-0.5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-sm mb-2 text-blue-900">Подсказки</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>Используйте фигурные скобки для ссылки на колонки: {'{column_name}'}</li>
                      <li>Комбинируйте функции для создания сложных формул</li>
                      <li>Формулы автоматически пересчитываются при изменении данных</li>
                      <li>Поддерживаются математические операторы: +, -, *, /, %</li>
                      <li>Поддерживаются операторы сравнения: {'<, >, <=, >=, ==, !='}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={!validation.isValid || !formula.trim()}>
            Сохранить формулу
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
