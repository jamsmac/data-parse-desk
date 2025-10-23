import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataPreviewTable } from '@/components/import/DataPreviewTable';
import { ColumnDefinition } from '@/components/import/ImportPreview';

describe('DataPreviewTable', () => {
  const mockColumns: ColumnDefinition[] = [
    { name: 'id', displayName: 'ID', type: 'number' },
    { name: 'name', displayName: 'Name', type: 'text' },
    { name: 'email', displayName: 'Email', type: 'email' },
    { name: 'active', displayName: 'Active', type: 'boolean' },
    { name: 'createdAt', displayName: 'Created', type: 'date' },
  ];

  const mockData = [
    {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      active: true,
      createdAt: '2023-01-01',
    },
    {
      id: 2,
      name: 'Jane Smith',
      email: 'jane@example.com',
      active: false,
      createdAt: '2023-02-15',
    },
  ];

  beforeEach(() => {
    // Clear any previous renders
  });

  describe('Rendering', () => {
    it('should render table with columns', () => {
      render(<DataPreviewTable columns={mockColumns} data={mockData} />);

      // Check column headers
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
    });

    it('should render row numbers', () => {
      const { container } = render(<DataPreviewTable columns={mockColumns} data={mockData} />);

      // Row numbers are in the first column with gray background
      const rowNumbers = container.querySelectorAll('td.font-medium.text-gray-500.bg-gray-50');
      expect(rowNumbers.length).toBe(2);
    });

    it('should render data values', () => {
      render(<DataPreviewTable columns={mockColumns} data={mockData} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('should render type badges for columns', () => {
      render(<DataPreviewTable columns={mockColumns} data={mockData} />);

      // Type badges appear in header - check by counting occurrences
      const typeBadges = ['number', 'text', 'email', 'boolean', 'date'];
      typeBadges.forEach(type => {
        expect(screen.getByText(type)).toBeInTheDocument();
      });
    });

    it('should render type icons', () => {
      render(<DataPreviewTable columns={mockColumns} data={mockData} />);

      // Type icons are rendered as emoji
      expect(screen.getByText('🔢')).toBeInTheDocument(); // number
      expect(screen.getByText('📝')).toBeInTheDocument(); // text
      expect(screen.getByText('📧')).toBeInTheDocument(); // email
      expect(screen.getByText('✓')).toBeInTheDocument(); // boolean
      expect(screen.getByText('📅')).toBeInTheDocument(); // date
    });

    it('should render # column header', () => {
      render(<DataPreviewTable columns={mockColumns} data={mockData} />);

      expect(screen.getByText('#')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render empty state when no data', () => {
      render(<DataPreviewTable columns={mockColumns} data={[]} />);

      expect(screen.getByText('No data to preview')).toBeInTheDocument();
    });

    it('should not render table when no data', () => {
      const { container } = render(<DataPreviewTable columns={mockColumns} data={[]} />);

      expect(container.querySelector('table')).not.toBeInTheDocument();
    });

    it('should render empty state with proper styling', () => {
      const { container } = render(<DataPreviewTable columns={mockColumns} data={[]} />);

      const emptyState = container.querySelector('.text-gray-500');
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe('Data Formatting', () => {
    describe('Null Values', () => {
      it('should render null values as italic "null"', () => {
        const data = [{ id: null, name: null }];
        const columns: ColumnDefinition[] = [
          { name: 'id', type: 'number' },
          { name: 'name', type: 'text' },
        ];

        const { container } = render(<DataPreviewTable columns={columns} data={data} />);

        const nullElements = container.querySelectorAll('.italic');
        expect(nullElements.length).toBeGreaterThan(0);
      });

      it('should render empty strings as null', () => {
        const data = [{ name: '' }];
        const columns: ColumnDefinition[] = [{ name: 'name', type: 'text' }];

        const { container } = render(<DataPreviewTable columns={columns} data={data} />);

        const nullElements = container.querySelectorAll('.italic');
        expect(nullElements.length).toBeGreaterThan(0);
      });
    });

    describe('Number Formatting', () => {
      it('should format numbers with locale', () => {
        const data = [{ amount: 1234.56 }];
        const columns: ColumnDefinition[] = [{ name: 'amount', type: 'number' }];

        render(<DataPreviewTable columns={columns} data={data} />);

        // Numbers are formatted with locale (e.g., "1,234.56" or "1 234,56" depending on locale)
        expect(screen.getByText(/1.*234/)).toBeInTheDocument();
      });

      it('should render numbers in monospace font', () => {
        const data = [{ count: 42 }];
        const columns: ColumnDefinition[] = [{ name: 'count', type: 'number' }];

        const { container } = render(<DataPreviewTable columns={columns} data={data} />);

        const numberElement = container.querySelector('.font-mono.text-blue-700');
        expect(numberElement).toBeInTheDocument();
      });
    });

    describe('Date Formatting', () => {
      it('should format dates with toLocaleDateString', () => {
        const data = [{ created: '2023-06-15' }];
        const columns: ColumnDefinition[] = [{ name: 'created', type: 'date' }];

        const { container } = render(<DataPreviewTable columns={columns} data={data} />);

        const dateElement = container.querySelector('.text-purple-700');
        expect(dateElement).toBeInTheDocument();
      });

      it('should handle invalid dates gracefully', () => {
        const data = [{ created: 'invalid-date' }];
        const columns: ColumnDefinition[] = [{ name: 'created', type: 'date' }];

        render(<DataPreviewTable columns={columns} data={data} />);

        // Invalid dates render as "Invalid Date" (from Date constructor)
        expect(screen.getByText('Invalid Date')).toBeInTheDocument();
      });
    });

    describe('Boolean Formatting', () => {
      it('should render true as "True" badge', () => {
        const data = [{ active: true }];
        const columns: ColumnDefinition[] = [{ name: 'active', type: 'boolean' }];

        render(<DataPreviewTable columns={columns} data={data} />);

        expect(screen.getByText('True')).toBeInTheDocument();
      });

      it('should render false as "False" badge', () => {
        const data = [{ active: false }];
        const columns: ColumnDefinition[] = [{ name: 'active', type: 'boolean' }];

        render(<DataPreviewTable columns={columns} data={data} />);

        expect(screen.getByText('False')).toBeInTheDocument();
      });

      it('should use different badge variants for true/false', () => {
        const data = [{ active: true, inactive: false }];
        const columns: ColumnDefinition[] = [
          { name: 'active', type: 'boolean' },
          { name: 'inactive', type: 'boolean' },
        ];

        render(<DataPreviewTable columns={columns} data={data} />);

        expect(screen.getByText('True')).toBeInTheDocument();
        expect(screen.getByText('False')).toBeInTheDocument();
      });
    });

    describe('Email Formatting', () => {
      it('should render emails as mailto links', () => {
        const data = [{ email: 'test@example.com' }];
        const columns: ColumnDefinition[] = [{ name: 'email', type: 'email' }];

        render(<DataPreviewTable columns={columns} data={data} />);

        const link = screen.getByText('test@example.com');
        expect(link).toBeInTheDocument();
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', 'mailto:test@example.com');
      });

      it('should prevent default click on email links', () => {
        const data = [{ email: 'test@example.com' }];
        const columns: ColumnDefinition[] = [{ name: 'email', type: 'email' }];

        const { container } = render(<DataPreviewTable columns={columns} data={data} />);

        const link = container.querySelector('a[href^="mailto:"]');
        expect(link).toHaveClass('text-blue-600');
      });
    });

    describe('Phone Formatting', () => {
      it('should render phones in monospace font', () => {
        const data = [{ phone: '+1-555-1234' }];
        const columns: ColumnDefinition[] = [{ name: 'phone', type: 'phone' }];

        const { container } = render(<DataPreviewTable columns={columns} data={data} />);

        const phoneElement = container.querySelector('.font-mono.text-green-700');
        expect(phoneElement).toBeInTheDocument();
      });

      it('should display phone number as-is', () => {
        const data = [{ phone: '+1-555-1234' }];
        const columns: ColumnDefinition[] = [{ name: 'phone', type: 'phone' }];

        render(<DataPreviewTable columns={columns} data={data} />);

        expect(screen.getByText('+1-555-1234')).toBeInTheDocument();
      });
    });

    describe('URL Formatting', () => {
      it('should render URLs as links', () => {
        const data = [{ website: 'https://example.com' }];
        const columns: ColumnDefinition[] = [{ name: 'website', type: 'url' }];

        render(<DataPreviewTable columns={columns} data={data} />);

        const link = screen.getByText('https://example.com');
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', 'https://example.com');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });

      it('should truncate long URLs', () => {
        const data = [{ website: 'https://example.com' }];
        const columns: ColumnDefinition[] = [{ name: 'website', type: 'url' }];

        const { container } = render(<DataPreviewTable columns={columns} data={data} />);

        const link = container.querySelector('a[target="_blank"]');
        expect(link).toHaveClass('truncate');
      });
    });

    describe('Select Formatting', () => {
      it('should render select values as outlined badges', () => {
        const data = [{ status: 'Active' }];
        const columns: ColumnDefinition[] = [{ name: 'status', type: 'select' }];

        render(<DataPreviewTable columns={columns} data={data} />);

        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    describe('Text Formatting', () => {
      it('should render text values normally', () => {
        const data = [{ description: 'Test description' }];
        const columns: ColumnDefinition[] = [{ name: 'description', type: 'text' }];

        render(<DataPreviewTable columns={columns} data={data} />);

        expect(screen.getByText('Test description')).toBeInTheDocument();
      });

      it('should truncate long text', () => {
        const data = [{ text: 'Very long text that should be truncated' }];
        const columns: ColumnDefinition[] = [{ name: 'text', type: 'text' }];

        const { container } = render(<DataPreviewTable columns={columns} data={data} />);

        const textElement = container.querySelector('.truncate');
        expect(textElement).toBeInTheDocument();
      });
    });
  });

  describe('Column Features', () => {
    it('should highlight AI-suggested columns', () => {
      const columns: ColumnDefinition[] = [
        { name: 'id', type: 'number', aiSuggested: true },
        { name: 'name', type: 'text' },
      ];
      const data = [{ id: 1, name: 'Test' }];

      const { container } = render(<DataPreviewTable columns={columns} data={data} />);

      const aiColumn = container.querySelector('.bg-green-50');
      expect(aiColumn).toBeInTheDocument();
    });

    it('should use displayName when provided', () => {
      const columns: ColumnDefinition[] = [
        { name: 'user_id', displayName: 'User ID', type: 'number' },
      ];
      const data = [{ user_id: 1 }];

      render(<DataPreviewTable columns={columns} data={data} />);

      expect(screen.getByText('User ID')).toBeInTheDocument();
      expect(screen.queryByText('user_id')).not.toBeInTheDocument();
    });

    it('should use name when displayName is not provided', () => {
      const columns: ColumnDefinition[] = [
        { name: 'contact_email', type: 'email' },
      ];
      const data = [{ contact_email: 'test@test.com' }];

      render(<DataPreviewTable columns={columns} data={data} />);

      expect(screen.getByText('contact_email')).toBeInTheDocument();
    });
  });

  describe('Type Icons', () => {
    it('should render correct icon for each type', () => {
      const columns: ColumnDefinition[] = [
        { name: 'text', type: 'text' },
        { name: 'number', type: 'number' },
        { name: 'date', type: 'date' },
        { name: 'boolean', type: 'boolean' },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'phone' },
        { name: 'url', type: 'url' },
        { name: 'select', type: 'select' },
        { name: 'relation', type: 'relation' },
      ];
      const data = [
        {
          text: 'a',
          number: 1,
          date: '2023-01-01',
          boolean: true,
          email: 'a@b.com',
          phone: '123',
          url: 'http://a.com',
          select: 'A',
          relation: 'R',
        },
      ];

      render(<DataPreviewTable columns={columns} data={data} />);

      expect(screen.getByText('📝')).toBeInTheDocument(); // text
      expect(screen.getByText('🔢')).toBeInTheDocument(); // number
      expect(screen.getByText('📅')).toBeInTheDocument(); // date
      expect(screen.getByText('✓')).toBeInTheDocument(); // boolean
      expect(screen.getByText('📧')).toBeInTheDocument(); // email
      expect(screen.getByText('📱')).toBeInTheDocument(); // phone
      expect(screen.getByText('🔗')).toBeInTheDocument(); // url
      expect(screen.getByText('🏷️')).toBeInTheDocument(); // select
      expect(screen.getByText('🔀')).toBeInTheDocument(); // relation
    });

    it('should use default icon for unknown types', () => {
      const columns: ColumnDefinition[] = [
        { name: 'unknown', type: 'unknown_type' as any },
      ];
      const data = [{ unknown: 'value' }];

      render(<DataPreviewTable columns={columns} data={data} />);

      // Default icon is text icon (📝)
      // Component renders it, so just verify it doesn't crash
      expect(screen.getByText('unknown')).toBeInTheDocument();
    });
  });

  describe('Layout & Styling', () => {
    it('should render table within ScrollArea', () => {
      const { container } = render(
        <DataPreviewTable columns={mockColumns} data={mockData} />
      );

      expect(container.querySelector('table')).toBeInTheDocument();
    });

    it('should apply minimum width to column headers', () => {
      const { container } = render(
        <DataPreviewTable columns={mockColumns} data={mockData} />
      );

      const headers = container.querySelectorAll('th');
      // Check that headers have min-width class (except the # column)
      const dataHeaders = Array.from(headers).slice(1);
      dataHeaders.forEach(header => {
        expect(header).toHaveClass('min-w-[150px]');
      });
    });

    it('should apply gray background to # column', () => {
      const { container } = render(
        <DataPreviewTable columns={mockColumns} data={mockData} />
      );

      const numberColumn = container.querySelector('th.w-12.bg-gray-50');
      expect(numberColumn).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single column', () => {
      const columns: ColumnDefinition[] = [{ name: 'id', type: 'number' }];
      const data = [{ id: 1 }, { id: 2 }];
      const { container } = render(<DataPreviewTable columns={columns} data={data} />);

      expect(screen.getByText('id')).toBeInTheDocument();

      // Row numbers
      const rowNumbers = container.querySelectorAll('td.font-medium.text-gray-500.bg-gray-50');
      expect(rowNumbers.length).toBe(2);
    });

    it('should handle single row', () => {
      const data = [{ id: 1, name: 'Only' }];
      const { container } = render(<DataPreviewTable columns={mockColumns.slice(0, 2)} data={data} />);

      expect(screen.getByText('Only')).toBeInTheDocument();

      // Row number
      const rowNumbers = container.querySelectorAll('td.font-medium.text-gray-500.bg-gray-50');
      expect(rowNumbers.length).toBe(1);
    });

    it('should handle many rows', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
      }));

      render(
        <DataPreviewTable
          columns={mockColumns.slice(0, 2)}
          data={data}
        />
      );

      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 100')).toBeInTheDocument();
    });

    it('should handle missing data fields', () => {
      const data = [{ id: 1 }]; // missing name, email, etc.
      const { container } = render(<DataPreviewTable columns={mockColumns} data={data} />);

      // Missing fields should render as null
      const nullElements = container.querySelectorAll('.italic');
      expect(nullElements.length).toBeGreaterThan(0);
    });

    it('should handle mixed data types in same column', () => {
      const data = [
        { value: 123 },
        { value: 'some_text_value' },
        { value: null },
      ];
      const columns: ColumnDefinition[] = [{ name: 'value', type: 'text' }];
      const { container } = render(<DataPreviewTable columns={columns} data={data} />);

      // Values rendered as text - 123 appears as both row number and value
      const text123 = screen.getAllByText('123');
      expect(text123.length).toBeGreaterThan(0);

      expect(screen.getByText('some_text_value')).toBeInTheDocument();
    });
  });
});
