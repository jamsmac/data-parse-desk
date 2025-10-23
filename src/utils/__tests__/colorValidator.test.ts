import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateColor,
  sanitizeColor,
  validateColors,
  createSafeCSSVariable,
} from '../colorValidator';

describe('colorValidator', () => {
  // Mock console.error to avoid noise in tests
  const originalError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('validateColor', () => {
    describe('Valid hex colors', () => {
      it('should validate 3-digit hex colors', () => {
        expect(validateColor('#fff')).toBe('#fff');
        expect(validateColor('#FFF')).toBe('#FFF');
        expect(validateColor('#000')).toBe('#000');
        expect(validateColor('#abc')).toBe('#abc');
        expect(validateColor('#123')).toBe('#123');
      });

      it('should validate 6-digit hex colors', () => {
        expect(validateColor('#ffffff')).toBe('#ffffff');
        expect(validateColor('#FFFFFF')).toBe('#FFFFFF');
        expect(validateColor('#000000')).toBe('#000000');
        expect(validateColor('#abcdef')).toBe('#abcdef');
        expect(validateColor('#123456')).toBe('#123456');
        expect(validateColor('#ff5733')).toBe('#ff5733');
      });

      it('should validate 8-digit hex colors with alpha', () => {
        expect(validateColor('#ffffff00')).toBe('#ffffff00');
        expect(validateColor('#00000080')).toBe('#00000080');
        expect(validateColor('#abcdef99')).toBe('#abcdef99');
        expect(validateColor('#12345678')).toBe('#12345678');
      });

      it('should trim whitespace', () => {
        expect(validateColor('  #fff  ')).toBe('#fff');
        expect(validateColor('\t#ffffff\t')).toBe('#ffffff');
        expect(validateColor('\n#abc\n')).toBe('#abc');
      });
    });

    describe('Valid RGB/RGBA colors', () => {
      it('should validate rgb() format', () => {
        expect(validateColor('rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
        expect(validateColor('rgb(255, 255, 255)')).toBe('rgb(255, 255, 255)');
        expect(validateColor('rgb(128, 64, 192)')).toBe('rgb(128, 64, 192)');
      });

      it('should validate rgba() format', () => {
        expect(validateColor('rgba(0, 0, 0, 0)')).toBe('rgba(0, 0, 0, 0)');
        expect(validateColor('rgba(255, 255, 255, 1)')).toBe('rgba(255, 255, 255, 1)');
        expect(validateColor('rgba(128, 64, 192, 0.5)')).toBe('rgba(128, 64, 192, 0.5)');
        expect(validateColor('rgba(100, 150, 200, 0.75)')).toBe('rgba(100, 150, 200, 0.75)');
      });

      it('should validate rgb with various spacing', () => {
        expect(validateColor('rgb(0,0,0)')).toBe('rgb(0,0,0)');
        expect(validateColor('rgb( 255 , 255 , 255 )')).toBe('rgb( 255 , 255 , 255 )');
      });
    });

    describe('Valid HSL/HSLA colors', () => {
      it('should validate hsl() format', () => {
        expect(validateColor('hsl(0, 0%, 0%)')).toBe('hsl(0, 0%, 0%)');
        expect(validateColor('hsl(360, 100%, 50%)')).toBe('hsl(360, 100%, 50%)');
        expect(validateColor('hsl(180, 50%, 75%)')).toBe('hsl(180, 50%, 75%)');
      });

      it('should validate hsla() format', () => {
        expect(validateColor('hsla(0, 0%, 0%, 0)')).toBe('hsla(0, 0%, 0%, 0)');
        expect(validateColor('hsla(360, 100%, 50%, 1)')).toBe('hsla(360, 100%, 50%, 1)');
        expect(validateColor('hsla(180, 50%, 75%, 0.5)')).toBe('hsla(180, 50%, 75%, 0.5)');
      });
    });

    describe('Valid CSS named colors', () => {
      it('should validate basic color names', () => {
        expect(validateColor('red')).toBe('red');
        expect(validateColor('blue')).toBe('blue');
        expect(validateColor('green')).toBe('green');
        expect(validateColor('yellow')).toBe('yellow');
        expect(validateColor('black')).toBe('black');
        expect(validateColor('white')).toBe('white');
      });

      it('should validate extended color names', () => {
        expect(validateColor('orange')).toBe('orange');
        expect(validateColor('purple')).toBe('purple');
        expect(validateColor('pink')).toBe('pink');
        expect(validateColor('brown')).toBe('brown');
        expect(validateColor('cyan')).toBe('cyan');
        expect(validateColor('magenta')).toBe('magenta');
        expect(validateColor('lime')).toBe('lime');
        expect(validateColor('indigo')).toBe('indigo');
        expect(validateColor('violet')).toBe('violet');
        expect(validateColor('turquoise')).toBe('turquoise');
        expect(validateColor('gold')).toBe('gold');
        expect(validateColor('silver')).toBe('silver');
        expect(validateColor('navy')).toBe('navy');
        expect(validateColor('teal')).toBe('teal');
        expect(validateColor('olive')).toBe('olive');
        expect(validateColor('maroon')).toBe('maroon');
        expect(validateColor('aqua')).toBe('aqua');
        expect(validateColor('fuchsia')).toBe('fuchsia');
      });

      it('should validate special color keywords', () => {
        expect(validateColor('transparent')).toBe('transparent');
        expect(validateColor('currentColor')).toBe('currentColor');
      });

      it('should be case-insensitive for named colors', () => {
        expect(validateColor('RED')).toBe('RED');
        expect(validateColor('Red')).toBe('Red');
        expect(validateColor('rEd')).toBe('rEd');
      });

      it('should validate gray/grey', () => {
        expect(validateColor('gray')).toBe('gray');
        expect(validateColor('grey')).toBe('grey');
      });
    });

    describe('Valid CSS system colors', () => {
      it('should validate CSS system keywords', () => {
        expect(validateColor('inherit')).toBe('inherit');
        expect(validateColor('initial')).toBe('initial');
        expect(validateColor('unset')).toBe('unset');
        expect(validateColor('revert')).toBe('revert');
        expect(validateColor('revert-layer')).toBe('revert-layer');
      });

      it('should be case-insensitive for system colors', () => {
        expect(validateColor('INHERIT')).toBe('INHERIT');
        expect(validateColor('Initial')).toBe('Initial');
      });
    });

    describe('Valid CSS variables', () => {
      it('should validate var() syntax', () => {
        expect(validateColor('var(--primary)')).toBe('var(--primary)');
        expect(validateColor('var(--text-color)')).toBe('var(--text-color)');
        expect(validateColor('var(--bg-color-dark)')).toBe('var(--bg-color-dark)');
        expect(validateColor('var(--color123)')).toBe('var(--color123)');
      });
    });

    describe('Undefined/empty values', () => {
      it('should return undefined for undefined input', () => {
        expect(validateColor(undefined)).toBeUndefined();
      });

      it('should return undefined for empty string after trim', () => {
        // Empty string trims to empty, which is treated as undefined
        expect(validateColor('')).toBeUndefined();
      });

      it('should throw for whitespace-only string', () => {
        // Whitespace-only string trims to empty but validation continues
        expect(() => validateColor('   ')).toThrow('Invalid color value');
      });
    });

    describe('Invalid color formats', () => {
      it('should reject invalid hex colors', () => {
        expect(() => validateColor('#ff')).toThrow('Invalid color value');
        expect(() => validateColor('#ffff')).toThrow('Invalid color value');
        expect(() => validateColor('#fffff')).toThrow('Invalid color value');
        expect(() => validateColor('#fffffff')).toThrow('Invalid color value');
        expect(() => validateColor('#gg0000')).toThrow('Invalid color value');
        expect(() => validateColor('ff0000')).toThrow('Invalid color value'); // Missing #
      });

      it('should reject invalid rgb values', () => {
        // 4+ digit numbers don't match the pattern
        expect(() => validateColor('rgb(1000, 0, 0)')).toThrow('Invalid color value');
        // Negative numbers don't match the pattern
        expect(() => validateColor('rgb(-1, 0, 0)')).toThrow('Invalid color value');
        // Missing value doesn't match pattern
        expect(() => validateColor('rgb(0, 0)')).toThrow('Invalid color value');
        // Letters don't match pattern
        expect(() => validateColor('rgb(a, b, c)')).toThrow('Invalid color value');
      });

      it('should reject invalid color names', () => {
        expect(() => validateColor('notacolor')).toThrow('Invalid color value');
        expect(() => validateColor('redd')).toThrow('Invalid color value');
        expect(() => validateColor('bluee')).toThrow('Invalid color value');
      });
    });

    describe('Security - Dangerous patterns', () => {
      it('should reject javascript: protocol', () => {
        // These fail safe pattern check first, then dangerous check
        expect(() => validateColor('javascript:alert(1)')).toThrow('Invalid color value');
        expect(() => validateColor('JavaScript:alert(1)')).toThrow('Invalid color value');
      });

      it('should reject data: protocol', () => {
        expect(() => validateColor('data:text/html,<script>alert(1)</script>')).toThrow('Invalid color value');
      });

      it('should reject vbscript: protocol', () => {
        expect(() => validateColor('vbscript:msgbox(1)')).toThrow('Invalid color value');
      });

      it('should reject event handlers', () => {
        expect(() => validateColor('onclick=alert(1)')).toThrow('Invalid color value');
        expect(() => validateColor('onload=alert(1)')).toThrow('Invalid color value');
        expect(() => validateColor('onerror=alert(1)')).toThrow('Invalid color value');
      });

      it('should reject script tags', () => {
        expect(() => validateColor('<script>alert(1)</script>')).toThrow('Invalid color value');
        expect(() => validateColor('<SCRIPT>alert(1)</SCRIPT>')).toThrow('Invalid color value');
      });

      it('should reject CSS expression()', () => {
        expect(() => validateColor('expression(alert(1))')).toThrow('Invalid color value');
      });

      it('should reject import()', () => {
        expect(() => validateColor('import(./evil.js)')).toThrow('Invalid color value');
      });

      it('should reject url()', () => {
        expect(() => validateColor('url(./image.png)')).toThrow('Invalid color value');
      });

      it('should reject @import', () => {
        expect(() => validateColor('@import url(./evil.css)')).toThrow('Invalid color value');
      });
    });
  });

  describe('sanitizeColor', () => {
    it('should return valid colors unchanged', () => {
      expect(sanitizeColor('#fff')).toBe('#fff');
      expect(sanitizeColor('red')).toBe('red');
      expect(sanitizeColor('rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
    });

    it('should return default fallback for invalid colors', () => {
      expect(sanitizeColor('invalid')).toBe('#000000');
      expect(sanitizeColor('notacolor')).toBe('#000000');
      expect(sanitizeColor('')).toBe('#000000');
    });

    it('should return custom fallback for invalid colors', () => {
      expect(sanitizeColor('invalid', '#ff0000')).toBe('#ff0000');
      expect(sanitizeColor('notacolor', 'red')).toBe('red');
      expect(sanitizeColor('', 'blue')).toBe('blue');
    });

    it('should return fallback for dangerous patterns', () => {
      expect(sanitizeColor('javascript:alert(1)')).toBe('#000000');
      expect(sanitizeColor('<script>alert(1)</script>')).toBe('#000000');
      expect(sanitizeColor('onclick=alert(1)')).toBe('#000000');
    });

    it('should return fallback for undefined', () => {
      expect(sanitizeColor(undefined)).toBe('#000000');
      expect(sanitizeColor(undefined, '#fff')).toBe('#fff');
    });

    it('should trim and validate', () => {
      expect(sanitizeColor('  #fff  ')).toBe('#fff');
      expect(sanitizeColor('  red  ')).toBe('red');
    });
  });

  describe('validateColors', () => {
    it('should validate array of valid colors', () => {
      const colors = ['#fff', 'red', 'rgb(0, 0, 0)'];
      const result = validateColors(colors);
      expect(result).toEqual(['#fff', 'red', 'rgb(0, 0, 0)']);
    });

    it('should handle undefined values', () => {
      const colors = ['#fff', undefined, 'red'];
      const result = validateColors(colors);
      expect(result).toEqual(['#fff', undefined, 'red']);
    });

    it('should throw on first invalid color', () => {
      const colors = ['#fff', 'invalid', 'red'];
      expect(() => validateColors(colors)).toThrow('Invalid color value');
    });

    it('should validate empty array', () => {
      expect(validateColors([])).toEqual([]);
    });

    it('should handle all undefined array', () => {
      const colors = [undefined, undefined];
      expect(validateColors(colors)).toEqual([undefined, undefined]);
    });

    it('should throw on dangerous patterns', () => {
      const colors = ['#fff', 'javascript:alert(1)'];
      expect(() => validateColors(colors)).toThrow('Invalid color value');
    });
  });

  describe('createSafeCSSVariable', () => {
    it('should create valid CSS variable declaration', () => {
      expect(createSafeCSSVariable('primary', '#fff')).toBe('--color-primary: #fff;');
      expect(createSafeCSSVariable('text', 'red')).toBe('--color-text: red;');
      expect(createSafeCSSVariable('bg', 'rgb(0, 0, 0)')).toBe('--color-bg: rgb(0, 0, 0);');
    });

    it('should sanitize variable names', () => {
      expect(createSafeCSSVariable('primary-color', '#fff')).toBe('--color-primary-color: #fff;');
      expect(createSafeCSSVariable('text_color', '#000')).toBe('--color-text_color: #000;');
      expect(createSafeCSSVariable('color123', 'red')).toBe('--color-color123: red;');
    });

    it('should remove dangerous characters from names', () => {
      expect(createSafeCSSVariable('primary;alert(1)', '#fff')).toBe('--color-primaryalert1: #fff;');
      expect(createSafeCSSVariable('text<script>', 'red')).toBe('--color-textscript: red;');
      expect(createSafeCSSVariable('bg{color}', 'blue')).toBe('--color-bgcolor: blue;');
    });

    it('should return empty string for undefined color', () => {
      expect(createSafeCSSVariable('primary', undefined)).toBe('');
    });

    it('should return empty string for invalid color', () => {
      expect(createSafeCSSVariable('primary', 'invalid')).toBe('');
      expect(createSafeCSSVariable('text', 'notacolor')).toBe('');
    });

    it('should return empty string for dangerous patterns', () => {
      expect(createSafeCSSVariable('primary', 'javascript:alert(1)')).toBe('');
      expect(createSafeCSSVariable('text', '<script>alert(1)</script>')).toBe('');
    });

    it('should handle empty color string', () => {
      expect(createSafeCSSVariable('primary', '')).toBe('');
    });

    it('should prefix with color-', () => {
      const result = createSafeCSSVariable('test', '#fff');
      expect(result).toContain('--color-');
      expect(result).toContain('--color-test:');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long color names', () => {
      const longName = 'a'.repeat(1000);
      expect(() => validateColor(longName)).toThrow('Invalid color value');
    });

    it('should handle special characters in hex', () => {
      expect(() => validateColor('#fff!@#')).toThrow('Invalid color value');
      expect(() => validateColor('#fff;')).toThrow('Invalid color value'); // Fails safe pattern first
    });

    it('should handle mixed case var()', () => {
      expect(validateColor('var(--Primary-Color)')).toBe('var(--Primary-Color)');
      expect(validateColor('var(--PRIMARY-COLOR)')).toBe('var(--PRIMARY-COLOR)');
    });

    it('should handle rgb with decimal values (invalid)', () => {
      expect(() => validateColor('rgb(0.5, 0.5, 0.5)')).toThrow('Invalid color value');
    });

    it('should handle negative values in hsl (invalid)', () => {
      expect(() => validateColor('hsl(-10, 50%, 50%)')).toThrow('Invalid color value');
    });
  });

  describe('Real-world scenarios', () => {
    it('should validate user theme colors', () => {
      const themeColors = {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      };

      Object.values(themeColors).forEach(color => {
        expect(() => validateColor(color)).not.toThrow();
      });
    });

    it('should sanitize user-provided colors safely', () => {
      const userColors = [
        'red',
        'invalid',
        '#fff',
        'notacolor',
        'javascript:alert(1)',
        'rgb(0, 0, 0)',
      ];

      const sanitized = userColors.map(c => sanitizeColor(c, 'transparent'));
      expect(sanitized).toEqual([
        'red',
        'transparent',
        '#fff',
        'transparent',
        'transparent',
        'rgb(0, 0, 0)',
      ]);
    });

    it('should create multiple CSS variables safely', () => {
      const colors = {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        invalid: 'notacolor',
      };

      const cssVars = Object.entries(colors)
        .map(([name, color]) => createSafeCSSVariable(name, color))
        .filter(v => v !== '');

      expect(cssVars).toHaveLength(2);
      expect(cssVars[0]).toContain('--color-primary');
      expect(cssVars[1]).toContain('--color-secondary');
    });

    it('should validate Tailwind CSS variables', () => {
      expect(validateColor('var(--tw-ring-color)')).toBe('var(--tw-ring-color)');
      expect(validateColor('var(--tw-text-opacity)')).toBe('var(--tw-text-opacity)');
    });
  });
});
