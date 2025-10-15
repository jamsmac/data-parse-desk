/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
  GlassCardFooter,
} from '../layouts/GlassCard';

describe('GlassCard', () => {
  describe('Basic Rendering', () => {
    it('renders children correctly', () => {
      const { getByText } = render(
        <GlassCard>
          <div>Test Content</div>
        </GlassCard>
      );
      expect(getByText('Test Content')).toBeDefined();
    });

    it('applies default intensity class', () => {
      const { container } = render(<GlassCard>Content</GlassCard>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('glass-medium');
    });

    it('applies custom className', () => {
      const { container } = render(
        <GlassCard className="custom-class">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Intensity Variants', () => {
    it('applies subtle intensity class', () => {
      const { container } = render(
        <GlassCard intensity="subtle">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('glass-subtle');
    });

    it('applies medium intensity class', () => {
      const { container } = render(
        <GlassCard intensity="medium">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('glass-medium');
    });

    it('applies strong intensity class', () => {
      const { container } = render(
        <GlassCard intensity="strong">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('glass-strong');
    });
  });

  describe('Hover Effects', () => {
    it('applies float hover effect', () => {
      const { container } = render(
        <GlassCard hover="float">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('glass-hover-float');
    });

    it('applies glow hover effect', () => {
      const { container } = render(
        <GlassCard hover="glow">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('glass-hover-glow');
    });

    it('applies scale hover effect', () => {
      const { container } = render(
        <GlassCard hover="scale">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('glass-hover-scale');
    });

    it('applies no hover effect when set to none', () => {
      const { container } = render(
        <GlassCard hover="none">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).not.toHaveClass('glass-hover-float');
      expect(card).not.toHaveClass('glass-hover-glow');
      expect(card).not.toHaveClass('glass-hover-scale');
    });
  });

  describe('Variants', () => {
    it('applies aurora variant class', () => {
      const { container } = render(
        <GlassCard variant="aurora">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('glass-aurora');
    });

    it('applies nebula variant class', () => {
      const { container } = render(
        <GlassCard variant="nebula">Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('glass-nebula');
    });
  });

  describe('Animation', () => {
    it('renders with animation by default', () => {
      const { container } = render(<GlassCard>Content</GlassCard>);
      const card = container.firstChild as HTMLElement;
      expect(card.tagName).toBe('DIV');
    });

    it('can disable animation', () => {
      const { container } = render(
        <GlassCard animated={false}>Content</GlassCard>
      );
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Gradient Border', () => {
    it('does not apply gradient border by default', () => {
      const { container } = render(<GlassCard>Content</GlassCard>);
      const card = container.firstChild as HTMLElement;
      expect(card.className).not.toContain('before:');
    });

    it('applies gradient border when enabled', () => {
      const { container } = render(
        <GlassCard gradient>Content</GlassCard>
      );
      const card = container.firstChild as HTMLElement;
      // Check for relative positioning (part of gradient border implementation)
      expect(card).toHaveClass('relative');
    });
  });
});

describe('GlassCardHeader', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <GlassCardHeader>
        <div>Header Content</div>
      </GlassCardHeader>
    );
    expect(getByText('Header Content')).toBeDefined();
  });

  it('applies default classes', () => {
    const { container } = render(
      <GlassCardHeader>Content</GlassCardHeader>
    );
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'pb-4');
  });

  it('accepts custom className', () => {
    const { container } = render(
      <GlassCardHeader className="custom">Content</GlassCardHeader>
    );
    const header = container.firstChild as HTMLElement;
    expect(header).toHaveClass('custom');
  });
});

describe('GlassCardTitle', () => {
  it('renders as h3 element', () => {
    const { getByText } = render(<GlassCardTitle>Title</GlassCardTitle>);
    const title = getByText('Title');
    expect(title.tagName).toBe('H3');
  });

  it('applies default styles', () => {
    const { getByText } = render(<GlassCardTitle>Title</GlassCardTitle>);
    const title = getByText('Title');
    expect(title.className).toContain('text-2xl');
    expect(title.className).toContain('font-semibold');
  });

  it('applies gradient text when enabled', () => {
    const { getByText } = render(<GlassCardTitle gradient>Title</GlassCardTitle>);
    const title = getByText('Title');
    expect(title.className).toContain('bg-gradient-to-r');
    expect(title.className).toContain('text-transparent');
  });

  it('does not apply gradient by default', () => {
    const { getByText } = render(<GlassCardTitle>Title</GlassCardTitle>);
    const title = getByText('Title');
    expect(title.className).not.toContain('bg-gradient-to-r');
  });
});

describe('GlassCardDescription', () => {
  it('renders children correctly', () => {
    const { getByText } = render(<GlassCardDescription>Description text</GlassCardDescription>);
    expect(getByText('Description text')).toBeDefined();
  });

  it('applies correct styles', () => {
    const { getByText } = render(<GlassCardDescription>Description</GlassCardDescription>);
    const desc = getByText('Description');
    expect(desc.className).toContain('text-sm');
  });
});

describe('GlassCardContent', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <GlassCardContent>
        <p>Card content</p>
      </GlassCardContent>
    );
    expect(getByText('Card content')).toBeDefined();
  });

  it('applies padding top zero', () => {
    const { container } = render(
      <GlassCardContent>Content</GlassCardContent>
    );
    const content = container.firstChild as HTMLElement;
    expect(content).toHaveClass('pt-0');
  });
});

describe('GlassCardFooter', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <GlassCardFooter>
        <button>Action</button>
      </GlassCardFooter>
    );
    expect(getByText('Action')).toBeDefined();
  });

  it('applies flex layout', () => {
    const { container } = render(
      <GlassCardFooter>Footer</GlassCardFooter>
    );
    const footer = container.firstChild as HTMLElement;
    expect(footer).toHaveClass('flex', 'items-center', 'pt-4');
  });
});

describe('Complete GlassCard Composition', () => {
  it('renders all subcomponents together', () => {
    const { getByText } = render(
      <GlassCard intensity="medium" hover="float" variant="aurora">
        <GlassCardHeader>
          <GlassCardTitle gradient>Card Title</GlassCardTitle>
          <GlassCardDescription>Card Description</GlassCardDescription>
        </GlassCardHeader>
        <GlassCardContent>
          <p>Main content goes here</p>
        </GlassCardContent>
        <GlassCardFooter>
          <button>Footer Action</button>
        </GlassCardFooter>
      </GlassCard>
    );

    expect(getByText('Card Title')).toBeDefined();
    expect(getByText('Card Description')).toBeDefined();
    expect(getByText('Main content goes here')).toBeDefined();
    expect(getByText('Footer Action')).toBeDefined();
  });
});
