import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logger } from '../logger';

describe('logger', () => {
  // Store original console methods
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug,
    table: console.table,
    group: console.group,
    groupEnd: console.groupEnd,
  };

  // Mock console methods
  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.info = vi.fn();
    console.debug = vi.fn();
    console.table = vi.fn();
    console.group = vi.fn();
    console.groupEnd = vi.fn();
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
    console.debug = originalConsole.debug;
    console.table = originalConsole.table;
    console.group = originalConsole.group;
    console.groupEnd = originalConsole.groupEnd;
    vi.clearAllMocks();
  });

  describe('Development mode (import.meta.env.DEV = true)', () => {
    describe('logger.log', () => {
      it('should call console.log in development mode', () => {
        logger.log('Test message');

        // In dev mode, console.log should be called
        if (import.meta.env.DEV) {
          expect(console.log).toHaveBeenCalledWith('Test message');
          expect(console.log).toHaveBeenCalledTimes(1);
        }
      });

      it('should handle multiple arguments', () => {
        logger.log('Multiple', 'arguments', 123, { key: 'value' });

        if (import.meta.env.DEV) {
          expect(console.log).toHaveBeenCalledWith('Multiple', 'arguments', 123, { key: 'value' });
        }
      });

      it('should handle objects', () => {
        const obj = { foo: 'bar', nested: { key: 'value' } };
        logger.log(obj);

        if (import.meta.env.DEV) {
          expect(console.log).toHaveBeenCalledWith(obj);
        }
      });

      it('should handle arrays', () => {
        const arr = [1, 2, 3, 'string', { key: 'value' }];
        logger.log(arr);

        if (import.meta.env.DEV) {
          expect(console.log).toHaveBeenCalledWith(arr);
        }
      });

      it('should handle null and undefined', () => {
        logger.log(null);
        logger.log(undefined);

        if (import.meta.env.DEV) {
          expect(console.log).toHaveBeenCalledWith(null);
          expect(console.log).toHaveBeenCalledWith(undefined);
        }
      });

      it('should handle errors', () => {
        const error = new Error('Test error');
        logger.log(error);

        if (import.meta.env.DEV) {
          expect(console.log).toHaveBeenCalledWith(error);
        }
      });

      it('should handle no arguments', () => {
        logger.log();

        if (import.meta.env.DEV) {
          expect(console.log).toHaveBeenCalledWith();
          expect(console.log).toHaveBeenCalledTimes(1);
        }
      });
    });

    describe('logger.info', () => {
      it('should call console.info in development mode', () => {
        logger.info('Info message');

        if (import.meta.env.DEV) {
          expect(console.info).toHaveBeenCalledWith('Info message');
          expect(console.info).toHaveBeenCalledTimes(1);
        }
      });

      it('should handle multiple arguments', () => {
        logger.info('Info:', { status: 'success' }, 200);

        if (import.meta.env.DEV) {
          expect(console.info).toHaveBeenCalledWith('Info:', { status: 'success' }, 200);
        }
      });
    });

    describe('logger.debug', () => {
      it('should call console.debug in development mode', () => {
        logger.debug('Debug message');

        if (import.meta.env.DEV) {
          expect(console.debug).toHaveBeenCalledWith('Debug message');
          expect(console.debug).toHaveBeenCalledTimes(1);
        }
      });

      it('should handle complex debugging data', () => {
        const debugData = {
          state: { user: 'John', isLoggedIn: true },
          props: { theme: 'dark' },
          timestamp: Date.now(),
        };
        logger.debug('Component state:', debugData);

        if (import.meta.env.DEV) {
          expect(console.debug).toHaveBeenCalledWith('Component state:', debugData);
        }
      });
    });

    describe('logger.table', () => {
      it('should call console.table in development mode', () => {
        const data = [
          { name: 'John', age: 30 },
          { name: 'Jane', age: 25 },
        ];
        logger.table(data);

        if (import.meta.env.DEV) {
          expect(console.table).toHaveBeenCalledWith(data);
          expect(console.table).toHaveBeenCalledTimes(1);
        }
      });

      it('should handle object data', () => {
        const obj = { key1: 'value1', key2: 'value2', key3: 'value3' };
        logger.table(obj);

        if (import.meta.env.DEV) {
          expect(console.table).toHaveBeenCalledWith(obj);
        }
      });

      it('should handle empty array', () => {
        logger.table([]);

        if (import.meta.env.DEV) {
          expect(console.table).toHaveBeenCalledWith([]);
        }
      });
    });

    describe('logger.group and logger.groupEnd', () => {
      it('should call console.group with label', () => {
        logger.group('Test Group');

        if (import.meta.env.DEV) {
          expect(console.group).toHaveBeenCalledWith('Test Group');
          expect(console.group).toHaveBeenCalledTimes(1);
        }
      });

      it('should call console.groupEnd', () => {
        logger.groupEnd();

        if (import.meta.env.DEV) {
          expect(console.groupEnd).toHaveBeenCalledWith();
          expect(console.groupEnd).toHaveBeenCalledTimes(1);
        }
      });

      it('should work together for grouped logging', () => {
        logger.group('API Call');
        logger.log('Request:', { method: 'GET', url: '/api/data' });
        logger.log('Response:', { status: 200 });
        logger.groupEnd();

        if (import.meta.env.DEV) {
          expect(console.group).toHaveBeenCalledWith('API Call');
          expect(console.log).toHaveBeenCalledTimes(2);
          expect(console.groupEnd).toHaveBeenCalledWith();
        }
      });
    });
  });

  describe('Always logged (warn and error)', () => {
    describe('logger.warn', () => {
      it('should always call console.warn', () => {
        logger.warn('Warning message');

        expect(console.warn).toHaveBeenCalledWith('Warning message');
        expect(console.warn).toHaveBeenCalledTimes(1);
      });

      it('should handle multiple arguments', () => {
        logger.warn('Deprecated:', 'useOldMethod()', 'Use newMethod() instead');

        expect(console.warn).toHaveBeenCalledWith(
          'Deprecated:',
          'useOldMethod()',
          'Use newMethod() instead'
        );
      });

      it('should handle warning objects', () => {
        const warning = {
          code: 'DEPRECATED',
          message: 'This feature will be removed',
          version: '2.0.0',
        };
        logger.warn(warning);

        expect(console.warn).toHaveBeenCalledWith(warning);
      });

      it('should work in both dev and production', () => {
        // This should always log regardless of environment
        logger.warn('Always visible warning');

        expect(console.warn).toHaveBeenCalledWith('Always visible warning');
      });
    });

    describe('logger.error', () => {
      it('should always call console.error', () => {
        logger.error('Error message');

        expect(console.error).toHaveBeenCalledWith('Error message');
        expect(console.error).toHaveBeenCalledTimes(1);
      });

      it('should handle Error objects', () => {
        const error = new Error('Something went wrong');
        logger.error(error);

        expect(console.error).toHaveBeenCalledWith(error);
      });

      it('should handle error with context', () => {
        const error = new Error('API call failed');
        const context = { url: '/api/data', method: 'POST', status: 500 };
        logger.error('Request failed:', error, context);

        expect(console.error).toHaveBeenCalledWith('Request failed:', error, context);
      });

      it('should work in both dev and production', () => {
        // This should always log regardless of environment
        logger.error('Critical error');

        expect(console.error).toHaveBeenCalledWith('Critical error');
      });

      it('should handle multiple error arguments', () => {
        logger.error('Multiple', 'error', 'messages', 123);

        expect(console.error).toHaveBeenCalledWith('Multiple', 'error', 'messages', 123);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle circular references in objects', () => {
      const obj: any = { name: 'Test' };
      obj.self = obj; // Circular reference

      // Should not throw error
      expect(() => logger.log(obj)).not.toThrow();

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledWith(obj);
      }
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000);

      expect(() => logger.log(longString)).not.toThrow();

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledWith(longString);
      }
    });

    it('should handle symbols', () => {
      const sym = Symbol('test');

      expect(() => logger.log(sym)).not.toThrow();

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledWith(sym);
      }
    });

    it('should handle BigInt', () => {
      const bigInt = BigInt(9007199254740991);

      expect(() => logger.log(bigInt)).not.toThrow();

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledWith(bigInt);
      }
    });

    it('should handle functions', () => {
      const fn = () => 'test';

      expect(() => logger.log(fn)).not.toThrow();

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledWith(fn);
      }
    });

    it('should handle promises', () => {
      const promise = Promise.resolve('value');

      expect(() => logger.log(promise)).not.toThrow();

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledWith(promise);
      }
    });

    it('should handle dates', () => {
      const date = new Date('2024-01-01');

      logger.log(date);

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledWith(date);
      }
    });

    it('should handle RegExp', () => {
      const regex = /test/gi;

      logger.log(regex);

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledWith(regex);
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should log API request/response', () => {
      logger.group('API: Fetch Users');
      logger.log('Request:', { method: 'GET', url: '/api/users' });
      logger.log('Response:', { status: 200, data: [{ id: 1, name: 'John' }] });
      logger.groupEnd();

      if (import.meta.env.DEV) {
        expect(console.group).toHaveBeenCalledWith('API: Fetch Users');
        expect(console.log).toHaveBeenCalledTimes(2);
        expect(console.groupEnd).toHaveBeenCalled();
      }
    });

    it('should log component lifecycle', () => {
      logger.debug('Component mounted:', { props: { id: 1 } });
      logger.debug('State updated:', { state: { loading: false } });
      logger.debug('Component unmounted');

      if (import.meta.env.DEV) {
        expect(console.debug).toHaveBeenCalledTimes(3);
      }
    });

    it('should log table data for debugging', () => {
      const users = [
        { id: 1, name: 'John', role: 'Admin' },
        { id: 2, name: 'Jane', role: 'User' },
        { id: 3, name: 'Bob', role: 'User' },
      ];

      logger.table(users);

      if (import.meta.env.DEV) {
        expect(console.table).toHaveBeenCalledWith(users);
      }
    });

    it('should handle error logging with context', () => {
      try {
        throw new Error('Network error');
      } catch (error) {
        logger.error('Failed to fetch data:', error, {
          url: '/api/data',
          retries: 3,
          timestamp: Date.now(),
        });
      }

      expect(console.error).toHaveBeenCalled();
    });

    it('should log performance metrics', () => {
      const metrics = {
        renderTime: 150,
        apiCallTime: 300,
        totalTime: 450,
      };

      logger.debug('Performance metrics:', metrics);

      if (import.meta.env.DEV) {
        expect(console.debug).toHaveBeenCalledWith('Performance metrics:', metrics);
      }
    });

    it('should warn about deprecated features', () => {
      logger.warn('DEPRECATED: useOldHook() will be removed in v2.0. Use useNewHook() instead.');

      expect(console.warn).toHaveBeenCalledWith(
        'DEPRECATED: useOldHook() will be removed in v2.0. Use useNewHook() instead.'
      );
    });
  });

  describe('Type safety', () => {
    it('should accept any type of argument', () => {
      // All these should not cause TypeScript errors
      logger.log('string');
      logger.log(123);
      logger.log(true);
      logger.log(null);
      logger.log(undefined);
      logger.log({ key: 'value' });
      logger.log([1, 2, 3]);
      logger.log(new Error('test'));
      logger.log(() => 'test');

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledTimes(9);
      }
    });

    it('should handle mixed types', () => {
      logger.log('Mixed:', 123, true, null, { key: 'value' }, [1, 2]);

      if (import.meta.env.DEV) {
        expect(console.log).toHaveBeenCalledWith('Mixed:', 123, true, null, { key: 'value' }, [1, 2]);
      }
    });
  });

  describe('Logger methods exist', () => {
    it('should have all expected methods', () => {
      expect(logger).toHaveProperty('log');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('debug');
      expect(logger).toHaveProperty('table');
      expect(logger).toHaveProperty('group');
      expect(logger).toHaveProperty('groupEnd');
    });

    it('should have methods that are functions', () => {
      expect(typeof logger.log).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.table).toBe('function');
      expect(typeof logger.group).toBe('function');
      expect(typeof logger.groupEnd).toBe('function');
    });
  });
});
