/**
 * Formula Engine Tests
 * Critical security and functionality tests for the safe formula evaluator
 */

import { describe, it, expect } from 'vitest';

// Mock formula engine (will be implemented)
// This tests the SAFE recursive descent parser from evaluate-formula edge function
function safeEval(expr: string): number {
  expr = expr.replace(/\s+/g, '');

  let pos = 0;

  function parseNumber(): number {
    let num = '';
    while (pos < expr.length && (expr[pos].match(/[0-9.]/) || (expr[pos] === '-' && num === ''))) {
      num += expr[pos++];
    }
    if (num === '' || num === '-') throw new Error('Invalid number');
    return parseFloat(num);
  }

  function parseFactor(): number {
    if (expr[pos] === '(') {
      pos++;
      const result = parseExpression();
      if (expr[pos] !== ')') throw new Error('Missing closing parenthesis');
      pos++;
      return result;
    }
    return parseNumber();
  }

  function parseTerm(): number {
    let result = parseFactor();

    while (pos < expr.length && (expr[pos] === '*' || expr[pos] === '/')) {
      const op = expr[pos++];
      const right = parseFactor();
      if (op === '*') {
        result *= right;
      } else {
        if (right === 0) throw new Error('Division by zero');
        result /= right;
      }
    }

    return result;
  }

  function parseExpression(): number {
    let result = parseTerm();

    while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) {
      const op = expr[pos++];
      const right = parseTerm();
      if (op === '+') {
        result += right;
      } else {
        result -= right;
      }
    }

    return result;
  }

  const result = parseExpression();

  if (pos < expr.length) {
    throw new Error('Unexpected characters after expression');
  }

  return result;
}

describe('Formula Engine - Security Tests', () => {
  describe('Code Injection Protection', () => {
    it('должен блокировать eval injection', () => {
      expect(() => safeEval('eval("alert(1)")')).toThrow();
    });

    it('должен блокировать Function constructor', () => {
      expect(() => safeEval('Function("return this")()')).toThrow();
    });

    it('должен блокировать попытки выполнения кода через __proto__', () => {
      expect(() => safeEval('__proto__.polluted')).toThrow();
    });

    it('должен блокировать попытки доступа к window', () => {
      expect(() => safeEval('window.location')).toThrow();
    });

    it('должен блокировать попытки доступа к document', () => {
      expect(() => safeEval('document.cookie')).toThrow();
    });

    it('должен блокировать SQL injection попытки', () => {
      expect(() => safeEval("'; DROP TABLE users; --")).toThrow();
    });

    it('должен блокировать JavaScript keywords', () => {
      expect(() => safeEval('return 1')).toThrow();
      expect(() => safeEval('var x = 1')).toThrow();
      expect(() => safeEval('let x = 1')).toThrow();
      expect(() => safeEval('const x = 1')).toThrow();
    });

    it('должен блокировать символы вне математических операций', () => {
      expect(() => safeEval('1 & 2')).toThrow(); // bitwise AND
      expect(() => safeEval('1 | 2')).toThrow(); // bitwise OR
      expect(() => safeEval('1 ^ 2')).toThrow(); // bitwise XOR
      expect(() => safeEval('~1')).toThrow(); // bitwise NOT
    });
  });

  describe('Mathematical Operations', () => {
    it('должен вычислять простое сложение', () => {
      expect(safeEval('2 + 3')).toBe(5);
    });

    it('должен вычислять вычитание', () => {
      expect(safeEval('10 - 4')).toBe(6);
    });

    it('должен вычислять умножение', () => {
      expect(safeEval('6 * 7')).toBe(42);
    });

    it('должен вычислять деление', () => {
      expect(safeEval('20 / 4')).toBe(5);
    });

    it('должен соблюдать порядок операций', () => {
      expect(safeEval('2 + 3 * 4')).toBe(14); // 2 + 12
      expect(safeEval('(2 + 3) * 4')).toBe(20); // 5 * 4
    });

    it('должен обрабатывать скобки', () => {
      expect(safeEval('(10 + 5) * (3 - 1)')).toBe(30); // 15 * 2
    });

    it('должен обрабатывать вложенные скобки', () => {
      expect(safeEval('((2 + 3) * (4 + 1))')).toBe(25); // (5 * 5)
    });

    it('должен обрабатывать отрицательные числа', () => {
      expect(safeEval('-5 + 3')).toBe(-2);
      expect(safeEval('10 + -5')).toBe(5);
    });

    it('должен обрабатывать десятичные дроби', () => {
      expect(safeEval('1.5 + 2.5')).toBe(4);
      expect(safeEval('10.5 / 2')).toBe(5.25);
    });

    it('должен обрабатывать сложные выражения', () => {
      expect(safeEval('((10 + 5) * 2 - 8) / 2')).toBe(11); // ((15 * 2) - 8) / 2 = 22 / 2
    });
  });

  describe('Error Handling', () => {
    it('должен выбрасывать ошибку при делении на ноль', () => {
      expect(() => safeEval('10 / 0')).toThrow('Division by zero');
    });

    it('должен выбрасывать ошибку при незакрытой скобке', () => {
      expect(() => safeEval('(2 + 3')).toThrow('Missing closing parenthesis');
    });

    it('должен выбрасывать ошибку при лишних символах', () => {
      expect(() => safeEval('2 + 3 x')).toThrow('Unexpected characters');
    });

    it('должен выбрасывать ошибку при пустом выражении', () => {
      expect(() => safeEval('')).toThrow('Invalid number');
    });

    it('должен выбрасывать ошибку при некорректном числе', () => {
      expect(() => safeEval('2 + + 3')).toThrow();
    });

    it('должен выбрасывать ошибку при отсутствии операнда', () => {
      expect(() => safeEval('2 +')).toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('должен обрабатывать пробелы', () => {
      expect(safeEval('  2  +  3  ')).toBe(5);
    });

    it('должен обрабатывать ноль', () => {
      expect(safeEval('0 + 0')).toBe(0);
      expect(safeEval('5 * 0')).toBe(0);
      expect(safeEval('0 / 5')).toBe(0);
    });

    it('должен обрабатывать большие числа', () => {
      expect(safeEval('999999 + 1')).toBe(1000000);
    });

    it('должен обрабатывать очень маленькие десятичные дроби', () => {
      expect(safeEval('0.1 + 0.2')).toBeCloseTo(0.3);
    });

    it('должен обрабатывать одиночное число', () => {
      expect(safeEval('42')).toBe(42);
    });

    it('должен обрабатывать только скобки с числом', () => {
      expect(safeEval('(5)')).toBe(5);
    });

    it('должен обрабатывать множественные скобки', () => {
      expect(safeEval('((((5))))')).toBe(5);
    });
  });

  describe('Performance', () => {
    it('должен быстро обрабатывать простые выражения', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        safeEval('2 + 3 * 4');
      }
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // 1000 iterations < 100ms
    });

    it('должен обрабатывать длинные выражения', () => {
      const longExpr = Array(100).fill('1 + 1').join(' + ');
      expect(safeEval(longExpr)).toBe(200);
    });
  });
});

describe('Formula Engine - Integration with Row Data', () => {
  function evaluateWithContext(formula: string, context: Record<string, any>): number {
    // Replace {column_name} with actual values
    let processed = formula;
    for (const [key, value] of Object.entries(context)) {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    }

    return safeEval(processed);
  }

  it('должен заменять переменные из контекста', () => {
    const result = evaluateWithContext('{price} * {quantity}', {
      price: 10,
      quantity: 5
    });

    expect(result).toBe(50);
  });

  it('должен обрабатывать несколько переменных', () => {
    const result = evaluateWithContext('({price} + {tax}) * {quantity}', {
      price: 100,
      tax: 10,
      quantity: 2
    });

    expect(result).toBe(220);
  });

  it('должен обрабатывать повторяющиеся переменные', () => {
    const result = evaluateWithContext('{price} * {price}', {
      price: 5
    });

    expect(result).toBe(25);
  });

  it('должен выбрасывать ошибку при отсутствующей переменной', () => {
    expect(() => {
      evaluateWithContext('{missing} * 2', { price: 10 });
    }).toThrow();
  });

  it('должен обрабатывать десятичные значения переменных', () => {
    const result = evaluateWithContext('{price} * {rate}', {
      price: 100.50,
      rate: 1.15
    });

    expect(result).toBeCloseTo(115.575);
  });
});
