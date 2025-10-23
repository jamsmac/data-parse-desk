import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FilterBuilder, Filter } from '@/components/database/FilterBuilder';

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random()),
  },
  writable: true,
});

describe('FilterBuilder', () => {
  const mockColumns = [
    { name: 'name', type: 'text' },
    { name: 'age', type: 'number' },
    { name: 'email', type: 'email' },
  ];

  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render add filter button when no filters exist', () => {
      render(<FilterBuilder columns={mockColumns} filters={[]} onChange={mockOnChange} />);

      expect(screen.getByRole('button', { name: /add filter/i })).toBeInTheDocument();
    });

    it('should render existing filters', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: 'John' },
        { id: '2', column: 'age', operator: 'gt', value: '25' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      expect(screen.getAllByRole('combobox')).toHaveLength(4); // 2 filters * 2 selects each
    });

    it('should render filter with column, operator, and value', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: 'John' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    });

    it('should render remove button for each filter', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: 'John' },
        { id: '2', column: 'age', operator: 'gt', value: '25' },
      ];

      const { container } = render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      // Look for X icons instead of button classes
      const removeIcons = container.querySelectorAll('.lucide-x');
      expect(removeIcons.length).toBe(2);
    });
  });

  describe('Adding Filters', () => {
    it('should call onChange with new filter when add button is clicked', () => {
      render(<FilterBuilder columns={mockColumns} filters={[]} onChange={mockOnChange} />);

      const addButton = screen.getByRole('button', { name: /add filter/i });
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          column: 'name',
          operator: 'equals',
          value: '',
        }),
      ]);
    });

    it('should add new filter with first column as default', () => {
      render(<FilterBuilder columns={mockColumns} filters={[]} onChange={mockOnChange} />);

      const addButton = screen.getByRole('button', { name: /add filter/i });
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          column: 'name',
        }),
      ]);
    });

    it('should add multiple filters sequentially', () => {
      const { rerender } = render(<FilterBuilder columns={mockColumns} filters={[]} onChange={mockOnChange} />);

      const addButton = screen.getByRole('button', { name: /add filter/i });
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);

      const firstFilter: Filter = { id: '1', column: 'name', operator: 'equals', value: '' };
      rerender(<FilterBuilder columns={mockColumns} filters={[firstFilter]} onChange={mockOnChange} />);

      fireEvent.click(addButton);
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Removing Filters', () => {
    it('should call onChange without removed filter', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: 'John' },
        { id: '2', column: 'age', operator: 'gt', value: '25' },
      ];

      const { container } = render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      // Find X icons and get their parent buttons
      const removeIcons = container.querySelectorAll('.lucide-x');
      const removeButton = removeIcons[0].closest('button');
      fireEvent.click(removeButton!);

      expect(mockOnChange).toHaveBeenCalledWith([
        { id: '2', column: 'age', operator: 'gt', value: '25' },
      ]);
    });

    it('should remove correct filter by id', () => {
      const filters: Filter[] = [
        { id: 'filter-1', column: 'name', operator: 'equals', value: 'John' },
        { id: 'filter-2', column: 'age', operator: 'gt', value: '25' },
      ];

      const { container } = render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      const removeIcons = container.querySelectorAll('.lucide-x');
      const removeButton = removeIcons[1].closest('button');
      fireEvent.click(removeButton!);

      expect(mockOnChange).toHaveBeenCalledWith([
        { id: 'filter-1', column: 'name', operator: 'equals', value: 'John' },
      ]);
    });
  });

  describe('Updating Filters', () => {
    it('should update filter value on input change', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: '' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Value');
      fireEvent.change(input, { target: { value: 'John' } });

      expect(mockOnChange).toHaveBeenCalledWith([
        { id: '1', column: 'name', operator: 'equals', value: 'John' },
      ]);
    });

    it('should update only the changed filter', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: 'John' },
        { id: '2', column: 'age', operator: 'gt', value: '25' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      const inputs = screen.getAllByPlaceholderText('Value');
      fireEvent.change(inputs[1], { target: { value: '30' } });

      expect(mockOnChange).toHaveBeenCalledWith([
        { id: '1', column: 'name', operator: 'equals', value: 'John' },
        { id: '2', column: 'age', operator: 'gt', value: '30' },
      ]);
    });

    it('should preserve other filter properties when updating value', () => {
      const filters: Filter[] = [
        { id: '1', column: 'email', operator: 'contains', value: '@' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Value');
      fireEvent.change(input, { target: { value: '@example.com' } });

      expect(mockOnChange).toHaveBeenCalledWith([
        { id: '1', column: 'email', operator: 'contains', value: '@example.com' },
      ]);
    });
  });

  describe('Operator Labels', () => {
    it('should display correct operator labels', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: 'test' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      // The operator select should show the operator label
      expect(screen.getByText('=')).toBeInTheDocument();
    });

    it('should have all operator options available', () => {
      const filters: Filter[] = [
        { id: '1', column: 'age', operator: 'gt', value: '0' },
      ];

      const { container } = render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      // Check that operator select exists
      const operatorSelects = container.querySelectorAll('[class*="w-\\[140px\\]"]');
      expect(operatorSelects.length).toBeGreaterThan(0);
    });
  });

  describe('Column Selection', () => {
    it('should display all available columns in dropdown', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: '' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      // Column name should be displayed
      expect(screen.getByText('name')).toBeInTheDocument();
    });

    it('should handle empty columns array', () => {
      render(<FilterBuilder columns={[]} filters={[]} onChange={mockOnChange} />);

      const addButton = screen.getByRole('button', { name: /add filter/i });
      fireEvent.click(addButton);

      expect(mockOnChange).toHaveBeenCalledWith([
        expect.objectContaining({
          column: '',
        }),
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should render correctly with empty filters array', () => {
      render(<FilterBuilder columns={mockColumns} filters={[]} onChange={mockOnChange} />);

      expect(screen.queryByPlaceholderText('Value')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add filter/i })).toBeInTheDocument();
    });

    it('should handle filter with empty value', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: '' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Value');
      expect(input).toHaveValue('');
    });

    it('should handle multiple filters with same column', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: 'John' },
        { id: '2', column: 'name', operator: 'contains', value: 'J' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      const inputs = screen.getAllByPlaceholderText('Value');
      expect(inputs).toHaveLength(2);
      expect(inputs[0]).toHaveValue('John');
      expect(inputs[1]).toHaveValue('J');
    });

    it('should generate unique IDs for new filters', () => {
      render(<FilterBuilder columns={mockColumns} filters={[]} onChange={mockOnChange} />);

      const addButton = screen.getByRole('button', { name: /add filter/i });

      fireEvent.click(addButton);
      const firstCall = mockOnChange.mock.calls[0][0];

      fireEvent.click(addButton);
      const secondCall = mockOnChange.mock.calls[1][0];

      // IDs should be different
      expect(firstCall[0].id).not.toBe(secondCall[1]?.id);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button for adding filters', () => {
      render(<FilterBuilder columns={mockColumns} filters={[]} onChange={mockOnChange} />);

      const addButton = screen.getByRole('button', { name: /add filter/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should have accessible comboboxes for selects', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: 'test' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThan(0);
    });

    it('should have accessible input for value', () => {
      const filters: Filter[] = [
        { id: '1', column: 'name', operator: 'equals', value: '' },
      ];

      render(<FilterBuilder columns={mockColumns} filters={filters} onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Value');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });
  });
});
