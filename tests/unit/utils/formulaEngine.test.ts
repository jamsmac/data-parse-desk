/**
 * Unit Tests: Formula Engine
 * Тесты для движка формул
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  FormulaEngine, 
  parseFormula, 
  evaluateFormula, 
  getAvailableFunctions,
  validateFormula 
} from '../../../src/utils/formulaEngine';

describe('FormulaEngine', () => {
  describe('parseFormula', () => {
    it('should parse simple mathematical expressions', () => {
      const result = parseFormula('2 + 3 * 4');
      expect(result).toEqual({
        type: 'binary',
        operator: '+',
        left: { type: 'number', value: 2 },
        right: {
          type: 'binary',
          operator: '*',
          left: { type: 'number', value: 3 },
          right: { type: 'number', value: 4 }
        }
      });
    });

    it('should parse function calls', () => {
      const result = parseFormula('SUM({amount})');
      expect(result).toEqual({
        type: 'function',
        name: 'SUM',
        args: [{ type: 'column', name: 'amount' }]
      });
    });

    it('should parse nested functions', () => {
      const result = parseFormula('IF({status} == "active", SUM({amount}), 0)');
      expect(result).toEqual({
        type: 'function',
        name: 'IF',
        args: [
          {
            type: 'binary',
            operator: '==',
            left: { type: 'column', name: 'status' },
            right: { type: 'string', value: 'active' }
          },
          {
            type: 'function',
            name: 'SUM',
            args: [{ type: 'column', name: 'amount' }]
          },
          { type: 'number', value: 0 }
        ]
      });
    });

    it('should handle parentheses correctly', () => {
      const result = parseFormula('(2 + 3) * 4');
      expect(result).toEqual({
        type: 'binary',
        operator: '*',
        left: {
          type: 'binary',
          operator: '+',
          left: { type: 'number', value: 2 },
          right: { type: 'number', value: 3 }
        },
        right: { type: 'number', value: 4 }
      });
    });

    it('should throw error for invalid syntax', () => {
      expect(() => parseFormula('2 + + 3')).toThrow('Invalid syntax');
      expect(() => parseFormula('SUM(')).toThrow('Invalid syntax');
      expect(() => parseFormula('2 + )')).toThrow('Invalid syntax');
    });
  });

  describe('evaluateFormula', () => {
    const testData = {
      amount: 100,
      quantity: 5,
      price: 20,
      status: 'active',
      date: '2025-01-01'
    };

    it('should evaluate simple mathematical expressions', () => {
      expect(evaluateFormula('2 + 3', testData)).toBe(5);
      expect(evaluateFormula('10 - 4', testData)).toBe(6);
      expect(evaluateFormula('3 * 4', testData)).toBe(12);
      expect(evaluateFormula('15 / 3', testData)).toBe(5);
      expect(evaluateFormula('2 ^ 3', testData)).toBe(8);
    });

    it('should evaluate column references', () => {
      expect(evaluateFormula('{amount}', testData)).toBe(100);
      expect(evaluateFormula('{quantity} * {price}', testData)).toBe(100);
    });

    it('should evaluate mathematical functions', () => {
      expect(evaluateFormula('ABS(-5)', testData)).toBe(5);
      expect(evaluateFormula('ROUND(3.7)', testData)).toBe(4);
      expect(evaluateFormula('CEIL(3.2)', testData)).toBe(4);
      expect(evaluateFormula('FLOOR(3.8)', testData)).toBe(3);
      expect(evaluateFormula('SQRT(16)', testData)).toBe(4);
      expect(evaluateFormula('POW(2, 3)', testData)).toBe(8);
    });

    it('should evaluate string functions', () => {
      expect(evaluateFormula('UPPER("hello")', testData)).toBe('HELLO');
      expect(evaluateFormula('LOWER("WORLD")', testData)).toBe('world');
      expect(evaluateFormula('TRIM("  test  ")', testData)).toBe('test');
      expect(evaluateFormula('LENGTH("hello")', testData)).toBe(5);
      expect(evaluateFormula('CONCAT("Hello", " ", "World")', testData)).toBe('Hello World');
    });

    it('should evaluate date functions', () => {
      expect(evaluateFormula('YEAR({date})', testData)).toBe(2025);
      expect(evaluateFormula('MONTH({date})', testData)).toBe(1);
      expect(evaluateFormula('DAY({date})', testData)).toBe(1);
      expect(evaluateFormula('NOW()', testData)).toBeInstanceOf(Date);
      expect(evaluateFormula('TODAY()', testData)).toBeInstanceOf(Date);
    });

    it('should evaluate logical functions', () => {
      expect(evaluateFormula('IF({status} == "active", 1, 0)', testData)).toBe(1);
      expect(evaluateFormula('AND(true, true)', testData)).toBe(true);
      expect(evaluateFormula('OR(false, true)', testData)).toBe(true);
      expect(evaluateFormula('NOT(false)', testData)).toBe(true);
      expect(evaluateFormula('ISNULL(null)', testData)).toBe(true);
      expect(evaluateFormula('ISEMPTY("")', testData)).toBe(true);
    });

    it('should evaluate aggregation functions', () => {
      const arrayData = [1, 2, 3, 4, 5];
      expect(evaluateFormula('SUM({amounts})', { amounts: arrayData })).toBe(15);
      expect(evaluateFormula('AVG({amounts})', { amounts: arrayData })).toBe(3);
      expect(evaluateFormula('MIN({amounts})', { amounts: arrayData })).toBe(1);
      expect(evaluateFormula('MAX({amounts})', { amounts: arrayData })).toBe(5);
      expect(evaluateFormula('COUNT({amounts})', { amounts: arrayData })).toBe(5);
    });

    it('should handle complex nested expressions', () => {
      const result = evaluateFormula(
        'IF({status} == "active", SUM({amounts}) * 1.1, SUM({amounts}) * 0.9)',
        { status: 'active', amounts: [10, 20, 30] }
      );
      expect(result).toBe(66); // (10+20+30) * 1.1 = 66
    });

    it('should throw error for invalid expressions', () => {
      expect(() => evaluateFormula('INVALID_FUNCTION()', testData)).toThrow('Unknown function');
      expect(() => evaluateFormula('{nonexistent}', testData)).toThrow('Column not found');
      expect(() => evaluateFormula('1 / 0', testData)).toThrow('Division by zero');
    });
  });

  describe('validateFormula', () => {
    it('should validate correct formulas', () => {
      expect(validateFormula('2 + 3')).toBe(true);
      expect(validateFormula('SUM({amount})')).toBe(true);
      expect(validateFormula('IF({status} == "active", 1, 0)')).toBe(true);
    });

    it('should reject invalid formulas', () => {
      expect(validateFormula('2 + + 3')).toBe(false);
      expect(validateFormula('SUM(')).toBe(false);
      expect(validateFormula('INVALID_FUNCTION()')).toBe(false);
    });
  });

  describe('getAvailableFunctions', () => {
    it('should return all available functions', () => {
      const functions = getAvailableFunctions();
      
      expect(functions).toContain('SUM');
      expect(functions).toContain('AVG');
      expect(functions).toContain('IF');
      expect(functions).toContain('UPPER');
      expect(functions).toContain('NOW');
      expect(functions).toContain('ABS');
    });

    it('should categorize functions correctly', () => {
      const functions = getAvailableFunctions();
      
      expect(functions.mathematical).toContain('SUM');
      expect(functions.mathematical).toContain('AVG');
      expect(functions.string).toContain('UPPER');
      expect(functions.string).toContain('LOWER');
      expect(functions.date).toContain('NOW');
      expect(functions.date).toContain('TODAY');
      expect(functions.logical).toContain('IF');
      expect(functions.logical).toContain('AND');
    });
  });

  describe('FormulaEngine class', () => {
    let engine: FormulaEngine;

    beforeEach(() => {
      engine = new FormulaEngine();
    });

    it('should create formula with dependencies', () => {
      const formula = engine.createFormula('SUM({amount})', ['amount']);
      expect(formula.expression).toBe('SUM({amount})');
      expect(formula.dependencies).toEqual(['amount']);
    });

    it('should evaluate formula with context', () => {
      const formula = engine.createFormula('{amount} * 1.1', ['amount']);
      const result = engine.evaluate(formula, { amount: 100 });
      expect(result).toBe(110);
    });

    it('should track dependencies correctly', () => {
      const formula1 = engine.createFormula('{amount} * 2', ['amount']);
      const formula2 = engine.createFormula('{amount} * 3', ['amount']);
      
      engine.addFormula('total1', formula1);
      engine.addFormula('total2', formula2);
      
      const dependencies = engine.getDependencies('total1');
      expect(dependencies).toEqual(['amount']);
    });

    it('should recalculate dependent formulas', () => {
      const formula1 = engine.createFormula('{amount} * 2', ['amount']);
      const formula2 = engine.createFormula('{total1} + 10', ['total1']);
      
      engine.addFormula('total1', formula1);
      engine.addFormula('total2', formula2);
      
      const results = engine.evaluateAll({ amount: 100 });
      expect(results.total1).toBe(200);
      expect(results.total2).toBe(210);
    });

    it('should handle circular dependencies', () => {
      const formula1 = engine.createFormula('{total2} + 1', ['total2']);
      const formula2 = engine.createFormula('{total1} + 1', ['total1']);
      
      engine.addFormula('total1', formula1);
      engine.addFormula('total2', formula2);
      
      expect(() => engine.evaluateAll({})).toThrow('Circular dependency detected');
    });
  });
});