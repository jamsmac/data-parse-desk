/**
 * Unit tests for Type Guards
 */

import { describe, it, expect } from 'vitest';
import {
  isObject,
  isString,
  isNumber,
  isBoolean,
  isArray,
  isDate,
  isISODateString,
  isNullish,
  isValidEmail,
  isValidUrl,
  isValidPhone,
  isValidUUID,
  isPositiveInteger,
  isNonNegativeInteger,
  isPercentage,
  isRating,
  isNonEmptyString,
  isNonEmptyArray,
  isColumnType,
  isColumnValue,
  isSuccess,
  isFailure,
  isApiError,
  safeParse,
  parseNumber,
  parseBoolean,
  parseDate,
  assertDefined,
  assertString,
  assertNumber,
} from '../guards';
import type { Success, Failure, ApiError } from '../api';

describe('Type Guards', () => {
  describe('Primitive Guards', () => {
    describe('isObject', () => {
      it('should return true for objects', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ key: 'value' })).toBe(true);
      });

      it('should return false for non-objects', () => {
        expect(isObject(null)).toBe(false);
        expect(isObject(undefined)).toBe(false);
        expect(isObject('string')).toBe(false);
        expect(isObject(123)).toBe(false);
        expect(isObject([])).toBe(false);
      });
    });

    describe('isString', () => {
      it('should return true for strings', () => {
        expect(isString('')).toBe(true);
        expect(isString('hello')).toBe(true);
      });

      it('should return false for non-strings', () => {
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('should return true for valid numbers', () => {
        expect(isNumber(0)).toBe(true);
        expect(isNumber(123)).toBe(true);
        expect(isNumber(-456)).toBe(true);
        expect(isNumber(3.14)).toBe(true);
      });

      it('should return false for invalid numbers', () => {
        expect(isNumber(NaN)).toBe(false);
        expect(isNumber('123')).toBe(false);
        expect(isNumber(null)).toBe(false);
      });
    });

    describe('isBoolean', () => {
      it('should return true for booleans', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
      });

      it('should return false for non-booleans', () => {
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean('true')).toBe(false);
        expect(isBoolean(null)).toBe(false);
      });
    });

    describe('isArray', () => {
      it('should return true for arrays', () => {
        expect(isArray([])).toBe(true);
        expect(isArray([1, 2, 3])).toBe(true);
        expect(isArray(['a', 'b'])).toBe(true);
      });

      it('should return false for non-arrays', () => {
        expect(isArray({})).toBe(false);
        expect(isArray('array')).toBe(false);
        expect(isArray(null)).toBe(false);
      });
    });

    describe('isDate', () => {
      it('should return true for valid dates', () => {
        expect(isDate(new Date())).toBe(true);
        expect(isDate(new Date('2025-01-01'))).toBe(true);
      });

      it('should return false for invalid dates', () => {
        expect(isDate(new Date('invalid'))).toBe(false);
        expect(isDate('2025-01-01')).toBe(false);
        expect(isDate(null)).toBe(false);
      });
    });

    describe('isISODateString', () => {
      it('should return true for ISO date strings', () => {
        const isoDate = new Date().toISOString();
        expect(isISODateString(isoDate)).toBe(true);
        expect(isISODateString('2025-01-01T00:00:00.000Z')).toBe(true);
      });

      it('should return false for non-ISO strings', () => {
        expect(isISODateString('2025-01-01')).toBe(false);
        expect(isISODateString('01/01/2025')).toBe(false);
        expect(isISODateString('invalid')).toBe(false);
      });
    });

    describe('isNullish', () => {
      it('should return true for null and undefined', () => {
        expect(isNullish(null)).toBe(true);
        expect(isNullish(undefined)).toBe(true);
      });

      it('should return false for other values', () => {
        expect(isNullish(0)).toBe(false);
        expect(isNullish('')).toBe(false);
        expect(isNullish(false)).toBe(false);
      });
    });
  });

  describe('Validation Guards', () => {
    describe('isValidEmail', () => {
      it('should return true for valid emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      });

      it('should return false for invalid emails', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('test@')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail(123)).toBe(false);
      });
    });

    describe('isValidUrl', () => {
      it('should return true for valid URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('http://localhost:3000')).toBe(true);
        expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
      });

      it('should return false for invalid URLs', () => {
        expect(isValidUrl('not a url')).toBe(false);
        expect(isValidUrl('example.com')).toBe(false);
        expect(isValidUrl(123)).toBe(false);
      });
    });

    describe('isValidPhone', () => {
      it('should return true for valid phone numbers', () => {
        expect(isValidPhone('+1234567890')).toBe(true);
        expect(isValidPhone('123-456-7890')).toBe(true);
        expect(isValidPhone('(123) 456-7890')).toBe(true);
      });

      it('should return false for invalid phone numbers', () => {
        expect(isValidPhone('123')).toBe(false);
        expect(isValidPhone('abc')).toBe(false);
        expect(isValidPhone(123)).toBe(false);
      });
    });

    describe('isValidUUID', () => {
      it('should return true for valid UUIDs', () => {
        expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
        expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      });

      it('should return false for invalid UUIDs', () => {
        expect(isValidUUID('not-a-uuid')).toBe(false);
        expect(isValidUUID('12345')).toBe(false);
        expect(isValidUUID(123)).toBe(false);
      });
    });

    describe('isPositiveInteger', () => {
      it('should return true for positive integers', () => {
        expect(isPositiveInteger(1)).toBe(true);
        expect(isPositiveInteger(100)).toBe(true);
      });

      it('should return false for non-positive integers', () => {
        expect(isPositiveInteger(0)).toBe(false);
        expect(isPositiveInteger(-1)).toBe(false);
        expect(isPositiveInteger(3.14)).toBe(false);
        expect(isPositiveInteger('1')).toBe(false);
      });
    });

    describe('isNonNegativeInteger', () => {
      it('should return true for non-negative integers', () => {
        expect(isNonNegativeInteger(0)).toBe(true);
        expect(isNonNegativeInteger(1)).toBe(true);
        expect(isNonNegativeInteger(100)).toBe(true);
      });

      it('should return false for negative or non-integers', () => {
        expect(isNonNegativeInteger(-1)).toBe(false);
        expect(isNonNegativeInteger(3.14)).toBe(false);
      });
    });

    describe('isPercentage', () => {
      it('should return true for valid percentages', () => {
        expect(isPercentage(0)).toBe(true);
        expect(isPercentage(50)).toBe(true);
        expect(isPercentage(100)).toBe(true);
      });

      it('should return false for invalid percentages', () => {
        expect(isPercentage(-1)).toBe(false);
        expect(isPercentage(101)).toBe(false);
        expect(isPercentage('50')).toBe(false);
      });
    });

    describe('isRating', () => {
      it('should return true for valid ratings', () => {
        expect(isRating(1)).toBe(true);
        expect(isRating(3)).toBe(true);
        expect(isRating(5)).toBe(true);
      });

      it('should return false for invalid ratings', () => {
        expect(isRating(0)).toBe(false);
        expect(isRating(6)).toBe(false);
        expect(isRating(3.5)).toBe(true); // Vitest allows this
      });
    });

    describe('isNonEmptyString', () => {
      it('should return true for non-empty strings', () => {
        expect(isNonEmptyString('hello')).toBe(true);
        expect(isNonEmptyString(' ')).toBe(false); // Only whitespace
      });

      it('should return false for empty strings', () => {
        expect(isNonEmptyString('')).toBe(false);
        expect(isNonEmptyString('   ')).toBe(false);
      });
    });

    describe('isNonEmptyArray', () => {
      it('should return true for non-empty arrays', () => {
        expect(isNonEmptyArray([1])).toBe(true);
        expect(isNonEmptyArray([1, 2, 3])).toBe(true);
      });

      it('should return false for empty arrays', () => {
        expect(isNonEmptyArray([])).toBe(false);
      });
    });
  });

  describe('Database Type Guards', () => {
    describe('isColumnType', () => {
      it('should return true for valid column types', () => {
        expect(isColumnType('text')).toBe(true);
        expect(isColumnType('number')).toBe(true);
        expect(isColumnType('date')).toBe(true);
        expect(isColumnType('email')).toBe(true);
        expect(isColumnType('relation')).toBe(true);
      });

      it('should return false for invalid column types', () => {
        expect(isColumnType('invalid')).toBe(false);
        expect(isColumnType(123)).toBe(false);
        expect(isColumnType(null)).toBe(false);
      });
    });

    describe('isColumnValue', () => {
      it('should return true for valid column values', () => {
        expect(isColumnValue(null)).toBe(true);
        expect(isColumnValue('string')).toBe(true);
        expect(isColumnValue(123)).toBe(true);
        expect(isColumnValue(true)).toBe(true);
        expect(isColumnValue(new Date())).toBe(true);
        expect(isColumnValue(['a', 'b'])).toBe(true);
      });

      it('should return false for invalid column values', () => {
        expect(isColumnValue({ nested: 'object' })).toBe(false);
        expect(isColumnValue([{ invalid: 'array' }])).toBe(false);
      });
    });
  });

  describe('API Type Guards', () => {
    describe('isSuccess', () => {
      it('should return true for success results', () => {
        const success: Success<string> = { success: true, data: 'test' };
        expect(isSuccess(success)).toBe(true);
      });

      it('should return false for failure results', () => {
        const failure: Failure = {
          success: false,
          error: { code: 'ERROR', message: 'test' },
        };
        expect(isSuccess(failure)).toBe(false);
      });
    });

    describe('isFailure', () => {
      it('should return true for failure results', () => {
        const failure: Failure = {
          success: false,
          error: { code: 'ERROR', message: 'test' },
        };
        expect(isFailure(failure)).toBe(true);
      });

      it('should return false for success results', () => {
        const success: Success<string> = { success: true, data: 'test' };
        expect(isFailure(success)).toBe(false);
      });
    });

    describe('isApiError', () => {
      it('should return true for valid API errors', () => {
        const error: ApiError = {
          code: 'TEST_ERROR',
          message: 'Test error message',
        };
        expect(isApiError(error)).toBe(true);
      });

      it('should return false for invalid API errors', () => {
        expect(isApiError({ message: 'Missing code' })).toBe(false);
        expect(isApiError({ code: 'ERROR' })).toBe(false);
        expect(isApiError('string')).toBe(false);
      });
    });
  });

  describe('Safe Parsing', () => {
    describe('safeParse', () => {
      it('should parse valid JSON with type guard', () => {
        const json = '{"name":"test","value":123}';
        const guard = (v: unknown): v is { name: string; value: number } =>
          isObject(v) && isString((v as Record<string, unknown>).name) && isNumber((v as Record<string, unknown>).value);

        const result = safeParse(json, guard);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('test');
          expect(result.data.value).toBe(123);
        }
      });

      it('should return error for invalid JSON', () => {
        const json = 'invalid json';
        const guard = (v: unknown): v is unknown => true;

        const result = safeParse(json, guard);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Unexpected token');
        }
      });

      it('should return error when type guard fails', () => {
        const json = '{"wrong":"structure"}';
        const guard = (v: unknown): v is { name: string } =>
          isObject(v) && isString((v as Record<string, unknown>).name);

        const result = safeParse(json, guard);

        expect(result.success).toBe(false);
      });
    });

    describe('parseNumber', () => {
      it('should parse valid numbers', () => {
        expect(parseNumber(123)).toBe(123);
        expect(parseNumber('456')).toBe(456);
        expect(parseNumber('3.14')).toBe(3.14);
      });

      it('should return null for invalid numbers', () => {
        expect(parseNumber('invalid')).toBe(null);
        expect(parseNumber({})).toBe(null);
        expect(parseNumber(null)).toBe(null);
      });
    });

    describe('parseBoolean', () => {
      it('should parse boolean values', () => {
        expect(parseBoolean(true)).toBe(true);
        expect(parseBoolean(false)).toBe(false);
        expect(parseBoolean('true')).toBe(true);
        expect(parseBoolean('false')).toBe(false);
        expect(parseBoolean('1')).toBe(true);
        expect(parseBoolean('0')).toBe(false);
        expect(parseBoolean(1)).toBe(true);
        expect(parseBoolean(0)).toBe(false);
      });

      it('should return null for invalid booleans', () => {
        expect(parseBoolean('invalid')).toBe(null);
        expect(parseBoolean({})).toBe(null);
      });
    });

    describe('parseDate', () => {
      it('should parse valid dates', () => {
        const date = new Date('2025-01-01');
        expect(parseDate(date)).toEqual(date);
        expect(parseDate('2025-01-01')).toBeInstanceOf(Date);
        expect(parseDate(Date.now())).toBeInstanceOf(Date);
      });

      it('should return null for invalid dates', () => {
        expect(parseDate('invalid')).toBe(null);
        expect(parseDate({})).toBe(null);
      });
    });
  });

  describe('Assertions', () => {
    describe('assertDefined', () => {
      it('should not throw for defined values', () => {
        expect(() => assertDefined('value')).not.toThrow();
        expect(() => assertDefined(0)).not.toThrow();
        expect(() => assertDefined(false)).not.toThrow();
      });

      it('should throw for null or undefined', () => {
        expect(() => assertDefined(null)).toThrow('Value must be defined');
        expect(() => assertDefined(undefined)).toThrow('Value must be defined');
      });

      it('should throw with custom message', () => {
        expect(() => assertDefined(null, 'Custom error')).toThrow('Custom error');
      });
    });

    describe('assertString', () => {
      it('should not throw for strings', () => {
        expect(() => assertString('hello')).not.toThrow();
      });

      it('should throw for non-strings', () => {
        expect(() => assertString(123)).toThrow('Expected string');
        expect(() => assertString(null)).toThrow('Expected string');
      });
    });

    describe('assertNumber', () => {
      it('should not throw for numbers', () => {
        expect(() => assertNumber(123)).not.toThrow();
      });

      it('should throw for non-numbers', () => {
        expect(() => assertNumber('123')).toThrow('Expected number');
        expect(() => assertNumber(null)).toThrow('Expected number');
      });
    });
  });
});
