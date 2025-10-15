/**
 * Aurora Fixes Regression Tests
 * Проверяет, что все исправления применены корректно
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectRoot = join(__dirname, '../..');

describe('Aurora Fixes - Regression Tests', () => {
  describe('CSS Imports Order', () => {
    it('should have @import statements before other CSS rules', () => {
      const indexCssPath = join(projectRoot, 'src/index.css');
      const content = readFileSync(indexCssPath, 'utf-8');

      const lines = content.split('\n');
      let foundImport = false;
      let foundNonImport = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('@import')) {
          foundImport = true;
          // После нахождения не-import строки, не должно быть @import
          expect(foundNonImport).toBe(false);
        } else if (trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && !trimmed.startsWith('//')) {
          if (foundImport && !trimmed.startsWith('@import')) {
            foundNonImport = true;
          }
        }
      }

      expect(foundImport).toBe(true);
    });
  });

  describe('React.memo Usage', () => {
    it('should wrap GlassCard subcomponents in React.memo', () => {
      const glassCardPath = join(projectRoot, 'src/components/aurora/core/GlassCard.tsx');
      const content = readFileSync(glassCardPath, 'utf-8');

      // Проверяем, что субкомпоненты обернуты в React.memo
      expect(content).toContain('React.memo(forwardRef<HTMLDivElement, GlassCardHeaderProps>');
      expect(content).toContain('React.memo(forwardRef<HTMLParagraphElement, GlassCardTitleProps>');
      expect(content).toContain('React.memo(forwardRef<HTMLDivElement, GlassCardContentProps>');
      expect(content).toContain('React.memo(forwardRef<HTMLDivElement, GlassCardFooterProps>');
    });
  });

  describe('useEffect Cleanup', () => {
    it('should have cleanup in AuroraBackground useEffect', () => {
      const auroraBackgroundPath = join(projectRoot, 'src/components/aurora/effects/AuroraBackground.tsx');
      const content = readFileSync(auroraBackgroundPath, 'utf-8');

      // Проверяем наличие cleanup для mousemove listener
      expect(content).toContain('window.addEventListener');
      expect(content).toContain('window.removeEventListener');
      expect(content).toContain('return () =>');
    });

    it('should have cleanup in AnimatedList IntersectionObserver', () => {
      const animatedListPath = join(projectRoot, 'src/components/aurora/animated/AnimatedList.tsx');
      const content = readFileSync(animatedListPath, 'utf-8');

      // Проверяем наличие cleanup для IntersectionObserver
      expect(content).toContain('IntersectionObserver');
      expect(content).toContain('observer.disconnect()');
      expect(content).toContain('return () => observer.disconnect()');
    });

    it('should have cleanup in useReducedMotion hook', () => {
      const useReducedMotionPath = join(projectRoot, 'src/hooks/aurora/useReducedMotion.ts');
      const content = readFileSync(useReducedMotionPath, 'utf-8');

      // Проверяем наличие cleanup для media query listener
      expect(content).toContain('mediaQuery.addEventListener');
      expect(content).toContain('mediaQuery.removeEventListener');
    });
  });

  describe('prefers-reduced-motion Support', () => {
    it('should import useReducedMotion in FadeIn', () => {
      const fadeInPath = join(projectRoot, 'src/components/aurora/animations/FadeIn.tsx');
      const content = readFileSync(fadeInPath, 'utf-8');

      expect(content).toContain("import { useReducedMotion } from '@/hooks/aurora/useReducedMotion'");
      expect(content).toContain('const prefersReducedMotion = useReducedMotion()');
      expect(content).toContain('prefersReducedMotion ?');
    });

    it('should import useReducedMotion in StaggerChildren', () => {
      const staggerPath = join(projectRoot, 'src/components/aurora/animations/StaggerChildren.tsx');
      const content = readFileSync(staggerPath, 'utf-8');

      expect(content).toContain("import { useReducedMotion } from '@/hooks/aurora/useReducedMotion'");
      expect(content).toContain('const prefersReducedMotion = useReducedMotion()');
    });
  });

  describe('ErrorBoundary Component', () => {
    it('should have ErrorBoundary component', () => {
      const errorBoundaryPath = join(projectRoot, 'src/components/aurora/ErrorBoundary.tsx');
      expect(existsSync(errorBoundaryPath)).toBe(true);

      const content = readFileSync(errorBoundaryPath, 'utf-8');
      expect(content).toContain('export class ErrorBoundary extends Component');
      expect(content).toContain('componentDidCatch');
      expect(content).toContain('getDerivedStateFromError');
    });

    it('should export ErrorBoundary from aurora index', () => {
      const indexPath = join(projectRoot, 'src/components/aurora/index.ts');
      const content = readFileSync(indexPath, 'utf-8');

      expect(content).toContain("export { ErrorBoundary, ErrorBoundaryWrapper } from './ErrorBoundary'");
    });
  });

  describe('Accessibility Features', () => {
    it('should have keyboard support in GlassCard interactive variant', () => {
      const glassCardPath = join(projectRoot, 'src/components/aurora/core/GlassCard.tsx');
      const content = readFileSync(glassCardPath, 'utf-8');

      expect(content).toContain('handleKeyDown');
      expect(content).toContain("e.key === 'Enter'");
      expect(content).toContain("e.key === ' '");
      expect(content).toContain("role: variant === 'interactive' ? 'button' : undefined");
      expect(content).toContain('tabIndex');
    });

    it('should have keyboard support in FluidButton', () => {
      const fluidButtonPath = join(projectRoot, 'src/components/aurora/core/FluidButton.tsx');
      const content = readFileSync(fluidButtonPath, 'utf-8');

      expect(content).toContain('handleKeyDown');
      expect(content).toContain('onKeyDown');
    });
  });

  describe('Performance Optimizations', () => {
    it('should use memo for DataTable', () => {
      const dataTablePath = join(projectRoot, 'src/components/DataTable.tsx');
      const content = readFileSync(dataTablePath, 'utf-8');

      expect(content).toContain('export const DataTable = memo');
      expect(content).toContain('useCallback');
      expect(content).toContain('useMemo');
    });

    it('should have backdrop-filter fallback in GlassCard', () => {
      const glassCardPath = join(projectRoot, 'src/components/aurora/core/GlassCard.tsx');
      const content = readFileSync(glassCardPath, 'utf-8');

      expect(content).toContain('getBrowserCapabilities');
      expect(content).toContain('backdropFilter');
      expect(content).toContain('supportsBackdrop');
      // Проверяем наличие тернарного оператора с fallback
      expect(content).toMatch(/supportsBackdrop\s*\?|supportsBackdrop\s*$/m);
    });
  });

  describe('Configuration Files', () => {
    it('should have aurora-fixes.config.ts', () => {
      const configPath = join(projectRoot, 'src/config/aurora-fixes.config.ts');
      expect(existsSync(configPath)).toBe(true);

      const content = readFileSync(configPath, 'utf-8');
      expect(content).toContain('export interface AuroraFixesConfig');
      expect(content).toContain('defaultAuroraFixesConfig');
    });
  });

  describe('Code Quality', () => {
    it('should have displayName for all Aurora components', () => {
      const components = [
        'src/components/aurora/core/GlassCard.tsx',
        'src/components/aurora/core/FluidButton.tsx',
        'src/components/aurora/animations/FadeIn.tsx',
        'src/components/aurora/animations/StaggerChildren.tsx',
        'src/components/aurora/animated/AnimatedList.tsx',
      ];

      components.forEach((componentPath) => {
        const fullPath = join(projectRoot, componentPath);
        const content = readFileSync(fullPath, 'utf-8');
        expect(content).toContain('.displayName =');
      });
    });
  });
});
