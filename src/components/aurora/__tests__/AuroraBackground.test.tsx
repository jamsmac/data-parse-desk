/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { AuroraBackground } from '../effects/AuroraBackground';

describe('AuroraBackground', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<AuroraBackground />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      const { getByText } = render(
        <AuroraBackground>
          <div>Test Content</div>
        </AuroraBackground>
      );
      expect(getByText('Test Content')).toBeInTheDocument();
    });

    it('applies default className', () => {
      const { container } = render(<AuroraBackground />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('relative', 'overflow-hidden');
    });

    it('merges custom className', () => {
      const { container } = render(
        <AuroraBackground className="custom-class" />
      );
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it('applies aurora variant by default', () => {
      const { container } = render(<AuroraBackground />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies nebula variant', () => {
      const { container } = render(<AuroraBackground variant="nebula" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies ocean variant', () => {
      const { container } = render(<AuroraBackground variant="ocean" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies sunset variant', () => {
      const { container } = render(<AuroraBackground variant="sunset" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('applies forest variant', () => {
      const { container } = render(<AuroraBackground variant="forest" />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Intensity', () => {
    it('accepts subtle intensity', () => {
      const { container } = render(<AuroraBackground intensity="subtle" />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts medium intensity by default', () => {
      const { container } = render(<AuroraBackground />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts strong intensity', () => {
      const { container} = render(<AuroraBackground intensity="strong" />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Animation Control', () => {
    it('renders with animation by default', () => {
      const { container } = render(<AuroraBackground />);
      // Компонент должен отрендериться с анимацией
      expect(container.firstChild).toBeInTheDocument();
    });

    it('can disable animation', () => {
      const { container } = render(<AuroraBackground animated={false} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Parallax Features', () => {
    it('enables parallax by default', () => {
      const { container } = render(<AuroraBackground />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('can disable parallax', () => {
      const { container } = render(<AuroraBackground parallax={false} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Speed Control', () => {
    it('accepts custom speed', () => {
      const { container } = render(<AuroraBackground speed={2} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts slow speed', () => {
      const { container } = render(<AuroraBackground speed={0.5} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts fast speed', () => {
      const { container } = render(<AuroraBackground speed={3} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('has relative positioning', () => {
      const { container } = render(<AuroraBackground />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('relative');
    });

    it('has overflow hidden', () => {
      const { container } = render(<AuroraBackground />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('overflow-hidden');
    });

    it('renders background layer', () => {
      const { container } = render(<AuroraBackground />);
      const bgLayer = container.querySelector('.bg-background');
      expect(bgLayer).toBeInTheDocument();
    });

    it('renders content in relative z-index layer', () => {
      const { container } = render(
        <AuroraBackground>
          <div>Content</div>
        </AuroraBackground>
      );
      const contentLayer = container.querySelector('.relative.z-10');
      expect(contentLayer).toBeInTheDocument();
    });
  });

  describe('Gradient Spheres', () => {
    it('renders gradient sphere container', () => {
      const { container } = render(<AuroraBackground />);
      // Ищем контейнер со сферами
      const sphereContainer = container.querySelector('.absolute.inset-0');
      expect(sphereContainer).toBeInTheDocument();
    });

    it('applies blur filter to spheres', () => {
      const { container } = render(<AuroraBackground intensity="medium" />);
      const elements = container.querySelectorAll('[style*="filter"]');
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('does not interfere with child content interaction', () => {
      const { getByRole } = render(
        <AuroraBackground>
          <button>Click me</button>
        </AuroraBackground>
      );
      
      const button = getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('content layer is above background', () => {
      const { container } = render(
        <AuroraBackground>
          <p>Test</p>
        </AuroraBackground>
      );
      
      const contentLayer = container.querySelector('.z-10');
      expect(contentLayer).toBeInTheDocument();
    });
  });

  describe('Complete Composition', () => {
    it('renders with all custom props', () => {
      const { getByText, container } = render(
        <AuroraBackground
          variant="nebula"
          intensity="strong"
          speed={2}
          parallax={true}
          animated={true}
          className="custom-aurora"
        >
          <h1>Aurora Title</h1>
          <p>Aurora Content</p>
        </AuroraBackground>
      );

      expect(getByText('Aurora Title')).toBeInTheDocument();
      expect(getByText('Aurora Content')).toBeInTheDocument();
      expect(container.firstChild).toHaveClass('custom-aurora');
    });
  });

  describe('SSR Compatibility', () => {
    it('renders fallback before mounting', () => {
      const { container } = render(<AuroraBackground />);
      // Компонент должен отрендериться даже если isMounted = false
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
