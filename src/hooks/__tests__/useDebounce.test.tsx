import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 300));
      expect(result.current).toBe('initial');
    });

    it('should debounce string values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 300 } }
      );

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'updated', delay: 300 });

      // Value should not change immediately
      expect(result.current).toBe('initial');

      // Fast-forward time by 299ms (not enough)
      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(result.current).toBe('initial');

      // Fast-forward by 1 more ms (300ms total)
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });

    it('should debounce number values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 0, delay: 500 } }
      );

      expect(result.current).toBe(0);

      rerender({ value: 42, delay: 500 });
      expect(result.current).toBe(0);

      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(result.current).toBe(42);
    });

    it('should debounce boolean values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: false, delay: 200 } }
      );

      expect(result.current).toBe(false);

      rerender({ value: true, delay: 200 });
      expect(result.current).toBe(false);

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe(true);
    });

    it('should debounce object values', () => {
      const obj1 = { id: 1, name: 'first' };
      const obj2 = { id: 2, name: 'second' };

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: obj1, delay: 300 } }
      );

      expect(result.current).toBe(obj1);

      rerender({ value: obj2, delay: 300 });
      expect(result.current).toBe(obj1);

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(obj2);
    });

    it('should debounce array values', () => {
      const arr1 = [1, 2, 3];
      const arr2 = [4, 5, 6];

      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: arr1, delay: 300 } }
      );

      expect(result.current).toBe(arr1);

      rerender({ value: arr2, delay: 300 });
      expect(result.current).toBe(arr1);

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe(arr2);
    });
  });

  describe('Default delay', () => {
    it('should use 300ms as default delay', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'updated' });
      expect(result.current).toBe('initial');

      // 299ms should not be enough
      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(result.current).toBe('initial');

      // 300ms should trigger update
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('Multiple rapid changes', () => {
    it('should only update once after multiple rapid changes', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'v0', delay: 300 } }
      );

      // Rapid changes
      rerender({ value: 'v1', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'v2', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'v3', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Still showing initial value
      expect(result.current).toBe('v0');

      // Fast-forward 300ms from last change
      act(() => {
        vi.advanceTimersByTime(200); // Total: 300ms from last change
      });
      expect(result.current).toBe('v3'); // Should show last value
    });

    it('should cancel previous timeout on new change', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'v1', delay: 500 } }
      );

      rerender({ value: 'v2', delay: 500 });
      act(() => {
        vi.advanceTimersByTime(400); // Not enough time
      });

      rerender({ value: 'v3', delay: 500 }); // This should cancel v2 timeout
      act(() => {
        vi.advanceTimersByTime(400); // Still not enough
      });

      expect(result.current).toBe('v1');

      // Complete the v3 timeout
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe('v3'); // Should skip v2
    });
  });

  describe('Delay changes', () => {
    it('should respect new delay value', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 300 } }
      );

      // Change value and delay
      rerender({ value: 'updated', delay: 600 });

      // 300ms should not trigger (old delay)
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('initial');

      // 600ms should trigger (new delay)
      act(() => {
        vi.advanceTimersByTime(300); // Total: 600ms
      });
      expect(result.current).toBe('updated');
    });

    it('should handle delay change to 0', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 300 } }
      );

      // Change to 0 delay
      rerender({ value: 'immediate', delay: 0 });

      // Should update immediately (on next tick)
      act(() => {
        vi.advanceTimersByTime(0);
      });
      expect(result.current).toBe('immediate');
    });
  });

  describe('Edge cases', () => {
    it('should handle null values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: null as string | null, delay: 300 } }
      );

      expect(result.current).toBeNull();

      rerender({ value: 'not-null', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('not-null');
    });

    it('should handle undefined values', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: undefined as string | undefined, delay: 300 } }
      );

      expect(result.current).toBeUndefined();

      rerender({ value: 'defined', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('defined');
    });

    it('should handle empty string', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'text', delay: 300 } }
      );

      rerender({ value: '', delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('');
    });

    it('should handle zero as number value', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 42, delay: 300 } }
      );

      rerender({ value: 0, delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe(0);
    });

    it('should handle NaN', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 42, delay: 300 } }
      );

      rerender({ value: NaN, delay: 300 });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBeNaN();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount } = renderHook(() => useDebounce('test', 300));

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should not update after unmount', () => {
      const { result, rerender, unmount } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 300 } }
      );

      rerender({ value: 'updated', delay: 300 });

      // Unmount before timeout completes
      unmount();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should still be initial value (no update after unmount)
      expect(result.current).toBe('initial');
    });
  });

  describe('Performance scenarios', () => {
    it('should handle very short delays', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'v1', delay: 10 } }
      );

      rerender({ value: 'v2', delay: 10 });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current).toBe('v2');
    });

    it('should handle very long delays', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'v1', delay: 10000 } }
      );

      rerender({ value: 'v2', delay: 10000 });
      act(() => {
        vi.advanceTimersByTime(9999);
      });
      expect(result.current).toBe('v1');

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('v2');
    });

    it('should handle many sequential updates', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 0, delay: 100 } }
      );

      // Simulate typing scenario: many rapid updates
      for (let i = 1; i <= 10; i++) {
        rerender({ value: i, delay: 100 });
        act(() => {
          vi.advanceTimersByTime(50); // Half the delay
        });
      }

      // Should still show initial
      expect(result.current).toBe(0);

      // Wait for final timeout
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe(10); // Last value
    });
  });

  describe('Real-world scenarios', () => {
    it('should work for search input debouncing', () => {
      // Simulating user typing a search query
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: '' } }
      );

      // User types 'r'
      rerender({ value: 'r' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // User types 'e'
      rerender({ value: 're' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // User types 'a'
      rerender({ value: 'rea' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // User types 'c'
      rerender({ value: 'reac' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // User types 't'
      rerender({ value: 'react' });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('react');
    });

    it('should work for window resize debouncing', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 200),
        { initialProps: { value: { width: 1920, height: 1080 } } }
      );

      const size1 = { width: 1800, height: 1000 };
      const size2 = { width: 1600, height: 900 };
      const size3 = { width: 1400, height: 800 };

      rerender({ value: size1 });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      rerender({ value: size2 });
      act(() => {
        vi.advanceTimersByTime(50);
      });

      rerender({ value: size3 });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toEqual(size3);
    });

    it('should work for form field validation debouncing', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 500),
        { initialProps: { value: '' } }
      );

      // User types email
      rerender({ value: 't' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'te' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'test@' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'test@example' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'test@example.com' });
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(result.current).toBe('test@example.com');
    });
  });

  describe('Type safety', () => {
    it('should maintain type of string', () => {
      const { result } = renderHook(() => useDebounce('test', 300));

      // TypeScript should infer this as string
      const value: string = result.current;
      expect(typeof value).toBe('string');
    });

    it('should maintain type of number', () => {
      const { result } = renderHook(() => useDebounce(42, 300));

      // TypeScript should infer this as number
      const value: number = result.current;
      expect(typeof value).toBe('number');
    });

    it('should maintain type of complex object', () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }

      const user: User = { id: 1, name: 'Test', email: 'test@example.com' };
      const { result } = renderHook(() => useDebounce(user, 300));

      // TypeScript should infer this as User
      const value: User = result.current;
      expect(value).toHaveProperty('id');
      expect(value).toHaveProperty('name');
      expect(value).toHaveProperty('email');
    });
  });
});
