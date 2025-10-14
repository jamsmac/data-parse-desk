import { ChartConfig } from './charts';

export type ReportSchedule = 'daily' | 'weekly' | 'monthly' | 'custom';
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'html';

export interface ReportSection {
  id: string;
  type: 'text' | 'chart' | 'table' | 'metric' | 'image';
  title?: string;
  content?: string;
  chartConfig?: ChartConfig;
  position: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'sales' | 'financial' | 'analytics' | 'inventory' | 'custom';
  sections: ReportSection[];
  filters?: any[];
  dateRange?: {
    start: string;
    end: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledReport {
  id: string;
  templateId: string;
  name: string;
  schedule: ReportSchedule;
  cronExpression?: string;
  format: ReportFormat;
  recipients: string[];
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
}

export interface ReportConfig {
  id: string;
  name: string;
  template?: ReportTemplate;
  data: any[];
  generatedAt: string;
  format: ReportFormat;
}
