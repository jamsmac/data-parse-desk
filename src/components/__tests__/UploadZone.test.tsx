import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadZone } from '@/components/UploadZone';

describe('UploadZone', () => {
  let mockOnFileSelect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnFileSelect = vi.fn();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render upload zone with title', () => {
      render(<UploadZone onFileSelect={mockOnFileSelect} />);

      expect(screen.getByText('Upload Your Data')).toBeInTheDocument();
    });

    it('should render instructions', () => {
      render(<UploadZone onFileSelect={mockOnFileSelect} />);

      expect(screen.getByText('Drag & drop or click to select Excel/CSV file')).toBeInTheDocument();
      expect(screen.getByText('Supports .xlsx, .xls, .csv files up to 50MB')).toBeInTheDocument();
    });

    it('should render select file button', () => {
      render(<UploadZone onFileSelect={mockOnFileSelect} />);

      expect(screen.getByRole('button', { name: /select file/i })).toBeInTheDocument();
    });

    it('should render feature list', () => {
      render(<UploadZone onFileSelect={mockOnFileSelect} />);

      expect(screen.getByText(/Smart date parsing/i)).toBeInTheDocument();
      expect(screen.getByText(/Amount normalization/i)).toBeInTheDocument();
      expect(screen.getByText(/Timezone: Asia\/Tashkent/i)).toBeInTheDocument();
    });

    it('should render file spreadsheet icon', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const icon = container.querySelector('.lucide-file-spreadsheet');
      expect(icon).toBeInTheDocument();
    });

    it('should render upload icon in button', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const uploadIcon = container.querySelector('.lucide-upload');
      expect(uploadIcon).toBeInTheDocument();
    });
  });

  describe('File Input', () => {
    it('should have hidden file input with correct attributes', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const fileInput = container.querySelector('#file-input') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
      expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls,.csv');
      expect(fileInput).toHaveClass('hidden');
    });

    it('should call onFileSelect when file is selected via input', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const fileInput = container.querySelector('#file-input') as HTMLInputElement;
      const file = new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });

    it('should not call onFileSelect when no file is selected', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const fileInput = container.querySelector('#file-input') as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should trigger file input click when button is clicked', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const fileInput = container.querySelector('#file-input') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      const button = screen.getByRole('button', { name: /select file/i });
      fireEvent.click(button);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Drag and Drop', () => {
    it('should call onFileSelect when file is dropped', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const dropZone = container.querySelector('div[class*="border-dashed"]');
      const file = new File(['test content'], 'test.csv', { type: 'text/csv' });

      const dataTransfer = {
        files: [file],
      };

      fireEvent.drop(dropZone!, { dataTransfer });

      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });

    it('should prevent default on drop event', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const dropZone = container.querySelector('div[class*="border-dashed"]');
      const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [file] },
      });

      const preventDefaultSpy = vi.spyOn(dropEvent, 'preventDefault');

      fireEvent(dropZone!, dropEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default on drag over event', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const dropZone = container.querySelector('div[class*="border-dashed"]');

      const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true });
      const preventDefaultSpy = vi.spyOn(dragOverEvent, 'preventDefault');

      fireEvent(dropZone!, dragOverEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not call onFileSelect when dropping empty files', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const dropZone = container.querySelector('div[class*="border-dashed"]');

      const dataTransfer = {
        files: [],
      };

      fireEvent.drop(dropZone!, { dataTransfer });

      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should only process first file when multiple files are dropped', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const dropZone = container.querySelector('div[class*="border-dashed"]');
      const file1 = new File(['content1'], 'test1.csv', { type: 'text/csv' });
      const file2 = new File(['content2'], 'test2.csv', { type: 'text/csv' });

      const dataTransfer = {
        files: [file1, file2],
      };

      fireEvent.drop(dropZone!, { dataTransfer });

      expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
      expect(mockOnFileSelect).toHaveBeenCalledWith(file1);
    });
  });

  describe('Loading State', () => {
    it('should disable button when loading', () => {
      render(<UploadZone onFileSelect={mockOnFileSelect} isLoading={true} />);

      const button = screen.getByRole('button', { name: /processing/i });
      expect(button).toBeDisabled();
    });

    it('should show processing text when loading', () => {
      render(<UploadZone onFileSelect={mockOnFileSelect} isLoading={true} />);

      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('should enable button when not loading', () => {
      render(<UploadZone onFileSelect={mockOnFileSelect} isLoading={false} />);

      const button = screen.getByRole('button', { name: /select file/i });
      expect(button).not.toBeDisabled();
    });

    it('should show select file text when not loading', () => {
      render(<UploadZone onFileSelect={mockOnFileSelect} isLoading={false} />);

      expect(screen.getByText('Select File')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have hover styles on drop zone', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const dropZone = container.querySelector('div[class*="border-dashed"]');
      expect(dropZone).toHaveClass('hover:border-primary');
      expect(dropZone).toHaveClass('hover:bg-muted/50');
    });

    it('should have transition classes', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const dropZone = container.querySelector('div[class*="border-dashed"]');
      expect(dropZone).toHaveClass('transition-colors');
    });

    it('should have rounded and border styles', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const dropZone = container.querySelector('div[class*="border-dashed"]');
      expect(dropZone).toHaveClass('rounded-lg');
      expect(dropZone).toHaveClass('border-2');
      expect(dropZone).toHaveClass('border-dashed');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button role', () => {
      render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should have proper file input type', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const fileInput = container.querySelector('#file-input') as HTMLInputElement;
      expect(fileInput.type).toBe('file');
    });

    it('should have proper accept attribute for file types', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const fileInput = container.querySelector('#file-input') as HTMLInputElement;
      expect(fileInput.accept).toBe('.xlsx,.xls,.csv');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined files in file input', () => {
      const { container } = render(<UploadZone onFileSelect={mockOnFileSelect} />);

      const fileInput = container.querySelector('#file-input') as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: null,
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(mockOnFileSelect).not.toHaveBeenCalled();
    });

    it('should handle file selection after being in loading state', () => {
      const { rerender, container } = render(<UploadZone onFileSelect={mockOnFileSelect} isLoading={true} />);

      rerender(<UploadZone onFileSelect={mockOnFileSelect} isLoading={false} />);

      const fileInput = container.querySelector('#file-input') as HTMLInputElement;
      const file = new File(['content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });
  });
});
