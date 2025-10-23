import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '@/components/common/EmptyState';
import { FileIcon, Database, Inbox } from 'lucide-react';

describe('EmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Required Props', () => {
    it('should render with only title prop', () => {
      render(<EmptyState title="No data available" />);

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should render title as h3 heading', () => {
      render(<EmptyState title="Test Title" />);

      const heading = screen.getByRole('heading', { level: 3, name: 'Test Title' });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Optional Description', () => {
    it('should render description when provided', () => {
      render(
        <EmptyState
          title="No data"
          description="Start by uploading your first file"
        />
      );

      expect(screen.getByText('Start by uploading your first file')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const { container } = render(<EmptyState title="No data" />);

      const descriptions = container.querySelectorAll('p');
      expect(descriptions.length).toBe(0);
    });

    it('should render description with proper styling', () => {
      render(
        <EmptyState
          title="No data"
          description="Test description"
        />
      );

      const description = screen.getByText('Test description');
      expect(description).toHaveClass('text-sm');
      expect(description).toHaveClass('text-muted-foreground');
    });
  });

  describe('Icon', () => {
    it('should render icon when provided', () => {
      const { container } = render(
        <EmptyState
          icon={FileIcon}
          title="No files"
        />
      );

      const icon = container.querySelector('.lucide-file');
      expect(icon).toBeInTheDocument();
    });

    it('should not render icon when not provided', () => {
      const { container } = render(<EmptyState title="No data" />);

      const iconContainer = container.querySelector('.rounded-full.bg-muted');
      expect(iconContainer).not.toBeInTheDocument();
    });

    it('should render different icons correctly', () => {
      const { container, rerender } = render(
        <EmptyState icon={Database} title="No databases" />
      );

      expect(container.querySelector('.lucide-database')).toBeInTheDocument();

      rerender(<EmptyState icon={Inbox} title="No items" />);
      expect(container.querySelector('.lucide-inbox')).toBeInTheDocument();
    });

    it('should render icon with proper size classes', () => {
      const { container } = render(
        <EmptyState icon={FileIcon} title="No files" />
      );

      const icon = container.querySelector('.lucide-file');
      expect(icon).toHaveClass('h-10');
      expect(icon).toHaveClass('w-10');
    });

    it('should render icon container with proper styling', () => {
      const { container } = render(
        <EmptyState icon={FileIcon} title="No files" />
      );

      const iconContainer = container.querySelector('.rounded-full.bg-muted');
      expect(iconContainer).toHaveClass('mb-4');
      expect(iconContainer).toHaveClass('p-3');
    });
  });

  describe('Action Button', () => {
    it('should render action button when provided', () => {
      const mockOnClick = vi.fn();

      render(
        <EmptyState
          title="No data"
          action={{ label: 'Upload File', onClick: mockOnClick }}
        />
      );

      expect(screen.getByRole('button', { name: 'Upload File' })).toBeInTheDocument();
    });

    it('should not render action button when not provided', () => {
      render(<EmptyState title="No data" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should call onClick when action button is clicked', () => {
      const mockOnClick = vi.fn();

      render(
        <EmptyState
          title="No data"
          action={{ label: 'Add Item', onClick: mockOnClick }}
        />
      );

      const button = screen.getByRole('button', { name: 'Add Item' });
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should render button with correct label', () => {
      const mockOnClick = vi.fn();

      render(
        <EmptyState
          title="No data"
          action={{ label: 'Create New', onClick: mockOnClick }}
        />
      );

      expect(screen.getByText('Create New')).toBeInTheDocument();
    });

    it('should handle multiple clicks on action button', () => {
      const mockOnClick = vi.fn();

      render(
        <EmptyState
          title="No data"
          action={{ label: 'Click me', onClick: mockOnClick }}
        />
      );

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(mockOnClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <EmptyState
          title="No data"
          className="custom-class"
        />
      );

      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass('custom-class');
    });

    it('should merge custom className with default classes', () => {
      const { container } = render(
        <EmptyState
          title="No data"
          className="my-custom-class"
        />
      );

      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass('my-custom-class');
      expect(rootDiv).toHaveClass('flex');
      expect(rootDiv).toHaveClass('flex-col');
    });

    it('should work without custom className', () => {
      const { container } = render(<EmptyState title="No data" />);

      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass('flex');
      expect(rootDiv).toHaveClass('items-center');
    });
  });

  describe('Complete Examples', () => {
    it('should render full empty state with all props', () => {
      const mockOnClick = vi.fn();

      render(
        <EmptyState
          icon={FileIcon}
          title="No files uploaded"
          description="Get started by uploading your first file"
          action={{ label: 'Upload Now', onClick: mockOnClick }}
          className="custom-empty-state"
        />
      );

      expect(screen.getByText('No files uploaded')).toBeInTheDocument();
      expect(screen.getByText('Get started by uploading your first file')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Upload Now' })).toBeInTheDocument();
    });

    it('should render minimal empty state with only title', () => {
      render(<EmptyState title="Nothing here" />);

      expect(screen.getByText('Nothing here')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should render empty state with icon and description but no action', () => {
      render(
        <EmptyState
          icon={Inbox}
          title="Empty inbox"
          description="No messages to display"
        />
      );

      expect(screen.getByText('Empty inbox')).toBeInTheDocument();
      expect(screen.getByText('No messages to display')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have centered layout classes', () => {
      const { container } = render(<EmptyState title="Test" />);

      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass('flex');
      expect(rootDiv).toHaveClass('flex-col');
      expect(rootDiv).toHaveClass('items-center');
      expect(rootDiv).toHaveClass('justify-center');
    });

    it('should have padding classes', () => {
      const { container } = render(<EmptyState title="Test" />);

      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass('py-12');
      expect(rootDiv).toHaveClass('px-4');
    });

    it('should have text-center class', () => {
      const { container } = render(<EmptyState title="Test" />);

      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass('text-center');
    });

    it('should have proper title styling', () => {
      render(<EmptyState title="Test Title" />);

      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveClass('text-lg');
      expect(title).toHaveClass('font-semibold');
      expect(title).toHaveClass('mb-2');
    });

    it('should have proper description max-width', () => {
      render(
        <EmptyState
          title="Test"
          description="Long description text"
        />
      );

      const description = screen.getByText('Long description text');
      expect(description).toHaveClass('max-w-sm');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading', () => {
      render(<EmptyState title="No data available" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible button when action is provided', () => {
      const mockOnClick = vi.fn();

      render(
        <EmptyState
          title="No data"
          action={{ label: 'Add Data', onClick: mockOnClick }}
        />
      );

      const button = screen.getByRole('button', { name: 'Add Data' });
      expect(button).toBeInTheDocument();
    });

    it('should render semantic HTML structure', () => {
      const { container } = render(
        <EmptyState
          title="Test"
          description="Description"
        />
      );

      expect(container.querySelector('h3')).toBeInTheDocument();
      expect(container.querySelector('p')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string title', () => {
      render(<EmptyState title="" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('');
    });

    it('should handle long title text', () => {
      const longTitle = 'This is a very long title that contains a lot of text to test how the component handles it';

      render(<EmptyState title={longTitle} />);

      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle long description text', () => {
      const longDescription = 'This is a very long description with multiple sentences. It contains lots of text to see how the component handles longer content. The description should wrap properly and maintain readability.';

      render(
        <EmptyState
          title="Test"
          description={longDescription}
        />
      );

      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should handle action with empty label', () => {
      const mockOnClick = vi.fn();

      render(
        <EmptyState
          title="Test"
          action={{ label: '', onClick: mockOnClick }}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('');
    });

    it('should handle rapid button clicks', () => {
      const mockOnClick = vi.fn();

      render(
        <EmptyState
          title="Test"
          action={{ label: 'Click', onClick: mockOnClick }}
        />
      );

      const button = screen.getByRole('button');

      // Simulate rapid clicks
      for (let i = 0; i < 10; i++) {
        fireEvent.click(button);
      }

      expect(mockOnClick).toHaveBeenCalledTimes(10);
    });
  });
});
