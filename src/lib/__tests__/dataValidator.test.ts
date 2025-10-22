import { describe, it, expect } from 'vitest';
import { DataValidator } from '../dataValidator';

describe('DataValidator', () => {
  describe('validateEmail', () => {
    it('validates correct email', () => {
      const result = DataValidator.validateEmail('test@example.com');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects invalid email', () => {
      const result = DataValidator.validateEmail('invalid-email');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('rejects empty email', () => {
      const result = DataValidator.validateEmail('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });
  });

  describe('validateURL', () => {
    it('validates correct URL', () => {
      const result = DataValidator.validateURL('https://example.com');
      expect(result.valid).toBe(true);
    });

    it('rejects invalid URL', () => {
      const result = DataValidator.validateURL('not-a-url');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid URL format');
    });
  });

  describe('validatePhone', () => {
    it('validates correct phone', () => {
      const result = DataValidator.validatePhone('+1-234-567-8900');
      expect(result.valid).toBe(true);
    });

    it('rejects phone with letters', () => {
      const result = DataValidator.validatePhone('123-abc-4567');
      expect(result.valid).toBe(false);
    });

    it('rejects too short phone', () => {
      const result = DataValidator.validatePhone('123');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Phone number too short (minimum 10 digits)');
    });
  });

  describe('validateNumberRange', () => {
    it('validates number in range', () => {
      const result = DataValidator.validateNumberRange(50, 0, 100);
      expect(result.valid).toBe(true);
    });

    it('rejects number below min', () => {
      const result = DataValidator.validateNumberRange(-10, 0, 100);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Value must be at least 0');
    });

    it('rejects number above max', () => {
      const result = DataValidator.validateNumberRange(150, 0, 100);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Value must be at most 100');
    });
  });

  describe('validateLength', () => {
    it('validates string within length', () => {
      const result = DataValidator.validateLength('hello', 3, 10);
      expect(result.valid).toBe(true);
    });

    it('rejects string too short', () => {
      const result = DataValidator.validateLength('hi', 5, 10);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be at least 5 characters');
    });

    it('rejects string too long', () => {
      const result = DataValidator.validateLength('verylongstring', 1, 5);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Must be at most 5 characters');
    });
  });

  describe('validateIdentifier', () => {
    it('validates correct identifier', () => {
      const result = DataValidator.validateIdentifier('table_name_123');
      expect(result.valid).toBe(true);
    });

    it('rejects identifier starting with number', () => {
      const result = DataValidator.validateIdentifier('123table');
      expect(result.valid).toBe(false);
    });

    it('rejects SQL reserved word', () => {
      const result = DataValidator.validateIdentifier('select');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('reserved word'))).toBe(true);
    });
  });

  describe('sanitizeHTML', () => {
    it('escapes HTML tags', () => {
      const result = DataValidator.sanitizeHTML('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;');
    });
  });

  describe('sanitizeInput', () => {
    it('removes dangerous characters', () => {
      const result = DataValidator.sanitizeInput('  test<script>  ');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toBe('testscript');
    });
  });
});
