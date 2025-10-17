/**
 * Движок для вычисления формул в колонках
 * Поддерживает математические операции, строковые функции, логические операции, работу с датами
 */

import type { FormulaConfig, ColumnType } from '../types/database';
import safeRegex from 'safe-regex';

/**
 * Токены для парсинга формулы
 */
type Token = {
  type: 'number' | 'string' | 'boolean' | 'identifier' | 'operator' | 'function' | 'paren';
  value: string | number | boolean;
};

/**
 * Математические функции
 */
const mathFunctions: Record<string, (...args: number[]) => number> = {
  abs: Math.abs,
  ceil: Math.ceil,
  floor: Math.floor,
  round: Math.round,
  sqrt: Math.sqrt,
  pow: Math.pow,
  min: Math.min,
  max: Math.max,
  sum: (...args) => args.reduce((sum, val) => sum + val, 0),
  avg: (...args) => args.reduce((sum, val) => sum + val, 0) / args.length,
};

/**
 * Строковые функции
 */
const stringFunctions: Record<string, ((...args: any[]) => string)> = {
  upper: (str: string) => String(str).toUpperCase(),
  lower: (str: string) => String(str).toLowerCase(),
  trim: (str: string) => String(str).trim(),
  concat: (...args: any[]) => args.map(String).join(''),
  substring: (str: string, start: number, end?: number) => 
    String(str).substring(start, end),
  replace: (str: string, search: string, replace: string) => {
    // Validate regex pattern to prevent ReDoS attacks
    if (!safeRegex(search)) {
      throw new Error(`Unsafe regex pattern: "${search}". Pattern could cause performance issues.`);
    }
    return String(str).replace(new RegExp(search, 'g'), replace);
  },
  length: (str: string) => String(String(str).length),
};

/**
 * Функции для работы с датами
 */
const dateFunctions: Record<string, ((...args: any[]) => any)> = {
  now: () => new Date(),
  today: () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  },
  year: (date: Date) => new Date(date).getFullYear(),
  month: (date: Date) => new Date(date).getMonth() + 1,
  day: (date: Date) => new Date(date).getDate(),
  hour: (date: Date) => new Date(date).getHours(),
  minute: (date: Date) => new Date(date).getMinutes(),
  dateAdd: (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  dateDiff: (date1: Date, date2: Date) => {
    const diff = new Date(date1).getTime() - new Date(date2).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },
  formatDate: (date: Date, format: string) => {
    const d = new Date(date);
    const formats: Record<string, string> = {
      'YYYY': String(d.getFullYear()),
      'MM': String(d.getMonth() + 1).padStart(2, '0'),
      'DD': String(d.getDate()).padStart(2, '0'),
      'HH': String(d.getHours()).padStart(2, '0'),
      'mm': String(d.getMinutes()).padStart(2, '0'),
      'ss': String(d.getSeconds()).padStart(2, '0'),
    };
    let result = format;
    for (const [key, value] of Object.entries(formats)) {
      result = result.replace(key, value);
    }
    return result;
  },
};

/**
 * Логические функции
 */
const logicalFunctions: Record<string, ((...args: any[]) => any)> = {
  if: (condition: boolean, ifTrue: any, ifFalse: any) => condition ? ifTrue : ifFalse,
  and: (...args: boolean[]) => args.every(Boolean),
  or: (...args: boolean[]) => args.some(Boolean),
  not: (value: boolean) => !value,
  isNull: (value: any) => value == null,
  isEmpty: (value: any) => value == null || value === '' || (Array.isArray(value) && value.length === 0),
};

/**
 * Все доступные функции
 */
const allFunctions = {
  ...mathFunctions,
  ...stringFunctions,
  ...dateFunctions,
  ...logicalFunctions,
};

/**
 * Парсит выражение формулы в токены
 */
function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    // Пропускаем пробелы
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Числа
    if (/\d/.test(char)) {
      let num = '';
      while (i < expression.length && /[\d.]/.test(expression[i])) {
        num += expression[i];
        i++;
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    // Строки
    if (char === '"' || char === "'") {
      const quote = char;
      let str = '';
      i++;
      while (i < expression.length && expression[i] !== quote) {
        if (expression[i] === '\\' && i + 1 < expression.length) {
          i++;
          str += expression[i];
        } else {
          str += expression[i];
        }
        i++;
      }
      i++; // Закрывающая кавычка
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Операторы
    if ('+-*/^%=<>!'.includes(char)) {
      let op = char;
      i++;
      // Проверяем двухсимвольные операторы
      if (i < expression.length && '=<>'.includes(expression[i])) {
        op += expression[i];
        i++;
      }
      tokens.push({ type: 'operator', value: op });
      continue;
    }

    // Скобки
    if ('()'.includes(char)) {
      tokens.push({ type: 'paren', value: char });
      i++;
      continue;
    }

    // Запятая (разделитель аргументов)
    if (char === ',') {
      i++;
      continue;
    }

    // Идентификаторы и функции
    if (/[a-zA-Z_]/.test(char)) {
      let identifier = '';
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
        identifier += expression[i];
        i++;
      }

      // Проверяем, это функция или переменная
      if (i < expression.length && expression[i] === '(') {
        tokens.push({ type: 'function', value: identifier });
      } else if (identifier === 'true' || identifier === 'false') {
        tokens.push({ type: 'boolean', value: identifier === 'true' });
      } else {
        tokens.push({ type: 'identifier', value: identifier });
      }
      continue;
    }

    i++;
  }

  return tokens;
}

/**
 * Вычисляет формулу
 */
export function evaluateFormula(
  expression: string,
  context: Record<string, any>
): any {
  try {
    const tokens = tokenize(expression);
    return evaluateTokens(tokens, context);
  } catch (error) {
    console.error('Ошибка вычисления формулы:', error);
    throw new Error(`Ошибка в формуле: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

/**
 * Вычисляет токены
 */
function evaluateTokens(tokens: Token[], context: Record<string, any>): any {
  if (tokens.length === 0) return null;

  // Простые случаи
  if (tokens.length === 1) {
    const token = tokens[0];
    if (token.type === 'number' || token.type === 'string' || token.type === 'boolean') {
      return token.value;
    }
    if (token.type === 'identifier') {
      return context[token.value as string];
    }
  }

  // Вызов функции
  if (tokens[0].type === 'function') {
    const funcName = tokens[0].value as string;
    const func = allFunctions[funcName];

    if (!func) {
      throw new Error(`Неизвестная функция: ${funcName}`);
    }

    // Извлекаем аргументы из скобок
    const args: any[] = [];
    let depth = 0;
    let currentArg: Token[] = [];

    for (let i = 2; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'paren') {
        if (token.value === '(') {
          depth++;
          currentArg.push(token);
        } else if (token.value === ')') {
          if (depth === 0) {
            if (currentArg.length > 0) {
              args.push(evaluateTokens(currentArg, context));
            }
            break;
          } else {
            depth--;
            currentArg.push(token);
          }
        }
      } else {
        currentArg.push(token);
      }
    }

    return func(...args);
  }

  // Обработка операторов
  return evaluateExpression(tokens, context);
}

/**
 * Вычисляет выражение с операторами
 */
function evaluateExpression(tokens: Token[], context: Record<string, any>): any {
  // Простая реализация для базовых операций
  // TODO: Полная реализация парсера с приоритетами операторов

  let result: any = null;
  let operator: string | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'number' || token.type === 'string' || token.type === 'boolean') {
      if (result === null) {
        result = token.value;
      } else if (operator) {
        result = applyOperator(result, token.value, operator);
        operator = null;
      }
    } else if (token.type === 'identifier') {
      const value = context[token.value as string];
      if (result === null) {
        result = value;
      } else if (operator) {
        result = applyOperator(result, value, operator);
        operator = null;
      }
    } else if (token.type === 'operator') {
      operator = token.value as string;
    }
  }

  return result;
}

/**
 * Применяет оператор к двум значениям
 */
function applyOperator(left: any, right: any, operator: string): any {
  switch (operator) {
    case '+':
      return left + right;
    case '-':
      return left - right;
    case '*':
      return left * right;
    case '/':
      return left / right;
    case '^':
      return Math.pow(left, right);
    case '%':
      return left % right;
    case '==':
    case '=':
      return left === right;
    case '!=':
      return left !== right;
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '>':
      return left > right;
    case '>=':
      return left >= right;
    default:
      throw new Error(`Неизвестный оператор: ${operator}`);
  }
}

/**
 * Валидирует формулу
 */
export function validateFormula(config: FormulaConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.expression || config.expression.trim() === '') {
    errors.push('Выражение формулы не может быть пустым');
  }

  if (!config.return_type) {
    errors.push('Не указан тип возвращаемого значения');
  }

  // Пробуем распарсить выражение
  try {
    tokenize(config.expression);
  } catch (error) {
    errors.push(`Ошибка парсинга: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }

  // Проверяем зависимости
  if (config.dependencies && config.dependencies.length > 0) {
    const usedColumns = extractColumnReferences(config.expression);
    const unusedDeps = config.dependencies.filter(dep => !usedColumns.includes(dep));
    
    if (unusedDeps.length > 0) {
      errors.push(`Неиспользуемые зависимости: ${unusedDeps.join(', ')}`);
    }

    const missingDeps = usedColumns.filter(col => !config.dependencies.includes(col));
    if (missingDeps.length > 0) {
      errors.push(`Отсутствующие зависимости: ${missingDeps.join(', ')}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Извлекает ссылки на колонки из выражения
 */
export function extractColumnReferences(expression: string): string[] {
  const tokens = tokenize(expression);
  const columns = new Set<string>();

  for (const token of tokens) {
    if (token.type === 'identifier') {
      columns.add(token.value as string);
    }
  }

  return Array.from(columns);
}

/**
 * Метаданные функций для UI
 */
export const FORMULA_FUNCTIONS = [
  // Математические
  {
    name: 'abs',
    category: 'math',
    description: 'Возвращает абсолютное значение числа',
    params: [{ name: 'number', type: 'number', optional: false }],
    examples: ['abs(-5) => 5', 'abs({price}) => абсолютное значение цены'],
  },
  {
    name: 'round',
    category: 'math',
    description: 'Округляет число до ближайшего целого',
    params: [{ name: 'number', type: 'number', optional: false }],
    examples: ['round(3.7) => 4', 'round({price}) => округленная цена'],
  },
  {
    name: 'ceil',
    category: 'math',
    description: 'Округляет число вверх',
    params: [{ name: 'number', type: 'number', optional: false }],
    examples: ['ceil(3.2) => 4'],
  },
  {
    name: 'floor',
    category: 'math',
    description: 'Округляет число вниз',
    params: [{ name: 'number', type: 'number', optional: false }],
    examples: ['floor(3.9) => 3'],
  },
  {
    name: 'sum',
    category: 'math',
    description: 'Суммирует все аргументы',
    params: [{ name: 'numbers', type: 'number', optional: false }],
    examples: ['sum(1, 2, 3) => 6', 'sum({price}, {tax}) => сумма'],
  },
  {
    name: 'avg',
    category: 'math',
    description: 'Вычисляет среднее значение',
    params: [{ name: 'numbers', type: 'number', optional: false }],
    examples: ['avg(1, 2, 3) => 2'],
  },
  {
    name: 'min',
    category: 'math',
    description: 'Возвращает минимальное значение',
    params: [{ name: 'numbers', type: 'number', optional: false }],
    examples: ['min(1, 2, 3) => 1'],
  },
  {
    name: 'max',
    category: 'math',
    description: 'Возвращает максимальное значение',
    params: [{ name: 'numbers', type: 'number', optional: false }],
    examples: ['max(1, 2, 3) => 3'],
  },
  {
    name: 'pow',
    category: 'math',
    description: 'Возводит число в степень',
    params: [
      { name: 'base', type: 'number', optional: false },
      { name: 'exponent', type: 'number', optional: false },
    ],
    examples: ['pow(2, 3) => 8'],
  },
  {
    name: 'sqrt',
    category: 'math',
    description: 'Извлекает квадратный корень',
    params: [{ name: 'number', type: 'number', optional: false }],
    examples: ['sqrt(9) => 3'],
  },
  // Строковые
  {
    name: 'upper',
    category: 'string',
    description: 'Преобразует строку в верхний регистр',
    params: [{ name: 'string', type: 'string', optional: false }],
    examples: ['upper("hello") => "HELLO"', 'upper({name}) => ИМЯ БОЛЬШИМИ БУКВАМИ'],
  },
  {
    name: 'lower',
    category: 'string',
    description: 'Преобразует строку в нижний регистр',
    params: [{ name: 'string', type: 'string', optional: false }],
    examples: ['lower("HELLO") => "hello"'],
  },
  {
    name: 'concat',
    category: 'string',
    description: 'Объединяет строки',
    params: [{ name: 'strings', type: 'string', optional: false }],
    examples: ['concat("Hello", " ", "World") => "Hello World"', 'concat({first_name}, " ", {last_name})'],
  },
  {
    name: 'trim',
    category: 'string',
    description: 'Удаляет пробелы в начале и конце строки',
    params: [{ name: 'string', type: 'string', optional: false }],
    examples: ['trim("  hello  ") => "hello"'],
  },
  {
    name: 'substring',
    category: 'string',
    description: 'Извлекает подстроку',
    params: [
      { name: 'string', type: 'string', optional: false },
      { name: 'start', type: 'number', optional: false },
      { name: 'end', type: 'number', optional: true },
    ],
    examples: ['substring("hello", 0, 3) => "hel"'],
  },
  {
    name: 'replace',
    category: 'string',
    description: 'Заменяет текст в строке',
    params: [
      { name: 'string', type: 'string', optional: false },
      { name: 'search', type: 'string', optional: false },
      { name: 'replace', type: 'string', optional: false },
    ],
    examples: ['replace("hello world", "world", "there") => "hello there"'],
  },
  {
    name: 'length',
    category: 'string',
    description: 'Возвращает длину строки',
    params: [{ name: 'string', type: 'string', optional: false }],
    examples: ['length("hello") => "5"'],
  },
  // Даты
  {
    name: 'now',
    category: 'date',
    description: 'Возвращает текущую дату и время',
    params: [],
    examples: ['now() => 2024-01-01 12:00:00'],
  },
  {
    name: 'today',
    category: 'date',
    description: 'Возвращает сегодняшнюю дату (без времени)',
    params: [],
    examples: ['today() => 2024-01-01'],
  },
  {
    name: 'year',
    category: 'date',
    description: 'Извлекает год из даты',
    params: [{ name: 'date', type: 'date', optional: false }],
    examples: ['year({created_date}) => 2024'],
  },
  {
    name: 'month',
    category: 'date',
    description: 'Извлекает месяц из даты',
    params: [{ name: 'date', type: 'date', optional: false }],
    examples: ['month({created_date}) => 1'],
  },
  {
    name: 'day',
    category: 'date',
    description: 'Извлекает день из даты',
    params: [{ name: 'date', type: 'date', optional: false }],
    examples: ['day({created_date}) => 15'],
  },
  {
    name: 'dateDiff',
    category: 'date',
    description: 'Вычисляет разницу между датами в днях',
    params: [
      { name: 'date1', type: 'date', optional: false },
      { name: 'date2', type: 'date', optional: false },
    ],
    examples: ['dateDiff({due_date}, today()) => 7'],
  },
  {
    name: 'dateAdd',
    category: 'date',
    description: 'Добавляет дни к дате',
    params: [
      { name: 'date', type: 'date', optional: false },
      { name: 'days', type: 'number', optional: false },
    ],
    examples: ['dateAdd(today(), 7) => дата через 7 дней'],
  },
  {
    name: 'formatDate',
    category: 'date',
    description: 'Форматирует дату',
    params: [
      { name: 'date', type: 'date', optional: false },
      { name: 'format', type: 'string', optional: false },
    ],
    examples: ['formatDate({date}, "YYYY-MM-DD") => "2024-01-01"'],
  },
  // Логические
  {
    name: 'if',
    category: 'logical',
    description: 'Условное выражение',
    params: [
      { name: 'condition', type: 'boolean', optional: false },
      { name: 'valueIfTrue', type: 'any', optional: false },
      { name: 'valueIfFalse', type: 'any', optional: false },
    ],
    examples: ['if({price} > 100, "Дорого", "Дешево")'],
  },
  {
    name: 'and',
    category: 'logical',
    description: 'Логическое И',
    params: [{ name: 'conditions', type: 'boolean', optional: false }],
    examples: ['and({active}, {verified}) => true если оба true'],
  },
  {
    name: 'or',
    category: 'logical',
    description: 'Логическое ИЛИ',
    params: [{ name: 'conditions', type: 'boolean', optional: false }],
    examples: ['or({active}, {verified}) => true если хотя бы один true'],
  },
  {
    name: 'not',
    category: 'logical',
    description: 'Логическое НЕ',
    params: [{ name: 'condition', type: 'boolean', optional: false }],
    examples: ['not({active}) => инвертирует значение'],
  },
  {
    name: 'isNull',
    category: 'logical',
    description: 'Проверяет на null',
    params: [{ name: 'value', type: 'any', optional: false }],
    examples: ['isNull({optional_field}) => true если null'],
  },
  {
    name: 'isEmpty',
    category: 'logical',
    description: 'Проверяет на пустоту',
    params: [{ name: 'value', type: 'any', optional: false }],
    examples: ['isEmpty({name}) => true если пусто'],
  },
];

/**
 * Получает список доступных функций
 */
export function getAvailableFunctions(): Record<string, {
  name: string;
  category: string;
  description: string;
  signature: string;
  example: string;
}> {
  return {
    // Математические
    abs: {
      name: 'abs',
      category: 'math',
      description: 'Возвращает абсолютное значение числа',
      signature: 'abs(number)',
      example: 'abs(-5) => 5',
    },
    round: {
      name: 'round',
      category: 'math',
      description: 'Округляет число до ближайшего целого',
      signature: 'round(number)',
      example: 'round(3.7) => 4',
    },
    sum: {
      name: 'sum',
      category: 'math',
      description: 'Суммирует все аргументы',
      signature: 'sum(number1, number2, ...)',
      example: 'sum(1, 2, 3) => 6',
    },
    avg: {
      name: 'avg',
      category: 'math',
      description: 'Вычисляет среднее значение',
      signature: 'avg(number1, number2, ...)',
      example: 'avg(1, 2, 3) => 2',
    },
    // Строковые
    upper: {
      name: 'upper',
      category: 'string',
      description: 'Преобразует строку в верхний регистр',
      signature: 'upper(string)',
      example: 'upper("hello") => "HELLO"',
    },
    lower: {
      name: 'lower',
      category: 'string',
      description: 'Преобразует строку в нижний регистр',
      signature: 'lower(string)',
      example: 'lower("HELLO") => "hello"',
    },
    concat: {
      name: 'concat',
      category: 'string',
      description: 'Объединяет строки',
      signature: 'concat(string1, string2, ...)',
      example: 'concat("Hello", " ", "World") => "Hello World"',
    },
    // Даты
    now: {
      name: 'now',
      category: 'date',
      description: 'Возвращает текущую дату и время',
      signature: 'now()',
      example: 'now() => 2024-01-01 12:00:00',
    },
    dateDiff: {
      name: 'dateDiff',
      category: 'date',
      description: 'Вычисляет разницу между датами в днях',
      signature: 'dateDiff(date1, date2)',
      example: 'dateDiff(date1, date2) => 7',
    },
    // Логические
    if: {
      name: 'if',
      category: 'logical',
      description: 'Условное выражение',
      signature: 'if(condition, valueIfTrue, valueIfFalse)',
      example: 'if(price > 100, "Дорого", "Дешево")',
    },
  };
}

/**
 * Проверяет тип результата формулы
 */
export function inferFormulaType(expression: string, context: Record<string, any>): ColumnType {
  try {
    const result = evaluateFormula(expression, context);
    
    if (typeof result === 'number') return 'number';
    if (typeof result === 'boolean') return 'boolean';
    if (result instanceof Date) return 'date';
    return 'text';
  } catch {
    return 'text';
  }
}
