/**
 * Компонент редактора формул с подсветкой синтаксиса и автодополнением
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Calculator,
  Type,
  Calendar,
  ToggleLeft,
  Search,
  CheckCircle2,
  XCircle,
  Info,
  ChevronRight,
  Copy,
  Save
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  tokenizeForHighlight,
  getTokenColor,
  getSuggestions,
  getFunctionInfo,
  type HighlightToken
} from '@/utils/formulaHighlighter';
import {
  validateFormula,
  evaluateFormula,
  type FormulaError
} from '@/utils/formulaEngine';

/**
 * Props для компонента FormulaEditor
 */
export interface FormulaEditorProps {
  value: string;
  onChange: (value: string) => void;
  columns: Array<{ name: string; type: string }>;
  onSave?: (formula: string) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Категории функций
 */
const FUNCTION_CATEGORIES = [
  { id: 'math', label: 'Математика', icon: Calculator },
  { id: 'string', label: 'Строки', icon: Type },
  { id: 'date', label: 'Даты', icon: Calendar },
  { id: 'logic', label: 'Логика', icon: ToggleLeft },
];

/**
 * Все доступные функции по категориям
 */
const FUNCTIONS_BY_CATEGORY: Record<string, Array<{ name: string; description: string; example: string }>> = {
  math: [
    { name: 'ABS', description: 'Абсолютное значение', example: 'ABS(-5)' },
    { name: 'CEIL', description: 'Округление вверх', example: 'CEIL(4.3)' },
    { name: 'FLOOR', description: 'Округление вниз', example: 'FLOOR(4.7)' },
    { name: 'ROUND', description: 'Округление', example: 'ROUND(4.5)' },
    { name: 'SQRT', description: 'Квадратный корень', example: 'SQRT(16)' },
    { name: 'POW', description: 'Возведение в степень', example: 'POW(2, 3)' },
    { name: 'MIN', description: 'Минимум', example: 'MIN(1, 5, 3)' },
    { name: 'MAX', description: 'Максимум', example: 'MAX(1, 5, 3)' },
    { name: 'SUM', description: 'Сумма', example: 'SUM(1, 2, 3)' },
    { name: 'AVG', description: 'Среднее', example: 'AVG(1, 2, 3)' },
  ],
  string: [
    { name: 'UPPER', description: 'В верхний регистр', example: 'UPPER("hello")' },
    { name: 'LOWER', description: 'В нижний регистр', example: 'LOWER("HELLO")' },
    { name: 'TRIM', description: 'Удалить пробелы', example: 'TRIM("  hello  ")' },
    { name: 'CONCAT', description: 'Объединить', example: 'CONCAT("a", "b")' },
    { name: 'SUBSTRING', description: 'Подстрока', example: 'SUBSTRING("hello", 0, 2)' },
    { name: 'REPLACE', description: 'Заменить', example: 'REPLACE("hello", "l", "r")' },
    { name: 'LENGTH', description: 'Длина', example: 'LENGTH("hello")' },
  ],
  date: [
    { name: 'NOW', description: 'Текущая дата и время', example: 'NOW()' },
    { name: 'TODAY', description: 'Сегодня', example: 'TODAY()' },
    { name: 'YEAR', description: 'Год', example: 'YEAR({date})' },
    { name: 'MONTH', description: 'Месяц', example: 'MONTH({date})' },
    { name: 'DAY', description: 'День', example: 'DAY({date})' },
    { name: 'HOUR', description: 'Час', example: 'HOUR({datetime})' },
    { name: 'MINUTE', description: 'Минута', example: 'MINUTE({datetime})' },
    { name: 'DATEADD', description: 'Добавить дни', example: 'DATEADD({date}, 7)' },
    { name: 'DATEDIFF', description: 'Разница в днях', example: 'DATEDIFF({date1}, {date2})' },
    { name: 'FORMATDATE', description: 'Форматировать дату', example: 'FORMATDATE({date}, "YYYY-MM-DD")' },
  ],
  logic: [
    { name: 'IF', description: 'Условие', example: 'IF({score} > 50, "pass", "fail")' },
    { name: 'AND', description: 'И', example: 'AND({a} > 0, {b} < 100)' },
    { name: 'OR', description: 'ИЛИ', example: 'OR({a} > 0, {b} > 0)' },
    { name: 'NOT', description: 'НЕ', example: 'NOT({active})' },
    { name: 'ISNULL', description: 'Проверка NULL', example: 'ISNULL({field})' },
    { name: 'ISEMPTY', description: 'Проверка пустоты', example: 'ISEMPTY({text})' },
  ],
};

/**
 * Компонент редактора формул
 */
export function FormulaEditor({
  value,
  onChange,
  columns,
  onSave,
  className,
  disabled = false
}: FormulaEditorProps) {
  const [internalValue, setInternalValue] = useState(value);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('math');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedFormula, setHighlightedFormula] = useState<HighlightToken[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Обновляем внутреннее значение при изменении props
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Валидация и превью формулы
  useEffect(() => {
    if (!internalValue) {
      setValidationError(null);
      setPreviewResult(null);
      return;
    }

    // Валидация
    const error = validateFormula(internalValue);
    if (error) {
      setValidationError(error.message);
      setPreviewResult(null);
    } else {
      setValidationError(null);

      // Превью с примерными данными
      try {
        const sampleData: Record<string, any> = {};
        columns.forEach(col => {
          switch (col.type) {
            case 'number':
              sampleData[col.name] = 10;
              break;
            case 'string':
            case 'text':
              sampleData[col.name] = 'Sample';
              break;
            case 'date':
              sampleData[col.name] = new Date();
              break;
            case 'boolean':
              sampleData[col.name] = true;
              break;
            default:
              sampleData[col.name] = null;
          }
        });

        const result = evaluateFormula(internalValue, sampleData);
        setPreviewResult(String(result));
      } catch (e) {
        setPreviewResult('Ошибка вычисления');
      }
    }
  }, [internalValue, columns]);

  // Подсветка синтаксиса
  useEffect(() => {
    const tokens = tokenizeForHighlight(internalValue);
    setHighlightedFormula(tokens);
  }, [internalValue]);

  // Обновление предложений для автодополнения
  useEffect(() => {
    const newSuggestions = getSuggestions(internalValue, cursorPosition, columns);
    setSuggestions(newSuggestions);
    setSelectedSuggestion(0);
    setShowSuggestions(newSuggestions.length > 0);
  }, [internalValue, cursorPosition, columns]);

  // Обработка изменения формулы
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newPosition = e.target.selectionStart || 0;

    setInternalValue(newValue);
    setCursorPosition(newPosition);
    onChange(newValue);
  }, [onChange]);

  // Обработка позиции курсора
  const handleSelect = useCallback((e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPosition(target.selectionStart || 0);
  }, []);

  // Обработка клавиатурных событий
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Tab':
      case 'Enter':
        if (showSuggestions && suggestions[selectedSuggestion]) {
          e.preventDefault();
          insertSuggestion(suggestions[selectedSuggestion]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  }, [showSuggestions, suggestions, selectedSuggestion]);

  // Вставка предложения
  const insertSuggestion = useCallback((suggestion: string) => {
    const beforeCursor = internalValue.slice(0, cursorPosition);
    const afterCursor = internalValue.slice(cursorPosition);

    // Находим начало текущего слова
    const match = beforeCursor.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
    const wordStart = match ? beforeCursor.length - match[0].length : cursorPosition;

    // Заменяем текущее слово на предложение
    const newValue = internalValue.slice(0, wordStart) + suggestion + afterCursor;
    const newPosition = wordStart + suggestion.length;

    setInternalValue(newValue);
    setCursorPosition(newPosition);
    onChange(newValue);
    setShowSuggestions(false);

    // Фокусируемся обратно на textarea
    textareaRef.current?.focus();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
      }
    }, 0);
  }, [internalValue, cursorPosition, onChange]);

  // Вставка функции из списка
  const insertFunction = useCallback((functionName: string) => {
    const insertion = functionName + '()';
    const newValue = internalValue + insertion;
    const newPosition = internalValue.length + functionName.length + 1;

    setInternalValue(newValue);
    setCursorPosition(newPosition);
    onChange(newValue);

    // Фокусируемся на textarea и устанавливаем курсор внутри скобок
    textareaRef.current?.focus();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newPosition;
        textareaRef.current.selectionEnd = newPosition;
      }
    }, 0);
  }, [internalValue, onChange]);

  // Вставка колонки
  const insertColumn = useCallback((columnName: string) => {
    const insertion = `{${columnName}}`;
    const newValue = internalValue + insertion;
    const newPosition = internalValue.length + insertion.length;

    setInternalValue(newValue);
    setCursorPosition(newPosition);
    onChange(newValue);

    textareaRef.current?.focus();
  }, [internalValue, onChange]);

  // Копировать пример в буфер обмена
  const copyExample = useCallback((example: string) => {
    navigator.clipboard.writeText(example);
  }, []);

  // Сохранение формулы
  const handleSave = useCallback(() => {
    if (!validationError && onSave) {
      onSave(internalValue);
    }
  }, [internalValue, validationError, onSave]);

  // Фильтрация функций по поисковому запросу
  const filteredFunctions = useMemo(() => {
    const functions = FUNCTIONS_BY_CATEGORY[selectedCategory] || [];
    if (!searchQuery) return functions;

    const query = searchQuery.toLowerCase();
    return functions.filter(f =>
      f.name.toLowerCase().includes(query) ||
      f.description.toLowerCase().includes(query)
    );
  }, [selectedCategory, searchQuery]);

  return (
    <div className={cn("grid grid-cols-12 gap-4", className)}>
      {/* Левая панель - Функции */}
      <div className="col-span-3">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Функции</CardTitle>
            <Input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mt-2"
              disabled={disabled}
              prefix={<Search className="w-4 h-4" />}
            />
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="grid w-full grid-cols-4 p-1">
                {FUNCTION_CATEGORIES.map(cat => (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    disabled={disabled}
                    className="p-1"
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <cat.icon className="w-4 h-4" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{cat.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TabsTrigger>
                ))}
              </TabsList>

              {FUNCTION_CATEGORIES.map(cat => (
                <TabsContent key={cat.id} value={cat.id} className="mt-0">
                  <ScrollArea className="h-[400px] p-3">
                    <div className="space-y-1">
                      {filteredFunctions.map(func => (
                        <TooltipProvider key={func.name}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-between text-xs hover:bg-accent"
                                onClick={() => insertFunction(func.name)}
                                disabled={disabled}
                              >
                                <span className="font-mono">{func.name}</span>
                                <ChevronRight className="w-3 h-3 opacity-50" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <div className="space-y-2">
                                <p className="font-semibold">{func.name}</p>
                                <p className="text-sm text-muted-foreground">{func.description}</p>
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                    {func.example}
                                  </code>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      copyExample(func.example);
                                    }}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Центральная панель - Редактор */}
      <div className="col-span-6">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Редактор формулы</span>
              <div className="flex items-center gap-2">
                {validationError ? (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    Ошибка
                  </Badge>
                ) : internalValue ? (
                  <Badge variant="success" className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Валидно
                  </Badge>
                ) : null}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Область редактора с подсветкой */}
            <div className="relative">
              <div className="absolute inset-0 p-3 font-mono text-sm pointer-events-none overflow-hidden">
                <div ref={highlightRef} className="whitespace-pre-wrap break-words">
                  {highlightedFormula.map((token, index) => (
                    <span key={index} className={getTokenColor(token.type)}>
                      {token.value}
                    </span>
                  ))}
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={internalValue}
                onChange={handleChange}
                onSelect={handleSelect}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="w-full h-[200px] p-3 font-mono text-sm bg-transparent border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring relative z-10 text-transparent caret-black dark:caret-white"
                placeholder="Введите формулу..."
                style={{ caretColor: 'currentColor' }}
              />

              {/* Автодополнение */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-md shadow-md z-20"
                >
                  <ScrollArea className="max-h-48">
                    <div className="p-1">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={suggestion}
                          variant={index === selectedSuggestion ? "secondary" : "ghost"}
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => insertSuggestion(suggestion)}
                        >
                          <code>{suggestion}</code>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>

            {/* Ошибка валидации */}
            {validationError && (
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Доступные колонки */}
            <div>
              <h4 className="text-sm font-medium mb-2">Доступные колонки:</h4>
              <div className="flex flex-wrap gap-2">
                {columns.map(col => (
                  <TooltipProvider key={col.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => insertColumn(col.name)}
                          disabled={disabled}
                          className="text-xs"
                        >
                          {`{${col.name}}`}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Тип: {col.type}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setInternalValue('');
                  onChange('');
                }}
                disabled={disabled}
              >
                Очистить
              </Button>
              {onSave && (
                <Button
                  onClick={handleSave}
                  disabled={disabled || !!validationError || !internalValue}
                  className="gap-2"
                >
                  <Save className="w-4 h-4" />
                  Сохранить формулу
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Правая панель - Превью и справка */}
      <div className="col-span-3">
        <div className="space-y-4">
          {/* Превью результата */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Превью результата</CardTitle>
            </CardHeader>
            <CardContent>
              {previewResult ? (
                <div className="p-3 bg-muted rounded-md">
                  <code className="text-sm">{previewResult}</code>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Введите формулу для предпросмотра
                </p>
              )}
            </CardContent>
          </Card>

          {/* Справка */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                Справка
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3 text-sm">
                  <div>
                    <h5 className="font-medium mb-1">Синтаксис:</h5>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• Колонки: {`{column_name}`}</li>
                      <li>• Функции: FUNCTION(args)</li>
                      <li>• Строки: "text" или 'text'</li>
                      <li>• Числа: 123, 45.67</li>
                      <li>• Операторы: +, -, *, /, =, !=, &lt;, &gt;</li>
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium mb-1">Примеры:</h5>
                    <div className="space-y-1">
                      <code className="block text-xs bg-muted p-1 rounded">
                        {`{price} * {quantity}`}
                      </code>
                      <code className="block text-xs bg-muted p-1 rounded">
                        {`IF({status} = "active", 1, 0)`}
                      </code>
                      <code className="block text-xs bg-muted p-1 rounded">
                        {`CONCAT({first_name}, " ", {last_name})`}
                      </code>
                      <code className="block text-xs bg-muted p-1 rounded">
                        {`ROUND({amount} * 1.2, 2)`}
                      </code>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-1">Горячие клавиши:</h5>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      <li>• Tab/Enter - выбрать подсказку</li>
                      <li>• ↑/↓ - навигация по подсказкам</li>
                      <li>• Esc - закрыть подсказки</li>
                    </ul>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}