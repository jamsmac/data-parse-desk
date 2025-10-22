import { describe, it, expect } from 'vitest';
import { generateHTMLReport, DEFAULT_TEMPLATE } from '../reportGenerator';

describe('reportGenerator - HTML Report Generation', () => {
  const mockData = {
    title: 'Test Report',
    description: 'Test Description',
    tableName: 'test_table',
    data: [
      { id: 1, name: 'Item 1', value: 100 },
      { id: 2, name: 'Item 2', value: 200 },
    ],
    columns: [
      { key: 'id', label: 'ID', type: 'number' },
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'value', label: 'Value', type: 'number' },
    ],
    filters: [
      { column: 'value', operator: '>', value: 50 },
    ],
    summary: [
      { label: 'Total Items', value: 2, type: 'count' as const },
      { label: 'Total Value', value: 300, type: 'sum' as const },
    ],
  };

  describe('generateHTMLReport', () => {
    it('should generate valid HTML', () => {
      const html = generateHTMLReport(mockData);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html');
      expect(html).toContain('</html>');
    });

    it('should include report title', () => {
      const html = generateHTMLReport(mockData);
      expect(html).toContain('Test Report');
    });

    it('should include report description', () => {
      const html = generateHTMLReport(mockData);
      expect(html).toContain('Test Description');
    });

    it('should include table data', () => {
      const html = generateHTMLReport(mockData);
      expect(html).toContain('Item 1');
      expect(html).toContain('Item 2');
      expect(html).toContain('100');
      expect(html).toContain('200');
    });

    it('should include column headers', () => {
      const html = generateHTMLReport(mockData);
      expect(html).toContain('ID');
      expect(html).toContain('Name');
      expect(html).toContain('Value');
    });

    it('should include filters when provided', () => {
      const html = generateHTMLReport(mockData);
      expect(html).toContain('Applied Filters');
      expect(html).toContain('value');
      expect(html).toContain('>');
      expect(html).toContain('50');
    });

    it('should include summary when provided and showSummary is true', () => {
      const html = generateHTMLReport(mockData, DEFAULT_TEMPLATE);
      expect(html).toContain('Summary');
      expect(html).toContain('Total Items');
      expect(html).toContain('Total Value');
    });

    it('should exclude summary when showSummary is false', () => {
      const template = { ...DEFAULT_TEMPLATE, showSummary: false };
      const html = generateHTMLReport(mockData, template);
      expect(html).not.toContain('Total Items');
    });

    it('should include header when showHeader is true', () => {
      const html = generateHTMLReport(mockData, DEFAULT_TEMPLATE);
      expect(html).toContain('report-header');
    });

    it('should exclude header when showHeader is false', () => {
      const template = { ...DEFAULT_TEMPLATE, showHeader: false };
      const html = generateHTMLReport(mockData, template);
      expect(html).not.toContain('report-header');
    });

    it('should include footer when showFooter is true', () => {
      const html = generateHTMLReport(mockData, DEFAULT_TEMPLATE);
      expect(html).toContain('report-footer');
    });

    it('should exclude footer when showFooter is false', () => {
      const template = { ...DEFAULT_TEMPLATE, showFooter: false };
      const html = generateHTMLReport(mockData, template);
      expect(html).not.toContain('report-footer');
    });

    it('should apply portrait layout', () => {
      const template = { ...DEFAULT_TEMPLATE, layout: 'portrait' as const };
      const html = generateHTMLReport(mockData, template);
      expect(html).toContain('800px'); // portrait max-width
    });

    it('should apply landscape layout', () => {
      const template = { ...DEFAULT_TEMPLATE, layout: 'landscape' as const };
      const html = generateHTMLReport(mockData, template);
      expect(html).toContain('1200px'); // landscape max-width
    });

    it('should apply color scheme', () => {
      const template = { ...DEFAULT_TEMPLATE, colorScheme: 'blue' as const };
      const html = generateHTMLReport(mockData, template);
      expect(html).toContain('#0ea5e9'); // blue primary color
    });

    it('should apply font size', () => {
      const template = { ...DEFAULT_TEMPLATE, fontSize: 'large' as const };
      const html = generateHTMLReport(mockData, template);
      expect(html).toContain('16px'); // large base font
    });

    it('should escape HTML in data', () => {
      const dataWithHtml = {
        ...mockData,
        data: [{ id: 1, name: '<script>alert("xss")</script>', value: 100 }],
      };
      const html = generateHTMLReport(dataWithHtml);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('should handle custom column formatters', () => {
      const dataWithFormatter = {
        ...mockData,
        columns: [
          {
            key: 'value',
            label: 'Value',
            type: 'number',
            format: (val: number) => `$${val.toFixed(2)}`,
          },
        ],
      };
      const html = generateHTMLReport(dataWithFormatter);
      expect(html).toContain('$100.00');
      expect(html).toContain('$200.00');
    });

    it('should handle empty data', () => {
      const emptyData = { ...mockData, data: [] };
      const html = generateHTMLReport(emptyData);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('0 records');
    });

    it('should include print styles', () => {
      const html = generateHTMLReport(mockData);
      expect(html).toContain('@media print');
    });

    it('should include metadata', () => {
      const html = generateHTMLReport(mockData);
      expect(html).toContain('test_table');
      expect(html).toContain('2 records');
    });
  });
});
