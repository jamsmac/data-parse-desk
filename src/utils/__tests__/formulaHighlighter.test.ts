/**
 * Тесты для утилиты подсветки синтаксиса формул
 */

import { describe, it, expect } from 'vitest';
import {
  tokenizeForHighlight,
  getTokenColor,
  highlightFormula,
  getSuggestions,
  getFunctionInfo
} from '../formulaHighlighter';

describe('FormulaHighlighter', () => {
  describe('tokenizeForHighlight', () => {
    it('должен токенизировать простые числа', () => {
      const tokens = tokenizeForHighlight('123');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        type: 'number',
        value: '123',
        start: 0,
        end: 3
      });
    });

    it('должен токенизировать строки в кавычках', () => {
      const tokens = tokenizeForHighlight('"hello world"');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        type: 'string',
        value: '"hello world"'
      });
    });

    it('должен токенизировать колонки в фигурных скобках', () => {
      const tokens = tokenizeForHighlight('{column_name}');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        type: 'column',
        value: '{column_name}'
      });
    });

    it('должен токенизировать функции', () => {
      const tokens = tokenizeForHighlight('SUM(1, 2)');
      expect(tokens[0]).toMatchObject({
        type: 'function',
        value: 'SUM'
      });
    });

    it('должен токенизировать операторы', () => {
      const tokens = tokenizeForHighlight('2 + 3 * 4');
      const operators = tokens.filter(t => t.type === 'operator');
      expect(operators).toHaveLength(2);
      expect(operators[0].value).toBe('+');
      expect(operators[1].value).toBe('*');
    });

    it('должен токенизировать скобки', () => {
      const tokens = tokenizeForHighlight('(2 + 3)');
      const parens = tokens.filter(t => t.type === 'paren');
      expect(parens).toHaveLength(2);
      expect(parens[0].value).toBe('(');
      expect(parens[1].value).toBe(')');
    });

    it('должен токенизировать сложную формулу', () => {
      const formula = 'IF({status} = "active", SUM({price}, {tax}), 0)';
      const tokens = tokenizeForHighlight(formula);

      // Проверяем наличие всех типов токенов
      const types = new Set(tokens.map(t => t.type));
      expect(types.has('function')).toBe(true);
      expect(types.has('column')).toBe(true);
      expect(types.has('string')).toBe(true);
      expect(types.has('number')).toBe(true);
      expect(types.has('operator')).toBe(true);
      expect(types.has('paren')).toBe(true);
    });
  });

  describe('getTokenColor', () => {
    it('должен возвращать правильные цвета для каждого типа', () => {
      expect(getTokenColor('function')).toContain('blue');
      expect(getTokenColor('column')).toContain('green');
      expect(getTokenColor('string')).toContain('orange');
      expect(getTokenColor('number')).toContain('purple');
      expect(getTokenColor('operator')).toContain('gray');
      expect(getTokenColor('paren')).toContain('gray');
      expect(getTokenColor('text')).toContain('gray');
    });

    it('должен возвращать цвет по умолчанию для неизвестного типа', () => {
      expect(getTokenColor('unknown' as never)).toContain('gray');
    });
  });

  describe('highlightFormula', () => {
    it('должен генерировать HTML с правильными классами', () => {
      const html = highlightFormula('SUM(1, 2)');
      expect(html).toContain('<span class="text-blue');  // SUM - функция
      expect(html).toContain('<span class="text-purple'); // 1, 2 - числа
      expect(html).toContain('<span class="text-gray');   // скобки
    });

    it('должен экранировать HTML символы', () => {
      const html = highlightFormula('"<script>alert(1)</script>"');
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
    });

    it('должен обрабатывать пустую строку', () => {
      const html = highlightFormula('');
      expect(html).toBe('');
    });
  });

  describe('getSuggestions', () => {
    const columns = [
      { name: 'price', type: 'number' },
      { name: 'product_name', type: 'text' },
      { name: 'quantity', type: 'number' }
    ];

    it('должен предлагать функции при вводе их начала', () => {
      const suggestions = getSuggestions('SU', 2, columns);
      expect(suggestions).toContain('SUM');
      expect(suggestions).toContain('SUBSTRING');
    });

    it('должен предлагать колонки внутри фигурных скобок', () => {
      const suggestions = getSuggestions('{pr', 3, columns);
      expect(suggestions).toContain('price');
      expect(suggestions).toContain('product_name');
      expect(suggestions).not.toContain('quantity');
    });

    it('должен предлагать все варианты при пустом вводе', () => {
      const suggestions = getSuggestions('', 0, columns);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.startsWith('{'))).toBe(true);
    });

    it('должен возвращать пустой массив если нет совпадений', () => {
      const suggestions = getSuggestions('XYZ', 3, columns);
      expect(suggestions).toEqual([]);
    });
  });

  describe('getFunctionInfo', () => {
    it('должен возвращать информацию о математических функциях', () => {
      const info = getFunctionInfo('abs');
      expect(info).not.toBeNull();
      expect(info?.name).toBe('ABS');
      expect(info?.category).toBe('math');
      expect(info?.description).toBeTruthy();
      expect(info?.examples).toHaveLength(2);
    });

    it('должен возвращать информацию о строковых функциях', () => {
      const info = getFunctionInfo('concat');
      expect(info).not.toBeNull();
      expect(info?.category).toBe('string');
      expect(info?.examples.length).toBeGreaterThan(0);
    });

    it('должен возвращать информацию о функциях дат', () => {
      const info = getFunctionInfo('now');
      expect(info).not.toBeNull();
      expect(info?.category).toBe('date');
    });

    it('должен возвращать информацию о логических функциях', () => {
      const info = getFunctionInfo('if');
      expect(info).not.toBeNull();
      expect(info?.category).toBe('logic');
      expect(info?.examples).toContain('IF({score} > 50, "pass", "fail")');
    });

    it('должен возвращать null для неизвестной функции', () => {
      const info = getFunctionInfo('unknown_function');
      expect(info).toBeNull();
    });

    it('должен быть case-insensitive', () => {
      const info1 = getFunctionInfo('ABS');
      const info2 = getFunctionInfo('abs');
      const info3 = getFunctionInfo('Abs');
      expect(info1).toEqual(info2);
      expect(info2).toEqual(info3);
    });
  });
});