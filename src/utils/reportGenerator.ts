/**
 * HTML/PDF Report Generator
 * Generates professional reports from table data
 */

import { format } from 'date-fns';

export interface ReportData {
  title: string;
  description?: string;
  tableName: string;
  data: any[];
  columns: ReportColumn[];
  filters?: ReportFilter[];
  summary?: ReportSummary[];
  charts?: ReportChart[];
}

export interface ReportColumn {
  key: string;
  label: string;
  type: string;
  format?: (value: any) => string;
}

export interface ReportFilter {
  column: string;
  operator: string;
  value: any;
}

export interface ReportSummary {
  label: string;
  value: string | number;
  type: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

export interface ReportChart {
  type: 'bar' | 'line' | 'pie';
  title: string;
  data: any[];
}

export interface ReportTemplate {
  name: string;
  layout: 'portrait' | 'landscape';
  showHeader: boolean;
  showFooter: boolean;
  showSummary: boolean;
  showCharts: boolean;
  colorScheme: 'default' | 'blue' | 'green' | 'purple';
  fontSize: 'small' | 'medium' | 'large';
}

export const DEFAULT_TEMPLATE: ReportTemplate = {
  name: 'Default',
  layout: 'portrait',
  showHeader: true,
  showFooter: true,
  showSummary: true,
  showCharts: true,
  colorScheme: 'default',
  fontSize: 'medium',
};

/**
 * Generate HTML report from data
 */
export function generateHTMLReport(
  data: ReportData,
  template: ReportTemplate = DEFAULT_TEMPLATE
): string {
  const {
    title,
    description,
    tableName,
    data: tableData,
    columns,
    filters,
    summary,
    charts,
  } = data;

  const colors = getColorScheme(template.colorScheme);
  const fontSize = getFontSize(template.fontSize);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: ${fontSize.base};
      line-height: 1.6;
      color: #333;
      padding: 40px 20px;
      max-width: ${template.layout === 'portrait' ? '800px' : '1200px'};
      margin: 0 auto;
      background: #f9fafb;
    }

    .report-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    ${template.showHeader ? `
    .report-header {
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    .report-header h1 {
      font-size: ${fontSize.h1};
      margin-bottom: 10px;
      font-weight: 700;
    }

    .report-header p {
      font-size: ${fontSize.small};
      opacity: 0.9;
    }

    .report-meta {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin-top: 20px;
      font-size: ${fontSize.small};
    }

    .report-meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    ` : ''}

    .report-body {
      padding: 40px;
    }

    .section {
      margin-bottom: 40px;
    }

    .section-title {
      font-size: ${fontSize.h2};
      font-weight: 600;
      margin-bottom: 20px;
      color: ${colors.primary};
      border-bottom: 2px solid ${colors.primary};
      padding-bottom: 10px;
    }

    ${filters && filters.length > 0 ? `
    .filters {
      background: ${colors.lightBg};
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 30px;
    }

    .filter-item {
      display: inline-block;
      background: white;
      padding: 8px 16px;
      border-radius: 20px;
      margin: 5px;
      font-size: ${fontSize.small};
      border: 1px solid ${colors.border};
    }
    ` : ''}

    ${template.showSummary && summary && summary.length > 0 ? `
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .summary-card {
      background: ${colors.lightBg};
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid ${colors.primary};
    }

    .summary-label {
      font-size: ${fontSize.small};
      color: #6b7280;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-value {
      font-size: ${fontSize.h2};
      font-weight: 700;
      color: ${colors.primary};
    }
    ` : ''}

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: ${fontSize.small};
    }

    .data-table thead {
      background: ${colors.primary};
      color: white;
    }

    .data-table th {
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: ${fontSize.tiny};
    }

    .data-table tbody tr {
      border-bottom: 1px solid ${colors.border};
      transition: background 0.15s;
    }

    .data-table tbody tr:hover {
      background: ${colors.lightBg};
    }

    .data-table tbody tr:last-child {
      border-bottom: none;
    }

    .data-table td {
      padding: 12px 16px;
    }

    .data-table tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    ${template.showCharts && charts && charts.length > 0 ? `
    .chart-container {
      margin: 30px 0;
      padding: 20px;
      background: ${colors.lightBg};
      border-radius: 8px;
    }

    .chart-title {
      font-size: ${fontSize.base};
      font-weight: 600;
      margin-bottom: 15px;
      color: ${colors.primary};
    }
    ` : ''}

    ${template.showFooter ? `
    .report-footer {
      background: #f9fafb;
      padding: 30px 40px;
      text-align: center;
      border-top: 1px solid ${colors.border};
      font-size: ${fontSize.small};
      color: #6b7280;
    }
    ` : ''}

    @media print {
      body {
        padding: 0;
        background: white;
      }

      .report-container {
        box-shadow: none;
      }

      @page {
        size: ${template.layout};
        margin: 20mm;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    ${template.showHeader ? `
    <div class="report-header">
      <h1>${escapeHtml(title)}</h1>
      ${description ? `<p>${escapeHtml(description)}</p>` : ''}
      <div class="report-meta">
        <div class="report-meta-item">
          <span>📊</span>
          <span>${escapeHtml(tableName)}</span>
        </div>
        <div class="report-meta-item">
          <span>📅</span>
          <span>${format(new Date(), 'MMM dd, yyyy HH:mm')}</span>
        </div>
        <div class="report-meta-item">
          <span>📈</span>
          <span>${tableData.length} records</span>
        </div>
      </div>
    </div>
    ` : ''}

    <div class="report-body">
      ${filters && filters.length > 0 ? `
      <div class="filters">
        <strong>Applied Filters:</strong><br>
        ${filters.map(f => `
          <span class="filter-item">
            ${escapeHtml(f.column)} ${escapeHtml(f.operator)} ${escapeHtml(String(f.value))}
          </span>
        `).join('')}
      </div>
      ` : ''}

      ${template.showSummary && summary && summary.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Summary</h2>
        <div class="summary-grid">
          ${summary.map(s => `
            <div class="summary-card">
              <div class="summary-label">${escapeHtml(s.label)}</div>
              <div class="summary-value">${escapeHtml(String(s.value))}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="section">
        <h2 class="section-title">Data</h2>
        <table class="data-table">
          <thead>
            <tr>
              ${columns.map(col => `
                <th>${escapeHtml(col.label)}</th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${tableData.map(row => `
              <tr>
                ${columns.map(col => {
                  const value = row[col.key];
                  const formatted = col.format ? col.format(value) : String(value ?? '');
                  return `<td>${escapeHtml(formatted)}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      ${template.showCharts && charts && charts.length > 0 ? `
      <div class="section">
        <h2 class="section-title">Charts</h2>
        ${charts.map(chart => `
          <div class="chart-container">
            <div class="chart-title">${escapeHtml(chart.title)}</div>
            <p style="color: #6b7280; font-style: italic;">Chart visualization available in interactive view</p>
          </div>
        `).join('')}
      </div>
      ` : ''}
    </div>

    ${template.showFooter ? `
    <div class="report-footer">
      <p>Generated by Data Parse Desk</p>
      <p>${format(new Date(), 'EEEE, MMMM dd, yyyy - HH:mm:ss')}</p>
    </div>
    ` : ''}
  </div>
</body>
</html>
  `.trim();
}

/**
 * Download HTML report as file
 */
export function downloadHTMLReport(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open HTML report in new window for printing
 */
export function printHTMLReport(html: string): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get color scheme
 */
function getColorScheme(scheme: string) {
  const schemes = {
    default: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      lightBg: '#f3f4f6',
      border: '#e5e7eb',
    },
    blue: {
      primary: '#0ea5e9',
      primaryDark: '#0284c7',
      lightBg: '#e0f2fe',
      border: '#bae6fd',
    },
    green: {
      primary: '#10b981',
      primaryDark: '#059669',
      lightBg: '#d1fae5',
      border: '#a7f3d0',
    },
    purple: {
      primary: '#8b5cf6',
      primaryDark: '#7c3aed',
      lightBg: '#ede9fe',
      border: '#ddd6fe',
    },
  };

  return schemes[scheme as keyof typeof schemes] || schemes.default;
}

/**
 * Get font sizes
 */
function getFontSize(size: string) {
  const sizes = {
    small: {
      base: '13px',
      small: '11px',
      tiny: '10px',
      h1: '24px',
      h2: '18px',
    },
    medium: {
      base: '14px',
      small: '12px',
      tiny: '11px',
      h1: '28px',
      h2: '20px',
    },
    large: {
      base: '16px',
      small: '14px',
      tiny: '12px',
      h1: '32px',
      h2: '24px',
    },
  };

  return sizes[size as keyof typeof sizes] || sizes.medium;
}
