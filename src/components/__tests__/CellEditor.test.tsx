import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CellEditor from '@/components/database/CellEditor';
import type { TableSchema } from '@/types/database';

// Mock date-fns
vi.mock('date-fns', () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    return date.toLocaleDateString('ru-RU');
  }),
}));

vi.mock('date-fns/locale', () => ({
  ru: {},
}));

// Mock supabase for file uploads
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } } })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: 'test-path/file.jpg' }, error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.jpg' } })),
      })),
    },
  },
}));

describe('CellEditor', () => {
  let mockOnSave: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSave = vi.fn();
    mockOnCancel = vi.fn();
    vi.clearAllMocks();
  });

  describe('Text Editor', () => {
    it('should render text input with initial value', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Name',
        column_type: 'text',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="Test Value" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue('Test Value');
      expect(input).toBeInTheDocument();
    });

    it('should call onSave when Enter is pressed', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Name',
        column_type: 'text',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="Test" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue('Test');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnSave).toHaveBeenCalledWith('Test');
    });

    it('should call onCancel when Escape is pressed', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Name',
        column_type: 'text',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="Test" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue('Test');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should update value on change', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Name',
        column_type: 'text',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText(/Введите name/i);
      fireEvent.change(input, { target: { value: 'New Value' } });

      expect(input).toHaveValue('New Value');
    });
  });

  describe('Number Editor', () => {
    it('should render number input', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Age',
        column_type: 'number',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value={42} onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByDisplayValue('42');
      expect(input).toHaveAttribute('type', 'number');
    });

    it('should accept valid number input', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Age',
        column_type: 'number',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText('0');
      fireEvent.change(input, { target: { value: '42' } });

      // Save button should be enabled for valid number
      const saveButton = screen.getByRole('button', { name: /Сохранить/i });
      expect(saveButton).not.toBeDisabled();
    });

    it('should convert value to number on save', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Age',
        column_type: 'number',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="42" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const saveButton = screen.getByRole('button', { name: /Сохранить/i });
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith(42);
    });
  });

  describe('Email Editor', () => {
    it('should validate email format', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Email',
        column_type: 'email',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText('email@example.com');
      fireEvent.change(input, { target: { value: 'invalid-email' } });

      expect(screen.getByText('Некорректный email')).toBeInTheDocument();
    });

    it('should accept valid email', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Email',
        column_type: 'email',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText('email@example.com');
      fireEvent.change(input, { target: { value: 'test@example.com' } });

      const saveButton = screen.getByRole('button', { name: /Сохранить/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('URL Editor', () => {
    it('should validate URL format', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Website',
        column_type: 'url',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText('https://example.com');
      fireEvent.change(input, { target: { value: 'not-a-url' } });

      expect(screen.getByText(/URL должен начинаться с http/i)).toBeInTheDocument();
    });

    it('should accept valid URL', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Website',
        column_type: 'url',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText('https://example.com');
      fireEvent.change(input, { target: { value: 'https://example.com' } });

      const saveButton = screen.getByRole('button', { name: /Сохранить/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Phone Editor', () => {
    it('should validate phone format', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Phone',
        column_type: 'phone',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText(/\+7/i);
      fireEvent.change(input, { target: { value: '123' } });

      expect(screen.getByText('Некорректный номер телефона')).toBeInTheDocument();
    });

    it('should accept valid phone number', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Phone',
        column_type: 'phone',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText(/\+7/i);
      fireEvent.change(input, { target: { value: '+7 (999) 123-45-67' } });

      const saveButton = screen.getByRole('button', { name: /Сохранить/i });
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Boolean Editor', () => {
    it('should render switch for boolean', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Active',
        column_type: 'boolean',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value={true} onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByText('Да')).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('should toggle boolean value', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Active',
        column_type: 'boolean',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value={false} onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByText('Нет')).toBeInTheDocument();

      const switchElement = screen.getByRole('switch');
      fireEvent.click(switchElement);

      expect(screen.getByText('Да')).toBeInTheDocument();
    });
  });

  describe('Select Editor', () => {
    it('should render select with options', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Status',
        column_type: 'select',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      const options = ['Active', 'Pending', 'Completed'];
      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} selectOptions={options} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should display selected value', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Status',
        column_type: 'select',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      const options = ['Active', 'Pending', 'Completed'];
      render(<CellEditor column={column} value="Active" onSave={mockOnSave} onCancel={mockOnCancel} selectOptions={options} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Multi-Select Editor', () => {
    it('should render checkboxes for multi-select', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Tags',
        column_type: 'multi_select',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      const options = ['Tag1', 'Tag2', 'Tag3'];
      render(<CellEditor column={column} value={[]} onSave={mockOnSave} onCancel={mockOnCancel} selectOptions={options} />);

      options.forEach(option => {
        expect(screen.getByLabelText(option)).toBeInTheDocument();
      });
    });

    it('should check selected options', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Tags',
        column_type: 'multi_select',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      const options = ['Tag1', 'Tag2', 'Tag3'];
      render(<CellEditor column={column} value={['Tag1', 'Tag3']} onSave={mockOnSave} onCancel={mockOnCancel} selectOptions={options} />);

      expect(screen.getByLabelText('Tag1')).toBeChecked();
      expect(screen.getByLabelText('Tag2')).not.toBeChecked();
      expect(screen.getByLabelText('Tag3')).toBeChecked();
    });

    it('should toggle checkbox selection', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Tags',
        column_type: 'multi_select',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      const options = ['Tag1', 'Tag2', 'Tag3'];
      render(<CellEditor column={column} value={['Tag1']} onSave={mockOnSave} onCancel={mockOnCancel} selectOptions={options} />);

      const tag2Checkbox = screen.getByLabelText('Tag2');
      fireEvent.click(tag2Checkbox);

      expect(tag2Checkbox).toBeChecked();
    });
  });

  describe('Read-only Fields', () => {
    it('should render formula field as read-only', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Total',
        column_type: 'formula',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="100" onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByText('Вычисляемое поле (только для чтения)')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Сохранить/i })).not.toBeInTheDocument();
    });

    it('should render rollup field as read-only', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Sum',
        column_type: 'rollup',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="250" onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByText('Вычисляемое поле (только для чтения)')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Сохранить/i })).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render save and cancel buttons', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Name',
        column_type: 'text',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="Test" onSave={mockOnSave} onCancel={mockOnCancel} />);

      expect(screen.getByRole('button', { name: /Сохранить/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Отмена/i })).toBeInTheDocument();
    });

    it('should disable save button when validation fails', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Email',
        column_type: 'email',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const input = screen.getByPlaceholderText('email@example.com');
      fireEvent.change(input, { target: { value: 'invalid' } });

      const saveButton = screen.getByRole('button', { name: /Сохранить/i });
      expect(saveButton).toBeDisabled();
    });

    it('should call onSave when save button is clicked', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Name',
        column_type: 'text',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="Test" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const saveButton = screen.getByRole('button', { name: /Сохранить/i });
      fireEvent.click(saveButton);

      expect(mockOnSave).toHaveBeenCalledWith('Test');
    });

    it('should call onCancel when cancel button is clicked', () => {
      const column: TableSchema = {
        id: '1',
        table_name: 'test',
        column_name: 'Name',
        column_type: 'text',
        is_nullable: true,
        is_primary: false,
        is_unique: false,
        default_value: null,
        foreign_key_table: null,
        foreign_key_column: null,
        created_at: new Date().toISOString(),
      };

      render(<CellEditor column={column} value="Test" onSave={mockOnSave} onCancel={mockOnCancel} />);

      const cancelButton = screen.getByRole('button', { name: /Отмена/i });
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });
});
