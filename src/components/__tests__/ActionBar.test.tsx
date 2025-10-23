import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionBar } from '@/components/database/ActionBar';

// Mock ExportButton component
vi.mock('@/components/database/ExportButton', () => ({
  ExportButton: ({ data, fileName }: { data: any[]; fileName: string }) => (
    <div data-testid="export-button">Export {fileName}</div>
  ),
}));

describe('ActionBar', () => {
  const mockProps = {
    tableData: [{ id: 1, name: 'Test' }],
    commentsCount: 0,
    onUploadFile: vi.fn(),
    onAddRecord: vi.fn(),
    onAIAssistant: vi.fn(),
    onInsights: vi.fn(),
    onImportHistory: vi.fn(),
    onComments: vi.fn(),
    onClearData: vi.fn(),
    onDeleteDatabase: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Primary Actions', () => {
    it('should render upload file button', () => {
      render(<ActionBar {...mockProps} />);

      expect(screen.getByRole('button', { name: /загрузить файл/i })).toBeInTheDocument();
    });

    it('should render add record button', () => {
      render(<ActionBar {...mockProps} />);

      expect(screen.getByRole('button', { name: /добавить запись/i })).toBeInTheDocument();
    });

    it('should call onUploadFile when upload button is clicked', () => {
      render(<ActionBar {...mockProps} />);

      const uploadButton = screen.getByRole('button', { name: /загрузить файл/i });
      fireEvent.click(uploadButton);

      expect(mockProps.onUploadFile).toHaveBeenCalledTimes(1);
    });

    it('should call onAddRecord when add record button is clicked', () => {
      render(<ActionBar {...mockProps} />);

      const addButton = screen.getByRole('button', { name: /добавить запись/i });
      fireEvent.click(addButton);

      expect(mockProps.onAddRecord).toHaveBeenCalledTimes(1);
    });

    it('should render upload icon', () => {
      const { container } = render(<ActionBar {...mockProps} />);

      const uploadIcon = container.querySelector('.lucide-upload');
      expect(uploadIcon).toBeInTheDocument();
    });

    it('should render plus icon', () => {
      const { container } = render(<ActionBar {...mockProps} />);

      const plusIcon = container.querySelector('.lucide-plus');
      expect(plusIcon).toBeInTheDocument();
    });
  });

  describe('AI & Insights Dropdown', () => {
    it('should render AI & Insights dropdown trigger', () => {
      render(<ActionBar {...mockProps} />);

      expect(screen.getByRole('button', { name: /ai & insights/i })).toBeInTheDocument();
    });

    it('should render sparkles icon in AI dropdown trigger', () => {
      const { container } = render(<ActionBar {...mockProps} />);

      const sparklesIcons = container.querySelectorAll('.lucide-sparkles');
      expect(sparklesIcons.length).toBeGreaterThan(0);
    });

    it('should have proper button variant for AI dropdown', () => {
      render(<ActionBar {...mockProps} />);

      const aiButton = screen.getByRole('button', { name: /ai & insights/i });
      expect(aiButton).toHaveClass('border-input');
    });
  });

  describe('More Actions Dropdown', () => {
    it('should render more actions dropdown trigger', () => {
      const { container } = render(<ActionBar {...mockProps} />);

      // Check for the more-horizontal icon (now lucide-ellipsis)
      const moreButton = container.querySelector('.lucide-ellipsis');
      expect(moreButton).toBeInTheDocument();
    });

    it('should have proper button for more actions', () => {
      const { container } = render(<ActionBar {...mockProps} />);

      const buttons = screen.getAllByRole('button');
      const moreButton = buttons.find(button => button.querySelector('.lucide-ellipsis'));

      expect(moreButton).toBeInTheDocument();
      expect(moreButton).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  describe('Comments Count', () => {
    it('should accept comments count prop', () => {
      render(<ActionBar {...mockProps} commentsCount={5} />);
      // Component renders successfully with comments count
      expect(screen.getByRole('button', { name: /загрузить файл/i })).toBeInTheDocument();
    });

    it('should accept zero comments count', () => {
      render(<ActionBar {...mockProps} commentsCount={0} />);
      expect(screen.getByRole('button', { name: /загрузить файл/i })).toBeInTheDocument();
    });
  });

  describe('ExportButton Integration', () => {
    it('should render with tableData prop', () => {
      const tableData = [
        { id: 1, name: 'Row 1' },
        { id: 2, name: 'Row 2' },
      ];

      render(<ActionBar {...mockProps} tableData={tableData} databaseName="my-database" />);
      expect(screen.getByRole('button', { name: /загрузить файл/i })).toBeInTheDocument();
    });

    it('should render with databaseName prop', () => {
      render(<ActionBar {...mockProps} databaseName="test-db" />);
      expect(screen.getByRole('button', { name: /загрузить файл/i })).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(<ActionBar {...mockProps} className="custom-class" />);

      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass('custom-class');
    });

    it('should have default layout classes', () => {
      const { container } = render(<ActionBar {...mockProps} />);

      const rootDiv = container.firstChild;
      expect(rootDiv).toHaveClass('flex');
      expect(rootDiv).toHaveClass('items-center');
      expect(rootDiv).toHaveClass('justify-between');
    });
  });

  describe('Icons', () => {
    it('should render all primary action icons', () => {
      const { container } = render(<ActionBar {...mockProps} />);

      expect(container.querySelector('.lucide-upload')).toBeInTheDocument();
      expect(container.querySelector('.lucide-plus')).toBeInTheDocument();
    });

    it('should render sparkles icon in AI dropdown trigger', () => {
      const { container } = render(<ActionBar {...mockProps} />);

      const sparklesIcon = container.querySelector('.lucide-sparkles');
      expect(sparklesIcon).toBeInTheDocument();
    });

    it('should render ellipsis icon for more actions', () => {
      const { container } = render(<ActionBar {...mockProps} />);

      const ellipsisIcon = container.querySelector('.lucide-ellipsis');
      expect(ellipsisIcon).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<ActionBar {...mockProps} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have proper button variants', () => {
      render(<ActionBar {...mockProps} />);

      const uploadButton = screen.getByRole('button', { name: /загрузить файл/i });
      const addButton = screen.getByRole('button', { name: /добавить запись/i });

      expect(uploadButton).toBeInTheDocument();
      expect(addButton).toBeInTheDocument();
    });

    it('should have accessible dropdown triggers', () => {
      render(<ActionBar {...mockProps} />);

      const aiButton = screen.getByRole('button', { name: /ai & insights/i });
      expect(aiButton).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty tableData', () => {
      render(<ActionBar {...mockProps} tableData={[]} />);

      expect(screen.getByRole('button', { name: /загрузить файл/i })).toBeInTheDocument();
    });

    it('should handle negative comments count', () => {
      render(<ActionBar {...mockProps} commentsCount={-5} />);

      expect(screen.getByRole('button', { name: /загрузить файл/i })).toBeInTheDocument();
    });

    it('should handle rapid button clicks', () => {
      render(<ActionBar {...mockProps} />);

      const uploadButton = screen.getByRole('button', { name: /загрузить файл/i });

      for (let i = 0; i < 5; i++) {
        fireEvent.click(uploadButton);
      }

      expect(mockProps.onUploadFile).toHaveBeenCalledTimes(5);
    });

    it('should handle undefined databaseName', () => {
      render(<ActionBar {...mockProps} databaseName={undefined} />);

      expect(screen.getByRole('button', { name: /загрузить файл/i })).toBeInTheDocument();
    });
  });
});
