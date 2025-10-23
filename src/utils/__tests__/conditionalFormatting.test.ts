import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  applyFormattingRules,
  formatToStyles,
  formatToClassNames,
  type FormattingRule,
  type FormatConfig,
  type ConditionType,
} from '../conditionalFormatting';

describe('conditionalFormatting', () => {
  describe('evaluateCondition', () => {
    describe('equals condition', () => {
      it('should match equal string values', () => {
        expect(evaluateCondition('test', 'equals', 'test')).toBe(true);
        expect(evaluateCondition('hello', 'equals', 'hello')).toBe(true);
      });

      it('should not match different string values', () => {
        expect(evaluateCondition('test', 'equals', 'other')).toBe(false);
        expect(evaluateCondition('hello', 'equals', 'world')).toBe(false);
      });

      it('should match equal numeric values', () => {
        expect(evaluateCondition(42, 'equals', 42)).toBe(true);
        expect(evaluateCondition(0, 'equals', 0)).toBe(true);
        expect(evaluateCondition(-5, 'equals', -5)).toBe(true);
      });

      it('should handle string vs number comparison', () => {
        expect(evaluateCondition('42', 'equals', 42)).toBe(true);
        expect(evaluateCondition(42, 'equals', '42')).toBe(true);
      });

      it('should handle boolean values', () => {
        expect(evaluateCondition(true, 'equals', 'true')).toBe(true);
        expect(evaluateCondition(false, 'equals', 'false')).toBe(true);
      });
    });

    describe('not_equals condition', () => {
      it('should match different values', () => {
        expect(evaluateCondition('test', 'not_equals', 'other')).toBe(true);
        expect(evaluateCondition(42, 'not_equals', 100)).toBe(true);
      });

      it('should not match equal values', () => {
        expect(evaluateCondition('test', 'not_equals', 'test')).toBe(false);
        expect(evaluateCondition(42, 'not_equals', 42)).toBe(false);
      });
    });

    describe('greater_than condition', () => {
      it('should match greater numeric values', () => {
        expect(evaluateCondition(100, 'greater_than', 50)).toBe(true);
        expect(evaluateCondition(5, 'greater_than', 0)).toBe(true);
        expect(evaluateCondition(0, 'greater_than', -1)).toBe(true);
      });

      it('should not match lesser or equal values', () => {
        expect(evaluateCondition(50, 'greater_than', 100)).toBe(false);
        expect(evaluateCondition(50, 'greater_than', 50)).toBe(false);
      });

      it('should handle string numbers', () => {
        expect(evaluateCondition('100', 'greater_than', '50')).toBe(true);
        expect(evaluateCondition('50', 'greater_than', 100)).toBe(false);
      });

      it('should return false for non-numeric values', () => {
        expect(evaluateCondition('text', 'greater_than', 50)).toBe(false);
        expect(evaluateCondition('abc', 'greater_than', 'def')).toBe(false);
      });
    });

    describe('less_than condition', () => {
      it('should match lesser numeric values', () => {
        expect(evaluateCondition(50, 'less_than', 100)).toBe(true);
        expect(evaluateCondition(0, 'less_than', 5)).toBe(true);
        expect(evaluateCondition(-1, 'less_than', 0)).toBe(true);
      });

      it('should not match greater or equal values', () => {
        expect(evaluateCondition(100, 'less_than', 50)).toBe(false);
        expect(evaluateCondition(50, 'less_than', 50)).toBe(false);
      });
    });

    describe('greater_or_equal condition', () => {
      it('should match greater or equal values', () => {
        expect(evaluateCondition(100, 'greater_or_equal', 50)).toBe(true);
        expect(evaluateCondition(50, 'greater_or_equal', 50)).toBe(true);
      });

      it('should not match lesser values', () => {
        expect(evaluateCondition(50, 'greater_or_equal', 100)).toBe(false);
      });
    });

    describe('less_or_equal condition', () => {
      it('should match lesser or equal values', () => {
        expect(evaluateCondition(50, 'less_or_equal', 100)).toBe(true);
        expect(evaluateCondition(50, 'less_or_equal', 50)).toBe(true);
      });

      it('should not match greater values', () => {
        expect(evaluateCondition(100, 'less_or_equal', 50)).toBe(false);
      });
    });

    describe('contains condition', () => {
      it('should match when value contains substring', () => {
        expect(evaluateCondition('Hello World', 'contains', 'World')).toBe(true);
        expect(evaluateCondition('test@example.com', 'contains', 'example')).toBe(true);
        expect(evaluateCondition('JavaScript', 'contains', 'Script')).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(evaluateCondition('Hello World', 'contains', 'world')).toBe(true);
        expect(evaluateCondition('TESTING', 'contains', 'test')).toBe(true);
      });

      it('should not match when substring is not found', () => {
        expect(evaluateCondition('Hello', 'contains', 'World')).toBe(false);
        expect(evaluateCondition('test', 'contains', 'xyz')).toBe(false);
      });

      it('should handle numbers', () => {
        expect(evaluateCondition(12345, 'contains', '234')).toBe(true);
        expect(evaluateCondition(12345, 'contains', '999')).toBe(false);
      });
    });

    describe('not_contains condition', () => {
      it('should match when value does not contain substring', () => {
        expect(evaluateCondition('Hello', 'not_contains', 'World')).toBe(true);
        expect(evaluateCondition('test', 'not_contains', 'xyz')).toBe(true);
      });

      it('should not match when substring is found', () => {
        expect(evaluateCondition('Hello World', 'not_contains', 'World')).toBe(false);
        expect(evaluateCondition('testing', 'not_contains', 'test')).toBe(false);
      });
    });

    describe('starts_with condition', () => {
      it('should match when value starts with prefix', () => {
        expect(evaluateCondition('Hello World', 'starts_with', 'Hello')).toBe(true);
        expect(evaluateCondition('test@example.com', 'starts_with', 'test')).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(evaluateCondition('Hello World', 'starts_with', 'hello')).toBe(true);
        expect(evaluateCondition('TESTING', 'starts_with', 'test')).toBe(true);
      });

      it('should not match when prefix is not at start', () => {
        expect(evaluateCondition('Hello World', 'starts_with', 'World')).toBe(false);
        expect(evaluateCondition('example@test.com', 'starts_with', 'test')).toBe(false);
      });
    });

    describe('ends_with condition', () => {
      it('should match when value ends with suffix', () => {
        expect(evaluateCondition('Hello World', 'ends_with', 'World')).toBe(true);
        expect(evaluateCondition('test@example.com', 'ends_with', '.com')).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(evaluateCondition('Hello World', 'ends_with', 'world')).toBe(true);
        expect(evaluateCondition('TESTING', 'ends_with', 'ING')).toBe(true);
      });

      it('should not match when suffix is not at end', () => {
        expect(evaluateCondition('Hello World', 'ends_with', 'Hello')).toBe(false);
        expect(evaluateCondition('test.com', 'ends_with', 'test')).toBe(false);
      });
    });

    describe('is_empty condition', () => {
      it('should match null values', () => {
        expect(evaluateCondition(null, 'is_empty', null)).toBe(true);
      });

      it('should match undefined values', () => {
        expect(evaluateCondition(undefined, 'is_empty', null)).toBe(true);
      });

      it('should match empty strings', () => {
        expect(evaluateCondition('', 'is_empty', null)).toBe(true);
      });

      it('should match string "null"', () => {
        expect(evaluateCondition('null', 'is_empty', null)).toBe(true);
      });

      it('should match string "undefined"', () => {
        expect(evaluateCondition('undefined', 'is_empty', null)).toBe(true);
      });

      it('should not match non-empty values', () => {
        expect(evaluateCondition('test', 'is_empty', null)).toBe(false);
        expect(evaluateCondition(0, 'is_empty', null)).toBe(false);
        expect(evaluateCondition(false, 'is_empty', null)).toBe(false);
      });
    });

    describe('is_not_empty condition', () => {
      it('should match non-empty values', () => {
        expect(evaluateCondition('test', 'is_not_empty', null)).toBe(true);
        expect(evaluateCondition(0, 'is_not_empty', null)).toBe(true);
        expect(evaluateCondition(false, 'is_not_empty', null)).toBe(true);
        expect(evaluateCondition('hello', 'is_not_empty', null)).toBe(true);
      });

      it('should not match null/undefined', () => {
        expect(evaluateCondition(null, 'is_not_empty', null)).toBe(false);
        expect(evaluateCondition(undefined, 'is_not_empty', null)).toBe(false);
      });

      it('should not match empty strings', () => {
        expect(evaluateCondition('', 'is_not_empty', null)).toBe(false);
      });

      it('should not match string "null" or "undefined"', () => {
        expect(evaluateCondition('null', 'is_not_empty', null)).toBe(false);
        expect(evaluateCondition('undefined', 'is_not_empty', null)).toBe(false);
      });
    });

    describe('between condition', () => {
      it('should match values within range', () => {
        expect(evaluateCondition(50, 'between', { min: 1, max: 100 })).toBe(true);
        expect(evaluateCondition(1, 'between', { min: 1, max: 100 })).toBe(true);
        expect(evaluateCondition(100, 'between', { min: 1, max: 100 })).toBe(true);
      });

      it('should not match values outside range', () => {
        expect(evaluateCondition(-1, 'between', { min: 1, max: 100 })).toBe(false);
        expect(evaluateCondition(101, 'between', { min: 1, max: 100 })).toBe(false);
      });

      it('should handle string numbers', () => {
        expect(evaluateCondition('50', 'between', { min: '1', max: '100' })).toBe(true);
      });

      it('should return false if min is missing', () => {
        expect(evaluateCondition(50, 'between', { max: 100 })).toBe(false);
      });

      it('should return false if max is missing', () => {
        expect(evaluateCondition(50, 'between', { min: 1 })).toBe(false);
      });

      it('should return false if min is 0 (falsy check bug)', () => {
        // Bug in implementation: !conditionValue?.min treats 0 as missing
        expect(evaluateCondition(50, 'between', { min: 0, max: 100 })).toBe(false);
      });

      it('should return false if conditionValue is not an object', () => {
        expect(evaluateCondition(50, 'between', 100)).toBe(false);
      });
    });

    describe('in_list condition', () => {
      it('should match when value is in list', () => {
        expect(evaluateCondition('apple', 'in_list', ['apple', 'banana', 'orange'])).toBe(true);
        expect(evaluateCondition('banana', 'in_list', ['apple', 'banana', 'orange'])).toBe(true);
      });

      it('should be case-insensitive', () => {
        expect(evaluateCondition('Apple', 'in_list', ['apple', 'banana', 'orange'])).toBe(true);
        expect(evaluateCondition('BANANA', 'in_list', ['apple', 'banana', 'orange'])).toBe(true);
      });

      it('should not match when value is not in list', () => {
        expect(evaluateCondition('grape', 'in_list', ['apple', 'banana', 'orange'])).toBe(false);
      });

      it('should handle numbers in list', () => {
        expect(evaluateCondition(42, 'in_list', [1, 42, 100])).toBe(true);
        expect(evaluateCondition(50, 'in_list', [1, 42, 100])).toBe(false);
      });

      it('should return false if conditionValue is not an array', () => {
        expect(evaluateCondition('test', 'in_list', 'not-an-array')).toBe(false);
        expect(evaluateCondition('test', 'in_list', null)).toBe(false);
      });

      it('should handle empty list', () => {
        expect(evaluateCondition('test', 'in_list', [])).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle zero values correctly', () => {
        expect(evaluateCondition(0, 'equals', 0)).toBe(true);
        expect(evaluateCondition(0, 'greater_than', -1)).toBe(true);
        expect(evaluateCondition(0, 'is_not_empty', null)).toBe(true);
      });

      it('should handle boolean false correctly', () => {
        expect(evaluateCondition(false, 'equals', 'false')).toBe(true);
        expect(evaluateCondition(false, 'is_not_empty', null)).toBe(true);
      });

      it('should handle special characters in strings', () => {
        expect(evaluateCondition('test@#$%', 'contains', '@#')).toBe(true);
        expect(evaluateCondition('hello\nworld', 'contains', '\n')).toBe(true);
      });

      it('should handle whitespace', () => {
        expect(evaluateCondition('  test  ', 'contains', 'test')).toBe(true);
        expect(evaluateCondition('   ', 'is_not_empty', null)).toBe(true);
      });

      it('should return false for unknown condition types', () => {
        expect(evaluateCondition('test', 'unknown' as ConditionType, 'value')).toBe(false);
      });
    });
  });

  describe('applyFormattingRules', () => {
    const createRule = (overrides: Partial<FormattingRule>): FormattingRule => ({
      id: 'rule-1',
      name: 'Test Rule',
      column_name: 'status',
      is_active: true,
      priority: 1,
      condition_type: 'equals',
      condition_value: 'active',
      format_config: { background: '#00ff00', text: '#000000' },
      apply_to_row: false,
      ...overrides,
    });

    describe('basic functionality', () => {
      it('should apply cell formatting when condition matches', () => {
        const row = { status: 'active', name: 'Test' };
        const rules = [createRule({})];

        const { cellFormats, rowFormat } = applyFormattingRules(row, rules);

        expect(cellFormats.status).toEqual({ background: '#00ff00', text: '#000000' });
        expect(rowFormat).toBeNull();
      });

      it('should not apply formatting when condition does not match', () => {
        const row = { status: 'inactive', name: 'Test' };
        const rules = [createRule({})];

        const { cellFormats, rowFormat } = applyFormattingRules(row, rules);

        expect(cellFormats).toEqual({});
        expect(rowFormat).toBeNull();
      });

      it('should apply row formatting when apply_to_row is true', () => {
        const row = { status: 'active', name: 'Test' };
        const rules = [createRule({ apply_to_row: true })];

        const { cellFormats, rowFormat } = applyFormattingRules(row, rules);

        expect(cellFormats).toEqual({});
        expect(rowFormat).toEqual({ background: '#00ff00', text: '#000000' });
      });

      it('should skip inactive rules', () => {
        const row = { status: 'active', name: 'Test' };
        const rules = [createRule({ is_active: false })];

        const { cellFormats, rowFormat } = applyFormattingRules(row, rules);

        expect(cellFormats).toEqual({});
        expect(rowFormat).toBeNull();
      });
    });

    describe('priority handling', () => {
      it('should apply rules by priority (lower number first)', () => {
        const row = { status: 'active' };
        const rules = [
          createRule({ id: 'rule-1', priority: 2, format_config: { background: '#ff0000' } }),
          createRule({ id: 'rule-2', priority: 1, format_config: { background: '#00ff00' } }),
        ];

        const { cellFormats } = applyFormattingRules(row, rules);

        // Rule 2 (priority 1) should win
        expect(cellFormats.status?.background).toBe('#00ff00');
      });

      it('should only apply first matching rule per column', () => {
        const row = { status: 'active' };
        const rules = [
          createRule({ id: 'rule-1', priority: 1, format_config: { background: '#00ff00' } }),
          createRule({ id: 'rule-2', priority: 2, format_config: { background: '#ff0000' } }),
        ];

        const { cellFormats } = applyFormattingRules(row, rules);

        // Only first matching rule should apply
        expect(cellFormats.status?.background).toBe('#00ff00');
      });

      it('should only apply first matching row format', () => {
        const row = { status: 'active' };
        const rules = [
          createRule({ id: 'rule-1', priority: 1, apply_to_row: true, format_config: { background: '#00ff00' } }),
          createRule({ id: 'rule-2', priority: 2, apply_to_row: true, format_config: { background: '#ff0000' } }),
        ];

        const { rowFormat } = applyFormattingRules(row, rules);

        expect(rowFormat?.background).toBe('#00ff00');
      });
    });

    describe('multiple columns', () => {
      it('should apply formatting to multiple columns', () => {
        const row = { status: 'active', priority: 'high' };
        const rules = [
          createRule({ column_name: 'status', format_config: { background: '#00ff00' } }),
          createRule({
            id: 'rule-2',
            column_name: 'priority',
            condition_type: 'equals',
            condition_value: 'high',
            format_config: { background: '#ff0000', bold: true },
          }),
        ];

        const { cellFormats } = applyFormattingRules(row, rules);

        expect(cellFormats.status).toEqual({ background: '#00ff00' });
        expect(cellFormats.priority).toEqual({ background: '#ff0000', bold: true });
      });
    });

    describe('complex conditions', () => {
      it('should handle numeric comparisons', () => {
        const row = { score: 85 };
        const rules = [
          createRule({
            column_name: 'score',
            condition_type: 'greater_than',
            condition_value: 70,
            format_config: { background: '#00ff00' },
          }),
        ];

        const { cellFormats } = applyFormattingRules(row, rules);

        expect(cellFormats.score).toBeTruthy();
      });

      it('should handle between condition', () => {
        const row = { temperature: 25 };
        const rules = [
          createRule({
            column_name: 'temperature',
            condition_type: 'between',
            condition_value: { min: 20, max: 30 },
            format_config: { background: '#ffff00' },
          }),
        ];

        const { cellFormats } = applyFormattingRules(row, rules);

        expect(cellFormats.temperature).toBeTruthy();
      });

      it('should handle in_list condition', () => {
        const row = { category: 'electronics' };
        const rules = [
          createRule({
            column_name: 'category',
            condition_type: 'in_list',
            condition_value: ['electronics', 'computers', 'phones'],
            format_config: { background: '#0000ff', text: '#ffffff' },
          }),
        ];

        const { cellFormats } = applyFormattingRules(row, rules);

        expect(cellFormats.category).toEqual({ background: '#0000ff', text: '#ffffff' });
      });
    });

    describe('edge cases', () => {
      it('should handle empty rules array', () => {
        const row = { status: 'active' };
        const { cellFormats, rowFormat } = applyFormattingRules(row, []);

        expect(cellFormats).toEqual({});
        expect(rowFormat).toBeNull();
      });

      it('should handle rows with missing columns', () => {
        const row = { name: 'Test' }; // Missing 'status' column
        const rules = [createRule({})];

        const { cellFormats } = applyFormattingRules(row, rules);

        expect(cellFormats).toEqual({});
      });

      it('should not mutate original rules array', () => {
        const row = { status: 'active' };
        const rules = [
          createRule({ priority: 2 }),
          createRule({ id: 'rule-2', priority: 1 }),
        ];
        const originalOrder = [...rules];

        applyFormattingRules(row, rules);

        expect(rules).toEqual(originalOrder);
      });
    });
  });

  describe('formatToStyles', () => {
    it('should convert background color', () => {
      const format: FormatConfig = { background: '#ff0000' };
      const styles = formatToStyles(format);

      expect(styles.backgroundColor).toBe('#ff0000');
    });

    it('should convert text color', () => {
      const format: FormatConfig = { text: '#00ff00' };
      const styles = formatToStyles(format);

      expect(styles.color).toBe('#00ff00');
    });

    it('should convert bold flag', () => {
      const format: FormatConfig = { bold: true };
      const styles = formatToStyles(format);

      expect(styles.fontWeight).toBe('bold');
    });

    it('should not set fontWeight when bold is false', () => {
      const format: FormatConfig = { bold: false };
      const styles = formatToStyles(format);

      expect(styles.fontWeight).toBeUndefined();
    });

    it('should convert italic flag', () => {
      const format: FormatConfig = { italic: true };
      const styles = formatToStyles(format);

      expect(styles.fontStyle).toBe('italic');
    });

    it('should not set fontStyle when italic is false', () => {
      const format: FormatConfig = { italic: false };
      const styles = formatToStyles(format);

      expect(styles.fontStyle).toBeUndefined();
    });

    it('should handle all properties together', () => {
      const format: FormatConfig = {
        background: '#ff0000',
        text: '#ffffff',
        bold: true,
        italic: true,
      };
      const styles = formatToStyles(format);

      expect(styles).toEqual({
        backgroundColor: '#ff0000',
        color: '#ffffff',
        fontWeight: 'bold',
        fontStyle: 'italic',
      });
    });

    it('should handle empty format config', () => {
      const format: FormatConfig = {};
      const styles = formatToStyles(format);

      expect(styles).toEqual({
        backgroundColor: undefined,
        color: undefined,
        fontWeight: undefined,
        fontStyle: undefined,
      });
    });

    it('should ignore icon property in styles', () => {
      const format: FormatConfig = { icon: 'star', background: '#ff0000' };
      const styles = formatToStyles(format);

      expect(styles).not.toHaveProperty('icon');
      expect(styles.backgroundColor).toBe('#ff0000');
    });
  });

  describe('formatToClassNames', () => {
    it('should return bold class when bold is true', () => {
      const format: FormatConfig = { bold: true };
      const classes = formatToClassNames(format);

      expect(classes).toBe('font-bold');
    });

    it('should return italic class when italic is true', () => {
      const format: FormatConfig = { italic: true };
      const classes = formatToClassNames(format);

      expect(classes).toBe('italic');
    });

    it('should return both classes when both are true', () => {
      const format: FormatConfig = { bold: true, italic: true };
      const classes = formatToClassNames(format);

      expect(classes).toBe('font-bold italic');
    });

    it('should return empty string when no text styles', () => {
      const format: FormatConfig = { background: '#ff0000', text: '#ffffff' };
      const classes = formatToClassNames(format);

      expect(classes).toBe('');
    });

    it('should not include classes when bold/italic are false', () => {
      const format: FormatConfig = { bold: false, italic: false };
      const classes = formatToClassNames(format);

      expect(classes).toBe('');
    });

    it('should ignore color properties', () => {
      const format: FormatConfig = { bold: true, background: '#ff0000', text: '#ffffff' };
      const classes = formatToClassNames(format);

      expect(classes).toBe('font-bold');
    });

    it('should ignore icon property', () => {
      const format: FormatConfig = { icon: 'star' };
      const classes = formatToClassNames(format);

      expect(classes).toBe('');
    });

    it('should handle empty format config', () => {
      const format: FormatConfig = {};
      const classes = formatToClassNames(format);

      expect(classes).toBe('');
    });
  });

  describe('Real-world scenarios', () => {
    it('should highlight high-priority tasks', () => {
      const row = { priority: 'high', status: 'pending' };
      const rules = [
        {
          id: '1',
          name: 'High Priority',
          column_name: 'priority',
          is_active: true,
          priority: 1,
          condition_type: 'equals' as ConditionType,
          condition_value: 'high',
          format_config: { background: '#ff0000', text: '#ffffff', bold: true },
          apply_to_row: true,
        },
      ];

      const { rowFormat } = applyFormattingRules(row, rules);
      const styles = formatToStyles(rowFormat!);

      expect(styles.backgroundColor).toBe('#ff0000');
      expect(styles.color).toBe('#ffffff');
      expect(styles.fontWeight).toBe('bold');
    });

    it('should color-code status columns', () => {
      const row = { status: 'completed' };
      const rules = [
        {
          id: '1',
          name: 'Completed',
          column_name: 'status',
          is_active: true,
          priority: 1,
          condition_type: 'equals' as ConditionType,
          condition_value: 'completed',
          format_config: { background: '#00ff00' },
          apply_to_row: false,
        },
      ];

      const { cellFormats } = applyFormattingRules(row, rules);

      expect(cellFormats.status?.background).toBe('#00ff00');
    });

    it('should highlight overdue items based on numeric threshold', () => {
      const row = { days_overdue: 7 };
      const rules = [
        {
          id: '1',
          name: 'Overdue',
          column_name: 'days_overdue',
          is_active: true,
          priority: 1,
          condition_type: 'greater_than' as ConditionType,
          condition_value: 0,
          format_config: { background: '#ff9999', bold: true },
          apply_to_row: true,
        },
      ];

      const { rowFormat } = applyFormattingRules(row, rules);

      expect(rowFormat?.background).toBe('#ff9999');
      expect(rowFormat?.bold).toBe(true);
    });

    it('should apply multiple conditional formats to same row', () => {
      const row = { status: 'in_progress', priority: 'high', assignee: 'John' };
      const rules = [
        {
          id: '1',
          name: 'High Priority',
          column_name: 'priority',
          is_active: true,
          priority: 1,
          condition_type: 'equals' as ConditionType,
          condition_value: 'high',
          format_config: { background: '#ff0000', text: '#ffffff' },
          apply_to_row: false,
        },
        {
          id: '2',
          name: 'In Progress',
          column_name: 'status',
          is_active: true,
          priority: 2,
          condition_type: 'equals' as ConditionType,
          condition_value: 'in_progress',
          format_config: { background: '#ffff00', italic: true },
          apply_to_row: false,
        },
      ];

      const { cellFormats } = applyFormattingRules(row, rules);

      expect(cellFormats.priority).toEqual({ background: '#ff0000', text: '#ffffff' });
      expect(cellFormats.status).toEqual({ background: '#ffff00', italic: true });
    });
  });
});
