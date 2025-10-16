/**
 * Движок для вычисления формул в колонках
 * Поддерживает математические операции, строковые функции, логические операции, работу с датами
 */

import type { FormulaConfig, ColumnType } from '../types/database';
import type { AnyObject } from '@/types/common';

/**
 * Токены для парсинга формулы
 */
type Token = {
  type: 'number' | 'string' | 'boolean' | 'identifier' | 'operator' | 'function' | 'paren';
  value: string | number | boolean;
};

type FormulaValue = string | number | boolean | Date | null | undefined | unknown[];
type FormulaContext = Record<string, unknown>;
type FormulaFunction = (...args: FormulaValue[]) => FormulaValue;

type FormulaAST = {
  type: 'number' | 'string' | 'boolean' | 'column' | 'binary' | 'unary' | 'function';
  value?: string | number | boolean;
  operator?: string;
  left?: FormulaAST;
  right?: FormulaAST;
  operand?: FormulaAST;
  name?: string;
  args?: FormulaAST[];
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
const stringFunctions: Record<string, (...args: Array<string | number | undefined>) => string> = {
  upper: (str) => String(str).toUpperCase(),
  lower: (str) => String(str).toLowerCase(),
  trim: (str) => String(str).trim(),
  concat: (...args) => args.map(String).join(''),
  substring: (str, start, end) => 
    String(str).substring(Number(start), end !== undefined ? Number(end) : undefined),
  replace: (str, search, replace) => 
    String(str).replace(new RegExp(String(search), 'g'), String(replace)),
  length: (str) => String(String(str).length),
};

/**
 * Функции для работы с датами
 */
const dateFunctions: Record<string, (...args: Array<Date | string | number>) => FormulaValue> = {
  now: () => new Date(),
  today: () => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  },
  year: (date) => new Date(date).getFullYear(),
  month: (date) => new Date(date).getMonth() + 1,
  day: (date) => new Date(date).getDate(),
  hour: (date) => new Date(date).getHours(),
  minute: (date) => new Date(date).getMinutes(),
  dateAdd: (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + Number(days));
    return result;
  },
  dateDiff: (date1, date2) => {
    const diff = new Date(date1).getTime() - new Date(date2).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },
  formatDate: (date, format) => {
    const d = new Date(date);
    const formats: Record<string, string> = {
      'YYYY': String(d.getFullYear()),
      'MM': String(d.getMonth() + 1).padStart(2, '0'),
      'DD': String(d.getDate()).padStart(2, '0'),
      'HH': String(d.getHours()).padStart(2, '0'),
      'mm': String(d.getMinutes()).padStart(2, '0'),
      'ss': String(d.getSeconds()).padStart(2, '0'),
    };
    let result = String(format);
    for (const [key, value] of Object.entries(formats)) {
      result = result.replace(key, value);
    }
    return result;
  },
};

/**
 * Логические функции
 */
const logicalFunctions: Record<string, (...args: FormulaValue[]) => FormulaValue> = {
  if: (condition, ifTrue, ifFalse) => condition ? ifTrue : ifFalse,
  and: (...args) => args.every(Boolean),
  or: (...args) => args.some(Boolean),
  not: (value) => !value,
  isnull: (value) => value == null,
  isNull: (value) => value == null,
  isempty: (value) => value == null || value === '' || (Array.isArray(value) && value.length === 0),
  isEmpty: (value) => value == null || value === '' || (Array.isArray(value) && value.length === 0),
};

/**
 * Все доступные функции
 */
const allFunctionsRaw: Record<string, FormulaFunction> = {
  ...mathFunctions,
  ...stringFunctions,
  ...dateFunctions,
  ...logicalFunctions,
} as Record<string, FormulaFunction>;

// Case-insensitive function registry (maps UPPER to lower implementations)
const allFunctions: Record<string, FormulaFunction> = new Proxy(allFunctionsRaw, {
  get(target, prop: string) {
    const key = String(prop).toLowerCase();
    return (target as any)[key];
  },
}) as unknown as Record<string, FormulaFunction>;

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
      while (i < expression.length && (/\d/.test(expression[i]) || expression[i] === '.')) {
        num += expression[i];
        i++;
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    // Строки в кавычках
    if (char === '"' || char === "'") {
      const quote = char;
      let str = '';
      i++;
      while (i < expression.length && expression[i] !== quote) {
        if (expression[i] === '\\' && i + 1 < expression.length) {
          i++;
        }
        str += expression[i];
        i++;
      }
      i++; // Пропускаем закрывающую кавычку
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Идентификаторы и функции
    if (/[a-zA-Z_]/.test(char)) {
      let id = '';
      while (i < expression.length && /[a-zA-Z0-9_]/.test(expression[i])) {
        id += expression[i];
        i++;
      }

      // Проверяем на булевы значения
      if (id === 'true' || id === 'false') {
        tokens.push({ type: 'boolean', value: id === 'true' });
      } else if (i < expression.length && expression[i] === '(') {
        tokens.push({ type: 'function', value: id });
      } else {
        tokens.push({ type: 'identifier', value: id });
      }
      continue;
    }

    // Операторы
    if ('+-*/=<>!&|'.includes(char)) {
      let op = char;
      i++;
      if (i < expression.length) {
        const nextChar = expression[i];
        if ((char === '=' && nextChar === '=') ||
            (char === '!' && nextChar === '=') ||
            (char === '<' && nextChar === '=') ||
            (char === '>' && nextChar === '=') ||
            (char === '&' && nextChar === '&') ||
            (char === '|' && nextChar === '|')) {
          op += nextChar;
          i++;
        }
      }
      tokens.push({ type: 'operator', value: op });
      continue;
    }

    // Скобки
    if (char === '(' || char === ')' || char === ',' || char === '[' || char === ']') {
      tokens.push({ type: 'paren', value: char });
      i++;
      continue;
    }

    i++;
  }

  return tokens;
}

/**
 * Вычисляет выражение из токенов
 */
function evaluate(tokens: Token[], context: FormulaContext): FormulaValue {
  let index = 0;

  function parseExpression(): FormulaValue {
    return parseOr();
  }

  function parseOr(): FormulaValue {
    let left = parseAnd();

    while (index < tokens.length && tokens[index]?.type === 'operator' && tokens[index].value === '||') {
      index++;
      const right = parseAnd();
      left = Boolean(left) || Boolean(right);
    }

    return left;
  }

  function parseAnd(): FormulaValue {
    let left = parseEquality();

    while (index < tokens.length && tokens[index]?.type === 'operator' && tokens[index].value === '&&') {
      index++;
      const right = parseEquality();
      left = Boolean(left) && Boolean(right);
    }

    return left;
  }

  function parseEquality(): FormulaValue {
    let left = parseComparison();

    while (index < tokens.length && tokens[index]?.type === 'operator' && 
           (tokens[index].value === '==' || tokens[index].value === '!=')) {
      const op = String(tokens[index].value);
      index++;
      const right = parseComparison();
      if (op === '==') {
        left = left == right;
      } else {
        left = left != right;
      }
    }

    return left;
  }

  function parseComparison(): FormulaValue {
    let left = parseAddSub();

    while (index < tokens.length && tokens[index]?.type === 'operator' && 
           ['<', '<=', '>', '>='].includes(String(tokens[index].value))) {
      const op = String(tokens[index].value);
      index++;
      const right = parseAddSub();
      
      const leftNum = Number(left);
      const rightNum = Number(right);
      
      switch (op) {
        case '<':
          left = leftNum < rightNum;
          break;
        case '<=':
          left = leftNum <= rightNum;
          break;
        case '>':
          left = leftNum > rightNum;
          break;
        case '>=':
          left = leftNum >= rightNum;
          break;
      }
    }

    return left;
  }

  function parseAddSub(): FormulaValue {
    let left = parseMulDiv();

    while (index < tokens.length && tokens[index]?.type === 'operator' && 
           (tokens[index].value === '+' || tokens[index].value === '-')) {
      const op = String(tokens[index].value);
      index++;
      const right = parseMulDiv();
      
      if (op === '+') {
        if (typeof left === 'string' || typeof right === 'string') {
          left = String(left) + String(right);
        } else {
          left = Number(left) + Number(right);
        }
      } else {
        left = Number(left) - Number(right);
      }
    }

    return left;
  }

  function parseMulDiv(): FormulaValue {
    let left = parseUnary();

    while (index < tokens.length && tokens[index]?.type === 'operator' && 
           (tokens[index].value === '*' || tokens[index].value === '/')) {
      const op = String(tokens[index].value);
      index++;
      const right = parseUnary();
      
      if (op === '*') {
        left = Number(left) * Number(right);
      } else {
        left = Number(left) / Number(right);
      }
    }

    return left;
  }

  function parseUnary(): FormulaValue {
    if (index < tokens.length && tokens[index]?.type === 'operator' && tokens[index].value === '!') {
      index++;
      return !parseUnary();
    }
    if (index < tokens.length && tokens[index]?.type === 'operator' && tokens[index].value === '-') {
      index++;
      return -Number(parseUnary());
    }
    return parsePrimary();
  }

  function parsePrimary(): FormulaValue {
    if (index >= tokens.length) {
      throw new Error('Unexpected end of expression');
    }

    const token = tokens[index];

    // Числа
    if (token.type === 'number') {
      index++;
      return token.value as number;
    }

    // Строки
    if (token.type === 'string') {
      index++;
      return token.value as string;
    }

    // Булевы значения
    if (token.type === 'boolean') {
      index++;
      return token.value as boolean;
    }

    // Функции
    if (token.type === 'function') {
      const funcName = String(token.value).toLowerCase();
      index++;
      
      if (index >= tokens.length || tokens[index].value !== '(') {
        throw new Error(`Expected '(' after function ${funcName}`);
      }
      index++;

      const args: FormulaValue[] = [];
      while (index < tokens.length && tokens[index].value !== ')') {
        if (tokens[index].value === ',') {
          index++;
        } else {
          args.push(parseExpression());
        }
      }

      if (index >= tokens.length || tokens[index].value !== ')') {
        throw new Error(`Expected ')' after function arguments`);
      }
      index++;

      const func = allFunctions[funcName];
      if (!func) {
        throw new Error(`Unknown function: ${funcName}`);
      }

      return func(...args);
    }

    // Идентификаторы (переменные)
    if (token.type === 'identifier') {
      const varName = String(token.value);
      index++;
      
      // Проверяем на доступ к свойствам объекта
      if (index < tokens.length && tokens[index].value === '[') {
        index++;
        const prop = parseExpression();
        if (index >= tokens.length || tokens[index].value !== ']') {
          throw new Error(`Expected ']' after property access`);
        }
        index++;
        
        const obj = context[varName];
        if (obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Date)) {
          return (obj as AnyObject)[String(prop)] as FormulaValue;
        }
        return undefined;
      }
      
      return context[varName] as FormulaValue;
    }

    // Выражения в скобках
    if (token.type === 'paren' && token.value === '(') {
      index++;
      const result = parseExpression();
      if (index >= tokens.length || tokens[index].value !== ')') {
        throw new Error(`Expected ')'`);
      }
      index++;
      return result;
    }

    throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
  }

  return parseExpression();
}

/**
 * Вычисляет формулу
 */
export function calculateFormula(
  formula: string, 
  rowData: AnyObject,
  allRows?: AnyObject[]
): FormulaValue {
  try {
    // Удаляем префикс '=' если есть
    const expression = formula.startsWith('=') ? formula.slice(1) : formula;
    
    // Создаем контекст с данными строки
    const context: FormulaContext = { ...rowData };
    
    // Добавляем специальные переменные
    if (allRows) {
      context._rows = allRows;
      context._rowIndex = allRows.indexOf(rowData);
      context._rowCount = allRows.length;
    }
    
    // Токенизируем и вычисляем выражение
    const tokens = tokenize(expression);
    return evaluate(tokens, context);
    
  } catch (error) {
    console.error('Ошибка вычисления формулы:', error);
    return `#ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Валидирует формулу
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    const expression = formula.startsWith('=') ? formula.slice(1) : formula;
    const tokens = tokenize(expression);
    
    // Проверяем баланс скобок
    let parenDepth = 0;
    for (const token of tokens) {
      if (token.type === 'paren') {
        if (token.value === '(' || token.value === '[') {
          parenDepth++;
        } else if (token.value === ')' || token.value === ']') {
          parenDepth--;
          if (parenDepth < 0) {
            return { valid: false, error: 'Несбалансированные скобки' };
          }
        }
      }
    }
    
    if (parenDepth !== 0) {
      return { valid: false, error: 'Несбалансированные скобки' };
    }
    
    // Проверяем неизвестные функции (case-insensitive)
    for (const token of tokens) {
      if (token.type === 'function') {
        const name = String(token.value).toLowerCase();
        if (!allFunctions[name]) {
          return { valid: false, error: `Неизвестная функция: ${token.value}` };
        }
      }
    }
    
    // Базовая проверка операторов: избегаем явных повторов ++, --, **, //
    for (let i = 0; i < tokens.length - 1; i++) {
      const a = tokens[i];
      const b = tokens[i + 1];
      if (a.type === 'operator' && b.type === 'operator') {
        const av = String(a.value);
        const bv = String(b.value);
        if ((av === '+' && bv === '+') || (av === '-' && bv === '-') || (av === '*' && bv === '*') || (av === '/' && bv === '/')) {
          return { valid: false, error: `Некорректная последовательность операторов: ${av}${bv}` };
        }
      }
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Ошибка валидации'
    };
  }
}

/**
 * Получает список используемых переменных в формуле
 */
export function getFormulaVariables(formula: string): string[] {
  try {
    const expression = formula.startsWith('=') ? formula.slice(1) : formula;
    const tokens = tokenize(expression);
    
    const variables = new Set<string>();
    for (const token of tokens) {
      if (token.type === 'identifier') {
        variables.add(String(token.value));
      }
    }
    
    return Array.from(variables);
  } catch {
    return [];
  }
}

/**
 * Создает конфигурацию формулы
 */
export function createFormulaConfig(
  formula: string,
  returnType: ColumnType = 'text'
): FormulaConfig {
  return {
    expression: formula,
    dependencies: getFormulaVariables(formula),
    return_type: returnType
  };
}

/**
 * Преобразует результат формулы к нужному типу
 */
export function castFormulaResult(
  value: FormulaValue, 
  targetType: ColumnType
): FormulaValue {
  if (value == null) return null;
  
  switch (targetType) {
    case 'number': {
      const num = Number(value);
      return isNaN(num) ? null : num;
    }
    
    case 'text':
      return String(value);
    
    case 'boolean':
      return Boolean(value);
    
    case 'date':
      return value instanceof Date ? value : new Date(String(value));
    
    default:
      return value;
  }
}

/**
 * Описание доступных функций для UI
 */
export const FORMULA_FUNCTIONS = [
  // Математические функции
  {
    name: 'ABS',
    category: 'math',
    description: 'Абсолютное значение числа',
    params: [{ name: 'value', type: 'number', optional: false }],
    examples: ['ABS(-5)', 'ABS({amount})']
  },
  {
    name: 'CEIL',
    category: 'math',
    description: 'Округление вверх',
    params: [{ name: 'value', type: 'number', optional: false }],
    examples: ['CEIL(4.3)', 'CEIL({price})']
  },
  {
    name: 'FLOOR',
    category: 'math',
    description: 'Округление вниз',
    params: [{ name: 'value', type: 'number', optional: false }],
    examples: ['FLOOR(4.7)', 'FLOOR({price})']
  },
  {
    name: 'ROUND',
    category: 'math',
    description: 'Математическое округление',
    params: [{ name: 'value', type: 'number', optional: false }],
    examples: ['ROUND(4.5)', 'ROUND({price})']
  },
  {
    name: 'SUM',
    category: 'math',
    description: 'Сумма чисел',
    params: [{ name: 'values', type: 'number...', optional: false }],
    examples: ['SUM(1, 2, 3)', 'SUM({price}, {tax})']
  },
  {
    name: 'AVG',
    category: 'math',
    description: 'Среднее значение',
    params: [{ name: 'values', type: 'number...', optional: false }],
    examples: ['AVG(1, 2, 3)', 'AVG({score1}, {score2})']
  },
  {
    name: 'MIN',
    category: 'math',
    description: 'Минимальное значение',
    params: [{ name: 'values', type: 'number...', optional: false }],
    examples: ['MIN(1, 5, 3)', 'MIN({price1}, {price2})']
  },
  {
    name: 'MAX',
    category: 'math',
    description: 'Максимальное значение',
    params: [{ name: 'values', type: 'number...', optional: false }],
    examples: ['MAX(1, 5, 3)', 'MAX({price1}, {price2})']
  },
  
  // Строковые функции
  {
    name: 'UPPER',
    category: 'string',
    description: 'В верхний регистр',
    params: [{ name: 'text', type: 'string', optional: false }],
    examples: ['UPPER("hello")', 'UPPER({name})']
  },
  {
    name: 'LOWER',
    category: 'string',
    description: 'В нижний регистр',
    params: [{ name: 'text', type: 'string', optional: false }],
    examples: ['LOWER("HELLO")', 'LOWER({name})']
  },
  {
    name: 'TRIM',
    category: 'string',
    description: 'Удалить пробелы',
    params: [{ name: 'text', type: 'string', optional: false }],
    examples: ['TRIM("  hello  ")', 'TRIM({name})']
  },
  {
    name: 'CONCAT',
    category: 'string',
    description: 'Объединить строки',
    params: [{ name: 'texts', type: 'string...', optional: false }],
    examples: ['CONCAT("Hello", " ", "World")', 'CONCAT({first}, " ", {last})']
  },
  {
    name: 'LENGTH',
    category: 'string',
    description: 'Длина строки',
    params: [{ name: 'text', type: 'string', optional: false }],
    examples: ['LENGTH("hello")', 'LENGTH({description})']
  },
  
  // Функции даты
  {
    name: 'NOW',
    category: 'date',
    description: 'Текущая дата и время',
    params: [],
    examples: ['NOW()']
  },
  {
    name: 'TODAY',
    category: 'date',
    description: 'Текущая дата',
    params: [],
    examples: ['TODAY()']
  },
  {
    name: 'YEAR',
    category: 'date',
    description: 'Год из даты',
    params: [{ name: 'date', type: 'date', optional: false }],
    examples: ['YEAR({created_at})']
  },
  {
    name: 'MONTH',
    category: 'date',
    description: 'Месяц из даты',
    params: [{ name: 'date', type: 'date', optional: false }],
    examples: ['MONTH({created_at})']
  },
  {
    name: 'DAY',
    category: 'date',
    description: 'День из даты',
    params: [{ name: 'date', type: 'date', optional: false }],
    examples: ['DAY({created_at})']
  },
  
  // Логические функции
  {
    name: 'IF',
    category: 'logical',
    description: 'Условное значение',
    params: [
      { name: 'condition', type: 'boolean', optional: false },
      { name: 'ifTrue', type: 'any', optional: false },
      { name: 'ifFalse', type: 'any', optional: false }
    ],
    examples: ['IF({status} == "active", "Да", "Нет")']
  },
  {
    name: 'AND',
    category: 'logical',
    description: 'Логическое И',
    params: [{ name: 'values', type: 'boolean...', optional: false }],
    examples: ['AND({active}, {verified})']
  },
  {
    name: 'OR',
    category: 'logical',
    description: 'Логическое ИЛИ',
    params: [{ name: 'values', type: 'boolean...', optional: false }],
    examples: ['OR({active}, {premium})']
  },
  {
    name: 'NOT',
    category: 'logical',
    description: 'Логическое НЕ',
    params: [{ name: 'value', type: 'boolean', optional: false }],
    examples: ['NOT({archived})']
  }
];

/**
 * Примеры формул для документации
 */
export const formulaExamples = [
  { formula: '=price * quantity', description: 'Умножение двух колонок' },
  { formula: '=IF(status == "active", "Да", "Нет")', description: 'Условное выражение' },
  { formula: '=UPPER(name)', description: 'Преобразование в верхний регистр' },
  { formula: '=SUM(amount, tax, shipping)', description: 'Сумма нескольких колонок' },
  { formula: '=DATEDIFF(end_date, start_date)', description: 'Разница между датами в днях' },
  { formula: '=CONCAT(first_name, " ", last_name)', description: 'Объединение строк' },
  { formula: '=ROUND(price * 1.2, 2)', description: 'Округление с налогом' },
  { formula: '=NOW()', description: 'Текущая дата и время' },
];

/**
 * Парсит формулу в AST
 */
export function parseFormula(formula: string): FormulaAST {
  try {
    const tokens = tokenize(formula);
    return parseExpression(tokens);
  } catch (error) {
    throw new Error(`Invalid syntax: ${error}`);
  }
}

/**
 * Парсит выражение из токенов
 */
function parseExpression(tokens: Token[]): FormulaAST {
  let index = 0;

  function parseOr(): FormulaAST {
    let left = parseAnd();

    while (index < tokens.length && tokens[index]?.type === 'operator' && tokens[index].value === '||') {
      index++;
      const right = parseAnd();
      left = {
        type: 'binary',
        operator: '||',
        left,
        right
      };
    }

    return left;
  }

  function parseAnd(): FormulaAST {
    let left = parseEquality();

    while (index < tokens.length && tokens[index]?.type === 'operator' && tokens[index].value === '&&') {
      index++;
      const right = parseEquality();
      left = {
        type: 'binary',
        operator: '&&',
        left,
        right
      };
    }

    return left;
  }

  function parseEquality(): FormulaAST {
    let left = parseComparison();

    while (index < tokens.length && tokens[index]?.type === 'operator' && 
           (tokens[index].value === '==' || tokens[index].value === '!=')) {
      const op = String(tokens[index].value);
      index++;
      const right = parseComparison();
      left = {
        type: 'binary',
        operator: op,
        left,
        right
      };
    }

    return left;
  }

  function parseComparison(): FormulaAST {
    let left = parseAddSub();

    while (index < tokens.length && tokens[index]?.type === 'operator' && 
           ['<', '<=', '>', '>='].includes(String(tokens[index].value))) {
      const op = String(tokens[index].value);
      index++;
      const right = parseAddSub();
      left = {
        type: 'binary',
        operator: op,
        left,
        right
      };
    }

    return left;
  }

  function parseAddSub(): FormulaAST {
    let left = parseMulDiv();

    while (index < tokens.length && tokens[index]?.type === 'operator' && 
           (tokens[index].value === '+' || tokens[index].value === '-')) {
      const op = String(tokens[index].value);
      index++;
      const right = parseMulDiv();
      left = {
        type: 'binary',
        operator: op,
        left,
        right
      };
    }

    return left;
  }

  function parseMulDiv(): FormulaAST {
    let left = parseUnary();

    while (index < tokens.length && tokens[index]?.type === 'operator' && 
           (tokens[index].value === '*' || tokens[index].value === '/' || tokens[index].value === '%')) {
      const op = String(tokens[index].value);
      index++;
      const right = parseUnary();
      left = {
        type: 'binary',
        operator: op,
        left,
        right
      };
    }

    return left;
  }

  function parseUnary(): FormulaAST {
    if (index < tokens.length && tokens[index]?.type === 'operator' && 
        (tokens[index].value === '+' || tokens[index].value === '-')) {
      const op = String(tokens[index].value);
      index++;
      return {
        type: 'unary',
        operator: op,
        operand: parsePrimary()
      };
    }

    return parsePrimary();
  }

  function parsePrimary(): FormulaAST {
    if (index >= tokens.length) {
      throw new Error('Unexpected end of expression');
    }

    const token = tokens[index++];

    if (token.type === 'number') {
      return { type: 'number', value: token.value };
    }

    if (token.type === 'string') {
      return { type: 'string', value: token.value };
    }

    if (token.type === 'boolean') {
      return { type: 'boolean', value: token.value };
    }

    if (token.type === 'identifier') {
      if (index < tokens.length && tokens[index]?.type === 'paren' && tokens[index].value === '(') {
        // Function call
        index++; // skip '('
        const args: FormulaAST[] = [];
        
        if (index < tokens.length && tokens[index]?.type !== 'paren' || tokens[index]?.value !== ')') {
          args.push(parseExpression(tokens));
          
          while (index < tokens.length && tokens[index]?.type === 'paren' && tokens[index].value === ',') {
            index++; // skip ','
            args.push(parseExpression(tokens));
          }
        }
        
        if (index >= tokens.length || tokens[index]?.type !== 'paren' || tokens[index].value !== ')') {
          throw new Error('Expected closing parenthesis');
        }
        index++; // skip ')'
        
        return {
          type: 'function',
          name: String(token.value).toUpperCase(),
          args
        };
      } else {
        // Column reference
        return {
          type: 'column',
          name: String(token.value).replace(/[{}]/g, '')
        };
      }
    }

    if (token.type === 'paren' && token.value === '(') {
      const result = parseExpression(tokens);
      if (index >= tokens.length || tokens[index]?.type !== 'paren' || tokens[index].value !== ')') {
        throw new Error('Expected closing parenthesis');
      }
      index++; // skip ')'
      return result;
    }

    throw new Error(`Unexpected token: ${token.type} ${token.value}`);
  }

  return parseOr();
}

/**
 * Вычисляет формулу с контекстом
 */
export function evaluateFormula(formula: string, context: FormulaContext): FormulaValue {
  try {
    const tokens = tokenize(formula);
    return evaluate(tokens, context);
  } catch (error) {
    throw new Error(`Error evaluating formula: ${error}`);
  }
}

/**
 * Получает доступные функции
 */
export function getAvailableFunctions() {
  return {
    mathematical: ['SUM', 'AVG', 'MIN', 'MAX', 'COUNT', 'ABS', 'CEIL', 'FLOOR', 'ROUND', 'SQRT', 'POW'],
    string: ['UPPER', 'LOWER', 'TRIM', 'CONCAT', 'SUBSTRING', 'REPLACE', 'LENGTH'],
    date: ['NOW', 'TODAY', 'YEAR', 'MONTH', 'DAY', 'DATEADD', 'DATEDIFF', 'FORMATDATE'],
    logical: ['IF', 'AND', 'OR', 'NOT', 'ISNULL', 'ISEMPTY']
  };
}

/**
 * Класс FormulaEngine для управления формулами
 */
export class FormulaEngine {
  private formulas: Map<string, { expression: string; dependencies: string[] }> = new Map();
  private dependencies: Map<string, string[]> = new Map();

  createFormula(expression: string, deps: string[]) {
    return {
      expression,
      dependencies: deps
    };
  }

  addFormula(name: string, formula: { expression: string; dependencies: string[] }) {
    this.formulas.set(name, formula);
    this.dependencies.set(name, formula.dependencies || []);
  }

  evaluate(formula: { expression: string; dependencies: string[] }, context: FormulaContext): FormulaValue {
    return evaluateFormula(formula.expression, context);
  }

  getDependencies(name: string): string[] {
    return this.dependencies.get(name) || [];
  }

  evaluateAll(context: FormulaContext): Record<string, FormulaValue> {
    const results: Record<string, FormulaValue> = {};
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const evaluateFormula = (name: string): FormulaValue => {
      if (visiting.has(name)) {
        throw new Error('Circular dependency detected');
      }
      
      if (visited.has(name)) {
        return results[name];
      }

      const formula = this.formulas.get(name);
      if (!formula) {
        throw new Error(`Formula ${name} not found`);
      }

      visiting.add(name);
      const result = this.evaluate(formula, context);
      visiting.delete(name);
      visited.add(name);
      results[name] = result;

      return result;
    };

    for (const name of this.formulas.keys()) {
      evaluateFormula(name);
    }

    return results;
  }
}
