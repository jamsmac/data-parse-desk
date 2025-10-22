import { describe, it, expect } from 'vitest';
import { mlMapper } from '../mlMapper';

describe('mlMapper - Smart Data Matching', () => {
  describe('levenshteinDistance', () => {
    it('should return 0 for identical strings', () => {
      const distance = mlMapper.levenshteinDistance('hello', 'hello');
      expect(distance).toBe(0);
    });

    it('should calculate correct distance for different strings', () => {
      const distance = mlMapper.levenshteinDistance('kitten', 'sitting');
      expect(distance).toBe(3);
    });

    it('should handle empty strings', () => {
      expect(mlMapper.levenshteinDistance('', 'hello')).toBe(5);
      expect(mlMapper.levenshteinDistance('hello', '')).toBe(5);
      expect(mlMapper.levenshteinDistance('', '')).toBe(0);
    });

    it('should be case-insensitive', () => {
      const distance = mlMapper.levenshteinDistance('Hello', 'hello');
      expect(distance).toBe(0);
    });
  });

  describe('soundex', () => {
    it('should generate same code for similar sounding names', () => {
      const code1 = mlMapper.soundex('Smith');
      const code2 = mlMapper.soundex('Smythe');
      expect(code1).toBe(code2);
    });

    it('should generate different codes for different sounding names', () => {
      const code1 = mlMapper.soundex('Smith');
      const code2 = mlMapper.soundex('Johnson');
      expect(code1).not.toBe(code2);
    });

    it('should handle Russian names', () => {
      const code1 = mlMapper.soundex('Иванов');
      const code2 = mlMapper.soundex('Иванова');
      expect(code1).toBe(code2);
    });

    it('should return 4-character code', () => {
      const code = mlMapper.soundex('Testing');
      expect(code).toHaveLength(4);
    });

    it('should handle empty string', () => {
      const code = mlMapper.soundex('');
      expect(code).toBe('0000');
    });
  });

  describe('matchByTime', () => {
    it('should return 1 for identical dates', () => {
      const date = new Date('2024-01-01');
      const score = mlMapper.matchByTime(date, date);
      expect(score).toBe(1);
    });

    it('should return 0 for dates beyond threshold', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-12-31');
      const score = mlMapper.matchByTime(date1, date2, 1000); // 1 second threshold
      expect(score).toBe(0);
    });

    it('should return partial score for dates within threshold', () => {
      const date1 = new Date('2024-01-01T00:00:00');
      const date2 = new Date('2024-01-01T12:00:00'); // 12 hours later
      const threshold = 24 * 60 * 60 * 1000; // 24 hours
      const score = mlMapper.matchByTime(date1, date2, threshold);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should handle null dates', () => {
      const date = new Date('2024-01-01');
      expect(mlMapper.matchByTime(null, date)).toBe(0);
      expect(mlMapper.matchByTime(date, null)).toBe(0);
      expect(mlMapper.matchByTime(null, null)).toBe(0);
    });

    it('should handle string dates', () => {
      const score = mlMapper.matchByTime('2024-01-01', '2024-01-01');
      expect(score).toBe(1);
    });
  });

  describe('compositeScore', () => {
    it('should combine multiple strategy scores', () => {
      const score = mlMapper.compositeScore(
        {
          exact: 1.0,
          fuzzy: 0.8,
          soundex: 0.9,
        },
        {
          exact: 0.4,
          fuzzy: 0.3,
          soundex: 0.15,
          time: 0.1,
          pattern: 0.05,
        }
      );
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should normalize by total weight', () => {
      const values = { exact: 1.0 };
      const weights = { exact: 0.5, fuzzy: 0.5, soundex: 0, time: 0, pattern: 0 };
      const score = mlMapper.compositeScore(values, weights);
      expect(score).toBe(1.0); // 1.0 * 0.5 / 0.5 = 1.0
    });

    it('should return 0 for no matches', () => {
      const score = mlMapper.compositeScore({}, {
        exact: 0.4,
        fuzzy: 0.3,
        soundex: 0.15,
        time: 0.1,
        pattern: 0.05,
      });
      expect(score).toBe(0);
    });
  });

  describe('advancedMatch', () => {
    it('should match identical values with high confidence', () => {
      const result = mlMapper.advancedMatch(
        { name: 'email', value: 'test@example.com', type: 'text' },
        { name: 'email', value: 'test@example.com', type: 'text' }
      );
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.confidence).toBe('high');
    });

    it('should match similar values with medium confidence', () => {
      const result = mlMapper.advancedMatch(
        { name: 'name', value: 'John Smith', type: 'text' },
        { name: 'name', value: 'Jon Smyth', type: 'text' }
      );
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.confidence).toMatch(/medium|high/);
    });

    it('should not match completely different values', () => {
      const result = mlMapper.advancedMatch(
        { name: 'field1', value: 'Apple', type: 'text' },
        { name: 'field2', value: 'Zebra', type: 'text' }
      );
      expect(result.score).toBeLessThan(0.7);
      expect(result.confidence).toMatch(/low|medium/);
    });

    it('should provide breakdown of scores', () => {
      const result = mlMapper.advancedMatch(
        { name: 'test', value: 'hello', type: 'text' },
        { name: 'test', value: 'hello', type: 'text' }
      );
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.exact).toBe(1);
    });

    it('should handle different types appropriately', () => {
      const result = mlMapper.advancedMatch(
        { name: 'date', value: '2024-01-01', type: 'date' },
        { name: 'date', value: '2024-01-01', type: 'date' }
      );
      expect(result.score).toBeGreaterThan(0);
    });

    it('should use custom weights if provided', () => {
      const result = mlMapper.advancedMatch(
        { name: 'test', value: 'hello', type: 'text' },
        { name: 'test', value: 'hallo', type: 'text' },
        { weights: { exact: 1.0, fuzzy: 0, soundex: 0, time: 0, pattern: 0 } }
      );
      expect(result.breakdown.exact).toBeDefined();
    });
  });
});
