/**
 * Утилита для подсветки синтаксиса формул
 */

export interface HighlightToken {
  type: 'function' | 'column' | 'string' | 'number' | 'operator' | 'paren' | 'text';
  value: string;
  start: number;
  end: number;
}

// Доступные функции для подсветки
const FORMULA_FUNCTIONS = [
  // Математические функции
  'abs', 'ceil', 'floor', 'round', 'sqrt', 'pow', 'min', 'max', 'sum', 'avg', 'count',
  // Строковые функции
  'upper', 'lower', 'trim', 'concat', 'substring', 'replace', 'length',
  // Функции дат
  'now', 'today', 'year', 'month', 'day', 'hour', 'minute', 'dateadd', 'datediff', 'formatdate',
  // Логические функции
  'if', 'and', 'or', 'not', 'isnull', 'isempty'
];

// Операторы
const OPERATORS = ['+', '-', '*', '/', '%', '^', '=', '!=', '<>', '<', '>', '<=', '>=', '&', '&&', '||', '!'];

/**
 * Токенизирует формулу для подсветки синтаксиса
 */
export function tokenizeForHighlight(formula: string): HighlightToken[] {
  const tokens: HighlightToken[] = [];
  let i = 0;

  while (i < formula.length) {
    const remainingFormula = formula.slice(i);

    // Пропускаем пробелы
    if (/^\s/.test(remainingFormula)) {
      const match = remainingFormula.match(/^\s+/);
      if (match) {
        tokens.push({
          type: 'text',
          value: match[0],
          start: i,
          end: i + match[0].length
        });
        i += match[0].length;
        continue;
      }
    }

    // Колонки в фигурных скобках
    if (remainingFormula[0] === '{') {
      const match = remainingFormula.match(/^\{[^}]+\}/);
      if (match) {
        tokens.push({
          type: 'column',
          value: match[0],
          start: i,
          end: i + match[0].length
        });
        i += match[0].length;
        continue;
      }
    }

    // Строки в кавычках
    if (remainingFormula[0] === '"' || remainingFormula[0] === "'") {
      const quote = remainingFormula[0];
      const regex = new RegExp(`^${quote}([^${quote}\\\\]|\\\\.)*${quote}`);
      const match = remainingFormula.match(regex);
      if (match) {
        tokens.push({
          type: 'string',
          value: match[0],
          start: i,
          end: i + match[0].length
        });
        i += match[0].length;
        continue;
      }
    }

    // Числа (включая десятичные)
    if (/^[0-9]/.test(remainingFormula)) {
      const match = remainingFormula.match(/^[0-9]+(\.[0-9]+)?/);
      if (match) {
        tokens.push({
          type: 'number',
          value: match[0],
          start: i,
          end: i + match[0].length
        });
        i += match[0].length;
        continue;
      }
    }

    // Функции (идентификаторы перед скобками)
    if (/^[a-zA-Z_]/.test(remainingFormula)) {
      const match = remainingFormula.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (match) {
        const word = match[0];
        const nextNonSpace = remainingFormula.slice(word.length).match(/^\s*(.)/);
        const isFunction = nextNonSpace && nextNonSpace[1] === '(';
        const isFunctionName = FORMULA_FUNCTIONS.includes(word.toLowerCase());

        tokens.push({
          type: (isFunction || isFunctionName) ? 'function' : 'text',
          value: word,
          start: i,
          end: i + word.length
        });
        i += word.length;
        continue;
      }
    }

    // Операторы (проверяем от длинных к коротким)
    let operatorFound = false;
    const sortedOperators = OPERATORS.sort((a, b) => b.length - a.length);
    for (const op of sortedOperators) {
      if (remainingFormula.startsWith(op)) {
        tokens.push({
          type: 'operator',
          value: op,
          start: i,
          end: i + op.length
        });
        i += op.length;
        operatorFound = true;
        break;
      }
    }
    if (operatorFound) continue;

    // Скобки
    if ('()[]'.includes(remainingFormula[0])) {
      tokens.push({
        type: 'paren',
        value: remainingFormula[0],
        start: i,
        end: i + 1
      });
      i++;
      continue;
    }

    // Запятые и другие символы
    if (',;'.includes(remainingFormula[0])) {
      tokens.push({
        type: 'text',
        value: remainingFormula[0],
        start: i,
        end: i + 1
      });
      i++;
      continue;
    }

    // Все остальное
    tokens.push({
      type: 'text',
      value: remainingFormula[0],
      start: i,
      end: i + 1
    });
    i++;
  }

  return tokens;
}

/**
 * Получает цвет для типа токена
 */
export function getTokenColor(type: HighlightToken['type']): string {
  const colorMap = {
    'function': 'text-blue-600 dark:text-blue-400',
    'column': 'text-green-600 dark:text-green-400',
    'string': 'text-orange-600 dark:text-orange-400',
    'number': 'text-purple-600 dark:text-purple-400',
    'operator': 'text-gray-600 dark:text-gray-400',
    'paren': 'text-gray-500 dark:text-gray-500',
    'text': 'text-gray-900 dark:text-gray-100'
  };
  return colorMap[type] || colorMap.text;
}

/**
 * Получает HTML для подсвеченной формулы
 */
export function highlightFormula(formula: string): string {
  const tokens = tokenizeForHighlight(formula);
  return tokens.map(token => {
    const color = getTokenColor(token.type);
    const value = escapeHtml(token.value);
    return `<span class="${color}">${value}</span>`;
  }).join('');
}

/**
 * Экранирует HTML символы
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Получает список предложений для автодополнения
 */
export function getSuggestions(
  formula: string,
  cursorPosition: number,
  columns: Array<{ name: string; type: string }>
): string[] {
  const suggestions: string[] = [];

  // Получаем текущее слово под курсором
  const beforeCursor = formula.slice(0, cursorPosition);
  const match = beforeCursor.match(/[a-zA-Z_][a-zA-Z0-9_]*$/);
  const currentWord = match ? match[0].toLowerCase() : '';

  // Проверяем, находимся ли мы в контексте колонки
  const inColumnContext = beforeCursor.lastIndexOf('{') > beforeCursor.lastIndexOf('}');

  if (inColumnContext) {
    // Предлагаем колонки
    return columns
      .filter(col => col.name.toLowerCase().startsWith(currentWord))
      .map(col => col.name);
  } else {
    // Предлагаем функции
    const functionSuggestions = FORMULA_FUNCTIONS
      .filter(func => func.startsWith(currentWord))
      .map(func => func.toUpperCase());

    // Если текущее слово пустое, добавляем колонки как предложения
    if (!currentWord) {
      const columnSuggestions = columns.map(col => `{${col.name}}`);
      return [...functionSuggestions, ...columnSuggestions];
    }

    return functionSuggestions;
  }
}

/**
 * Получает информацию о функции
 */
export function getFunctionInfo(functionName: string): {
  name: string;
  category: string;
  description: string;
  examples: string[];
} | null {
  const functionInfo: Record<string, { category: string; description: string; examples: string[] }> = {
    // Математические функции
    abs: { category: 'math', description: 'Абсолютное значение числа', examples: ['ABS(-5)', 'ABS({amount})'] },
    ceil: { category: 'math', description: 'Округление вверх', examples: ['CEIL(4.3)', 'CEIL({price})'] },
    floor: { category: 'math', description: 'Округление вниз', examples: ['FLOOR(4.7)', 'FLOOR({price})'] },
    round: { category: 'math', description: 'Математическое округление', examples: ['ROUND(4.5)', 'ROUND({price})'] },
    sqrt: { category: 'math', description: 'Квадратный корень', examples: ['SQRT(16)', 'SQRT({value})'] },
    pow: { category: 'math', description: 'Возведение в степень', examples: ['POW(2, 3)', 'POW({base}, {exp})'] },
    min: { category: 'math', description: 'Минимальное значение', examples: ['MIN(1, 5, 3)', 'MIN({a}, {b})'] },
    max: { category: 'math', description: 'Максимальное значение', examples: ['MAX(1, 5, 3)', 'MAX({a}, {b})'] },
    sum: { category: 'math', description: 'Сумма чисел', examples: ['SUM(1, 2, 3)', 'SUM({price}, {tax})'] },
    avg: { category: 'math', description: 'Среднее значение', examples: ['AVG(1, 2, 3)', 'AVG({scores})'] },

    // Строковые функции
    upper: { category: 'string', description: 'В верхний регистр', examples: ['UPPER("hello")', 'UPPER({name})'] },
    lower: { category: 'string', description: 'В нижний регистр', examples: ['LOWER("HELLO")', 'LOWER({name})'] },
    trim: { category: 'string', description: 'Удалить пробелы', examples: ['TRIM("  hello  ")', 'TRIM({text})'] },
    concat: { category: 'string', description: 'Объединить строки', examples: ['CONCAT("a", "b")', 'CONCAT({first}, {last})'] },
    substring: { category: 'string', description: 'Подстрока', examples: ['SUBSTRING("hello", 1, 3)', 'SUBSTRING({text}, 0, 5)'] },
    replace: { category: 'string', description: 'Заменить текст', examples: ['REPLACE("hello", "l", "r")', 'REPLACE({text}, "old", "new")'] },
    length: { category: 'string', description: 'Длина строки', examples: ['LENGTH("hello")', 'LENGTH({text})'] },

    // Функции дат
    now: { category: 'date', description: 'Текущая дата и время', examples: ['NOW()'] },
    today: { category: 'date', description: 'Сегодняшняя дата', examples: ['TODAY()'] },
    year: { category: 'date', description: 'Год из даты', examples: ['YEAR({date})', 'YEAR(TODAY())'] },
    month: { category: 'date', description: 'Месяц из даты', examples: ['MONTH({date})', 'MONTH(TODAY())'] },
    day: { category: 'date', description: 'День из даты', examples: ['DAY({date})', 'DAY(TODAY())'] },

    // Логические функции
    if: { category: 'logic', description: 'Условное выражение', examples: ['IF({score} > 50, "pass", "fail")', 'IF({status} = "active", 1, 0)'] },
    and: { category: 'logic', description: 'Логическое И', examples: ['AND({a} > 0, {b} < 100)', 'AND({active}, {verified})'] },
    or: { category: 'logic', description: 'Логическое ИЛИ', examples: ['OR({a} > 0, {b} > 0)', 'OR({status1}, {status2})'] },
    not: { category: 'logic', description: 'Логическое НЕ', examples: ['NOT({active})', 'NOT({deleted})'] },
    isnull: { category: 'logic', description: 'Проверка на NULL', examples: ['ISNULL({field})', 'IF(ISNULL({value}), 0, {value})'] },
    isempty: { category: 'logic', description: 'Проверка на пустоту', examples: ['ISEMPTY({text})', 'IF(ISEMPTY({name}), "N/A", {name})'] }
  };

  const info = functionInfo[functionName.toLowerCase()];
  return info ? { name: functionName.toUpperCase(), ...info } : null;
}