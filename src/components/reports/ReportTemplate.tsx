import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Calendar, User } from 'lucide-react';
import { ReportTemplate as ReportTemplateType } from '@/types/reports';

export interface ReportTemplateProps {
  template: ReportTemplateType;
  onUse?: (template: ReportTemplateType) => void;
  onEdit?: (template: ReportTemplateType) => void;
  onDelete?: (templateId: string) => void;
}

export function ReportTemplate({ template, onUse, onEdit, onDelete }: ReportTemplateProps) {
  const categoryLabels = {
    sales: 'Продажи',
    financial: 'Финансовый',
    analytics: 'Аналитика',
    inventory: 'Складской',
    custom: 'Пользовательский',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{template.name}</CardTitle>
              {template.description && (
                <CardDescription className="mt-1">{template.description}</CardDescription>
              )}
            </div>
          </div>
          <Badge variant="secondary">{categoryLabels[template.category]}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>{template.sections.length} секций</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{new Date(template.updatedAt).toLocaleDateString('ru-RU')}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {onUse && (
              <Button onClick={() => onUse(template)} className="flex-1">
                Использовать
              </Button>
            )}
            {onEdit && (
              <Button onClick={() => onEdit(template)} variant="outline" className="flex-1">
                Редактировать
              </Button>
            )}
            {onDelete && (
              <Button onClick={() => onDelete(template.id)} variant="destructive" size="icon">
                ×
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
