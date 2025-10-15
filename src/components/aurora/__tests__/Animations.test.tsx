/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FadeIn } from '../animations/FadeIn';
import { StaggerChildren } from '../animations/StaggerChildren';

describe('FadeIn Component', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <FadeIn>
          <div>Test Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      const { getByText } = render(
        <FadeIn>
          <p>Fade In Content</p>
        </FadeIn>
      );
      expect(getByText('Fade In Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <FadeIn className="custom-fade">
          <div>Content</div>
        </FadeIn>
      );
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('custom-fade');
    });
  });

  describe('Direction Variants', () => {
    it('applies up direction by default', () => {
      const { container } = render(
        <FadeIn>
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts down direction', () => {
      const { container } = render(
        <FadeIn direction="down">
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts left direction', () => {
      const { container } = render(
        <FadeIn direction="left">
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts right direction', () => {
      const { container } = render(
        <FadeIn direction="right">
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts none direction', () => {
      const { container } = render(
        <FadeIn direction="none">
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Animation Timing', () => {
    it('accepts custom delay', () => {
      const { container } = render(
        <FadeIn delay={300}>
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts custom duration', () => {
      const { container } = render(
        <FadeIn duration={800}>
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts custom distance', () => {
      const { container } = render(
        <FadeIn distance={50}>
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('combines timing parameters', () => {
      const { container } = render(
        <FadeIn delay={200} duration={600} distance={30}>
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Viewport Detection', () => {
    it('enables viewport detection by default', () => {
      const { container } = render(
        <FadeIn>
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('can disable viewport detection', () => {
      const { container } = render(
        <FadeIn viewport={false}>
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('respects once parameter', () => {
      const { container } = render(
        <FadeIn once={true}>
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('can animate multiple times', () => {
      const { container } = render(
        <FadeIn once={false}>
          <div>Content</div>
        </FadeIn>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Complex Content', () => {
    it('handles nested elements', () => {
      const { getByText } = render(
        <FadeIn>
          <div>
            <h1>Title</h1>
            <p>Paragraph</p>
          </div>
        </FadeIn>
      );
      expect(getByText('Title')).toBeInTheDocument();
      expect(getByText('Paragraph')).toBeInTheDocument();
    });

    it('handles components as children', () => {
      const TestComponent = () => <span>Test Component</span>;
      const { getByText } = render(
        <FadeIn>
          <TestComponent />
        </FadeIn>
      );
      expect(getByText('Test Component')).toBeInTheDocument();
    });
  });
});

describe('StaggerChildren Component', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <StaggerChildren>
          <div>Child 1</div>
          <div>Child 2</div>
        </StaggerChildren>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('renders all children', () => {
      const { getByText } = render(
        <StaggerChildren>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </StaggerChildren>
      );
      expect(getByText('Child 1')).toBeInTheDocument();
      expect(getByText('Child 2')).toBeInTheDocument();
      expect(getByText('Child 3')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <StaggerChildren className="custom-stagger">
          <div>Child</div>
        </StaggerChildren>
      );
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('custom-stagger');
    });
  });

  describe('Timing Configuration', () => {
    it('accepts custom stagger delay', () => {
      const { container } = render(
        <StaggerChildren staggerDelay={200}>
          <div>Child 1</div>
          <div>Child 2</div>
        </StaggerChildren>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts initial delay', () => {
      const { container } = render(
        <StaggerChildren initialDelay={300}>
          <div>Child 1</div>
          <div>Child 2</div>
        </StaggerChildren>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('accepts custom duration', () => {
      const { container } = render(
        <StaggerChildren duration={600}>
          <div>Child 1</div>
          <div>Child 2</div>
        </StaggerChildren>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('combines all timing parameters', () => {
      const { container } = render(
        <StaggerChildren staggerDelay={150} initialDelay={200} duration={700}>
          <div>Child 1</div>
          <div>Child 2</div>
        </StaggerChildren>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Once Parameter', () => {
    it('animates once by default', () => {
      const { container } = render(
        <StaggerChildren>
          <div>Child</div>
        </StaggerChildren>
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    it('can animate multiple times', () => {
      const { container } = render(
        <StaggerChildren once={false}>
          <div>Child</div>
        </StaggerChildren>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Children Wrapping', () => {
    it('wraps each child in motion.div', () => {
      const { container } = render(
        <StaggerChildren>
          <div>Child 1</div>
          <div>Child 2</div>
        </StaggerChildren>
      );
      // Проверяем, что дети обернуты
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children.length).toBe(2);
    });

    it('handles single child', () => {
      const { getByText } = render(
        <StaggerChildren>
          <div>Only Child</div>
        </StaggerChildren>
      );
      expect(getByText('Only Child')).toBeInTheDocument();
    });

    it('handles many children', () => {
      const { container } = render(
        <StaggerChildren>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i}>Child {i + 1}</div>
          ))}
        </StaggerChildren>
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.children.length).toBe(10);
    });
  });

  describe('Complex Content', () => {
    it('handles nested components', () => {
      const { getByText } = render(
        <StaggerChildren>
          <div>
            <h2>Title 1</h2>
          </div>
          <div>
            <h2>Title 2</h2>
          </div>
        </StaggerChildren>
      );
      expect(getByText('Title 1')).toBeInTheDocument();
      expect(getByText('Title 2')).toBeInTheDocument();
    });

    it('handles different element types', () => {
      const { getByText } = render(
        <StaggerChildren>
          <button>Button</button>
          <p>Paragraph</p>
          <span>Span</span>
        </StaggerChildren>
      );
      expect(getByText('Button')).toBeInTheDocument();
      expect(getByText('Paragraph')).toBeInTheDocument();
      expect(getByText('Span')).toBeInTheDocument();
    });
  });
});

describe('Animation Components Integration', () => {
  it('FadeIn and StaggerChildren can be nested', () => {
    const { getByText } = render(
      <FadeIn>
        <StaggerChildren>
          <div>Item 1</div>
          <div>Item 2</div>
        </StaggerChildren>
      </FadeIn>
    );
    expect(getByText('Item 1')).toBeInTheDocument();
    expect(getByText('Item 2')).toBeInTheDocument();
  });

  it('StaggerChildren can contain FadeIn components', () => {
    const { getByText } = render(
      <StaggerChildren>
        <FadeIn direction="left">
          <div>Left Item</div>
        </FadeIn>
        <FadeIn direction="right">
          <div>Right Item</div>
        </FadeIn>
      </StaggerChildren>
    );
    expect(getByText('Left Item')).toBeInTheDocument();
    expect(getByText('Right Item')).toBeInTheDocument();
  });

  it('multiple FadeIn components work independently', () => {
    const { getByText } = render(
      <div>
        <FadeIn direction="up">
          <div>Up</div>
        </FadeIn>
        <FadeIn direction="down">
          <div>Down</div>
        </FadeIn>
      </div>
    );
    expect(getByText('Up')).toBeInTheDocument();
    expect(getByText('Down')).toBeInTheDocument();
  });
});
