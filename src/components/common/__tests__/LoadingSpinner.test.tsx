import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('должен рендериться корректно', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('должен содержать анимацию', () => {
    render(<LoadingSpinner />);
    const spinnerContainer = screen.getByRole('status');
    // animate-spin находится на SVG элементе внутри контейнера
    const svgElement = spinnerContainer.querySelector('svg');
    expect(svgElement).toBeDefined();
    expect(svgElement?.classList.contains('animate-spin')).toBe(true);
  });

  it('должен быть доступным', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label');
  });
});
