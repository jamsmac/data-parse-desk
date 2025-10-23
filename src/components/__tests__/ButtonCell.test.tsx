import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ButtonCell } from '@/components/cells/ButtonCell';
import { ButtonConfig } from '@/types/database';

// Mock window.open
const mockWindowOpen = vi.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
  writable: true,
});

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('ButtonCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render button with default label', () => {
      const config: ButtonConfig = {
        action: 'custom',
        label: 'Click Me',
      };

      render(<ButtonCell config={config} />);

      expect(screen.getByRole('button', { name: /Click Me/i })).toBeInTheDocument();
    });

    it('should render button with fallback label', () => {
      const config: ButtonConfig = {
        action: 'custom',
      };

      render(<ButtonCell config={config} />);

      expect(screen.getByRole('button', { name: /Action/i })).toBeInTheDocument();
    });

    it('should render correct icon for open_url action', () => {
      const config: ButtonConfig = {
        action: 'open_url',
        label: 'Visit',
        url: 'https://example.com',
      };

      render(<ButtonCell config={config} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Visit: Open URL in new tab');
    });

    it('should render correct icon for send_email action', () => {
      const config: ButtonConfig = {
        action: 'send_email',
        label: 'Email',
        email_template: 'Hello',
      };

      render(<ButtonCell config={config} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Email: Send email');
    });

    it('should render correct icon for run_formula action', () => {
      const config: ButtonConfig = {
        action: 'run_formula',
        label: 'Calculate',
        formula: '=A1+B1',
      };

      render(<ButtonCell config={config} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Calculate: Run formula');
    });

    it('should render correct icon for custom action', () => {
      const config: ButtonConfig = {
        action: 'custom',
        label: 'Custom',
      };

      render(<ButtonCell config={config} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom: Execute custom action');
    });

    it('should apply custom variant', () => {
      const config: ButtonConfig = {
        action: 'custom',
        label: 'Test',
        variant: 'destructive',
      };

      render(<ButtonCell config={config} />);

      const button = screen.getByRole('button');
      // Check for bg-destructive class which is applied by destructive variant
      expect(button).toHaveClass('bg-destructive');
    });

    it('should apply default variant when not specified', () => {
      const config: ButtonConfig = {
        action: 'custom',
        label: 'Test',
      };

      render(<ButtonCell config={config} />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary'); // default variant has bg-primary
    });
  });

  describe('open_url action', () => {
    it('should open URL in new tab', () => {
      const config: ButtonConfig = {
        action: 'open_url',
        label: 'Visit',
        url: 'https://example.com',
      };

      render(<ButtonCell config={config} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com', '_blank');
    });

    it('should replace placeholders with row data', () => {
      const config: ButtonConfig = {
        action: 'open_url',
        label: 'Visit',
        url: 'https://example.com/user/{id}/profile/{name}',
      };

      const rowData = { id: '123', name: 'john' };

      render(<ButtonCell config={config} rowData={rowData} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com/user/123/profile/john',
        '_blank'
      );
    });

    it('should handle missing row data in placeholders', () => {
      const config: ButtonConfig = {
        action: 'open_url',
        label: 'Visit',
        url: 'https://example.com/user/{id}',
      };

      const rowData = { name: 'john' }; // id is missing

      render(<ButtonCell config={config} rowData={rowData} />);

      fireEvent.click(screen.getByRole('button'));

      // When key doesn't exist in rowData, placeholder is not replaced
      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/user/{id}', '_blank');
    });

    it('should not open URL if url is not configured', () => {
      const config: ButtonConfig = {
        action: 'open_url',
        label: 'Visit',
      };

      render(<ButtonCell config={config} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should handle null values in row data', () => {
      const config: ButtonConfig = {
        action: 'open_url',
        label: 'Visit',
        url: 'https://example.com/user/{id}',
      };

      const rowData = { id: null };

      render(<ButtonCell config={config} rowData={rowData} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockWindowOpen).toHaveBeenCalledWith('https://example.com/user/', '_blank');
    });
  });

  describe('send_email action', () => {
    it('should open mailto link with email template', () => {
      const config: ButtonConfig = {
        action: 'send_email',
        label: 'Email',
        email_template: 'Hello, this is a test email.',
      };

      render(<ButtonCell config={config} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('mailto:?subject=')
      );
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('Hello%2C%20this%20is%20a%20test%20email.')
      );
    });

    it('should replace placeholders in email template', () => {
      const config: ButtonConfig = {
        action: 'send_email',
        label: 'Email',
        email_template: 'Hello {name}, your order {orderId} is ready.',
      };

      const rowData = { name: 'John', orderId: '12345' };

      render(<ButtonCell config={config} rowData={rowData} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('Hello%20John')
      );
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('order%2012345')
      );
    });

    it('should not send email if template is not configured', () => {
      const config: ButtonConfig = {
        action: 'send_email',
        label: 'Email',
      };

      render(<ButtonCell config={config} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('should encode special characters in email', () => {
      const config: ButtonConfig = {
        action: 'send_email',
        label: 'Email',
        email_template: 'Test & special <characters>',
      };

      render(<ButtonCell config={config} />);

      fireEvent.click(screen.getByRole('button'));

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('%26') // & encoded
      );
    });
  });

  describe('run_formula action', () => {
    it('should call onAction with formula data', () => {
      const onAction = vi.fn();
      const config: ButtonConfig = {
        action: 'run_formula',
        label: 'Calculate',
        formula: '=A1+B1',
      };

      const rowData = { A1: 10, B1: 20 };

      render(<ButtonCell config={config} rowData={rowData} onAction={onAction} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onAction).toHaveBeenCalledWith('run_formula', {
        formula: '=A1+B1',
        rowData: { A1: 10, B1: 20 },
      });
    });

    it('should not call onAction if formula is not configured', () => {
      const onAction = vi.fn();
      const config: ButtonConfig = {
        action: 'run_formula',
        label: 'Calculate',
      };

      render(<ButtonCell config={config} onAction={onAction} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onAction).not.toHaveBeenCalled();
    });

    it('should not call onAction if onAction is not provided', () => {
      const config: ButtonConfig = {
        action: 'run_formula',
        label: 'Calculate',
        formula: '=A1+B1',
      };

      render(<ButtonCell config={config} />);

      // Should not throw error
      fireEvent.click(screen.getByRole('button'));
    });
  });

  describe('custom action', () => {
    it('should call onAction with row data', () => {
      const onAction = vi.fn();
      const config: ButtonConfig = {
        action: 'custom',
        label: 'Custom',
      };

      const rowData = { id: '123', name: 'test' };

      render(<ButtonCell config={config} rowData={rowData} onAction={onAction} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onAction).toHaveBeenCalledWith('custom', { rowData });
    });

    it('should call onAction even without row data', () => {
      const onAction = vi.fn();
      const config: ButtonConfig = {
        action: 'custom',
        label: 'Custom',
      };

      render(<ButtonCell config={config} onAction={onAction} />);

      fireEvent.click(screen.getByRole('button'));

      expect(onAction).toHaveBeenCalledWith('custom', { rowData: undefined });
    });

    it('should not throw if onAction is not provided', () => {
      const config: ButtonConfig = {
        action: 'custom',
        label: 'Custom',
      };

      render(<ButtonCell config={config} />);

      // Should not throw error
      fireEvent.click(screen.getByRole('button'));
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      const config: ButtonConfig = {
        action: 'open_url',
        label: 'Visit',
        url: 'https://example.com',
      };

      // Make window.open throw error
      mockWindowOpen.mockImplementationOnce(() => {
        throw new Error('Window blocked');
      });

      render(<ButtonCell config={config} />);

      // Should not crash
      fireEvent.click(screen.getByRole('button'));

      const { toast } = await import('sonner');
      expect(toast.error).toHaveBeenCalledWith('Failed to execute button action');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label for screen readers', () => {
      const config: ButtonConfig = {
        action: 'open_url',
        label: 'Visit Site',
        url: 'https://example.com',
      };

      render(<ButtonCell config={config} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Visit Site: Open URL in new tab');
      expect(button).toHaveAttribute('title', 'Visit Site: Open URL in new tab');
    });

    it('should have aria-hidden on icons', () => {
      const config: ButtonConfig = {
        action: 'open_url',
        label: 'Visit',
        url: 'https://example.com',
      };

      const { container } = render(<ButtonCell config={config} />);

      const icon = container.querySelector('svg');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
