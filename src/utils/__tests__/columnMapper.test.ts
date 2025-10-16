import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  inferColumnType,
} from '../columnMapper';

describe('columnMapper', () => {
  describe('inferColumnType', () => {
    it('should infer number type', () => {
      const values = [123, 456, 789];
      expect(inferColumnType(values)).toBe('number');
    });

    it('should infer text type', () => {
      const values = ['text', 'more text', 'random'];
      const result = inferColumnType(values);
      expect(['string', 'text']).toContain(result);
    });

    it('should handle empty values', () => {
      const values: unknown[] = [];
      const result = inferColumnType(values);
      expect(['string', 'text']).toContain(result);
    });

    it('should handle mixed types', () => {
      const values = ['text', 123, 'more text'];
      const result = inferColumnType(values);
      expect(['string', 'text']).toContain(result);
    });
  });

  describe('calculateSimilarity', () => {
    it('should return 1 for exact match', () => {
      const similarity = calculateSimilarity('name', 'name');
      expect(similarity).toBe(1);
    });

    it('should return high similarity for case differences', () => {
      const similarity = calculateSimilarity('Name', 'name');
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should return lower similarity for different strings', () => {
      const similarity = calculateSimilarity('abcdef', 'xyz');
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle empty strings', () => {
      const similarity = calculateSimilarity('', '');
      expect(similarity).toBe(1);
    });
  });
});
