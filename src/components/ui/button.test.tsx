import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('should render children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(
      <Button onClick={handleClick} disabled>
        Click me
      </Button>
    );

    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply variant classes', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    const button = container.querySelector('button');

    expect(button).toHaveClass('destructive');
  });

  it('should apply size classes', () => {
    const { container } = render(<Button size="sm">Small</Button>);
    const button = container.querySelector('button');

    expect(button).toHaveClass('sm');
  });

  it('should render as different element with asChild', () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>
    );

    const link = screen.getByText('Link');
    expect(link.tagName).toBe('A');
  });
});
