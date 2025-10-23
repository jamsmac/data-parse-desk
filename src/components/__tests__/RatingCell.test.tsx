import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { RatingCell } from '@/components/cells/RatingCell';
import { RatingConfig } from '@/types/database';

// Helper to check rating text content
const checkRatingText = (container: HTMLElement, expectedText: RegExp) => {
  const span = container.querySelector('.ml-2.text-sm');
  const text = span?.textContent?.replace(/\s+/g, ' ').trim() || '';
  expect(text).toMatch(expectedText);
};

describe('RatingCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render default 5 stars', () => {
      const config: RatingConfig = {};
      const { container } = render(<RatingCell value={0} config={config} />);
      const stars = container.querySelectorAll('.relative.inline-flex');
      expect(stars).toHaveLength(5);
    });

    it('should render custom number of stars', () => {
      const config: RatingConfig = { max_stars: 10 };
      const { container } = render(<RatingCell value={0} config={config} />);
      const stars = container.querySelectorAll('.relative.inline-flex');
      expect(stars).toHaveLength(10);
    });

    it('should display current rating value', () => {
      const config: RatingConfig = {};
      const { container } = render(<RatingCell value={3} config={config} />);
      checkRatingText(container, /3.*\/.*5/);
    });

    it('should display 0 when value is null', () => {
      const config: RatingConfig = {};
      const { container } = render(<RatingCell value={null} config={config} />);
      checkRatingText(container, /0.*\/.*5/);
    });

    it('should apply custom color', () => {
      const config: RatingConfig = { color: '#ff0000' };
      const { container } = render(<RatingCell value={3} config={config} />);
      const coloredStars = container.querySelectorAll('[style*="#ff0000"]');
      expect(coloredStars.length).toBeGreaterThan(0);
    });
  });

  describe('Interactive behavior', () => {
    it('should call onChange when clicking a star', () => {
      const onChange = vi.fn();
      const config: RatingConfig = {};
      const { container } = render(<RatingCell value={0} config={config} onChange={onChange} />);
      const stars = container.querySelectorAll('.relative.inline-flex');
      fireEvent.click(stars[2]);
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('should not call onChange when readonly', () => {
      const onChange = vi.fn();
      const config: RatingConfig = {};
      const { container } = render(<RatingCell value={0} config={config} onChange={onChange} readonly={true} />);
      const stars = container.querySelectorAll('.relative.inline-flex');
      fireEvent.click(stars[2]);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('should show pointer cursor when interactive', () => {
      const onChange = vi.fn();
      const config: RatingConfig = {};
      const { container } = render(<RatingCell value={0} config={config} onChange={onChange} />);
      const wrapper = container.querySelector('.flex.items-center');
      expect(wrapper).toHaveClass('cursor-pointer');
    });
  });
});
