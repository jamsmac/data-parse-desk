import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('должен рендериться с текстом', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeDefined();
    expect(screen.getByText('Click me')).toBeDefined();
  });

  it('должен применять variant классы', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('destructive');
  });

  it('должен быть disabled когда указано', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveProperty('disabled', true);
  });

  it('должен применять size классы', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    // For 'lg' size, Tailwind uses h-11 and px-8 classes
    expect(button.className).toContain('h-11');
    expect(button.className).toContain('px-8');
  });
});
