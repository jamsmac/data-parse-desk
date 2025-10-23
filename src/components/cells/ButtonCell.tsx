/**
 * ButtonCell - Interactive button in table cell
 * Supports actions: open_url, run_formula, send_email, custom
 */

import { Button } from '@/components/ui/button';
import { ButtonConfig } from '@/types/database';
import { ExternalLink, Mail, Play, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface ButtonCellProps {
  value?: any;
  config: ButtonConfig;
  rowData?: Record<string, any>;
  onAction?: (action: string, data?: any) => void;
}

export function ButtonCell({ value, config, rowData, onAction }: ButtonCellProps) {
  const handleClick = async () => {
    try {
      switch (config.action) {
        case 'open_url':
          if (config.url) {
            // Заменить плейсхолдеры на значения из rowData
            let url = config.url;
            if (rowData) {
              Object.keys(rowData).forEach((key) => {
                url = url.replace(`{${key}}`, String(rowData[key] || ''));
              });
            }
            window.open(url, '_blank');
          }
          break;

        case 'send_email':
          if (config.email_template) {
            // Заменить плейсхолдеры
            const subject = 'Email from Data Parse Desk';
            let body = config.email_template;
            if (rowData) {
              Object.keys(rowData).forEach((key) => {
                body = body.replace(`{${key}}`, String(rowData[key] || ''));
              });
            }
            window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          }
          break;

        case 'run_formula':
          if (config.formula && onAction) {
            onAction('run_formula', { formula: config.formula, rowData });
          }
          break;

        case 'custom':
          if (onAction) {
            onAction('custom', { rowData });
          }
          break;
      }
    } catch (error) {
      console.error('Button action error:', error);
      toast.error('Failed to execute button action');
    }
  };

  const getIcon = () => {
    switch (config.action) {
      case 'open_url':
        return <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />;
      case 'send_email':
        return <Mail className="h-4 w-4 mr-2" aria-hidden="true" />;
      case 'run_formula':
        return <Zap className="h-4 w-4 mr-2" aria-hidden="true" />;
      case 'custom':
        return <Play className="h-4 w-4 mr-2" aria-hidden="true" />;
      default:
        return null;
    }
  };

  const getAriaLabel = () => {
    const label = config.label || 'Action';
    switch (config.action) {
      case 'open_url':
        return `${label}: Open URL in new tab`;
      case 'send_email':
        return `${label}: Send email`;
      case 'run_formula':
        return `${label}: Run formula`;
      case 'custom':
        return `${label}: Execute custom action`;
      default:
        return label;
    }
  };

  return (
    <Button
      variant={config.variant || 'default'}
      size="sm"
      onClick={handleClick}
      className="h-8"
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
    >
      {getIcon()}
      <span>{config.label || 'Action'}</span>
    </Button>
  );
}
