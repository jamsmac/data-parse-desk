import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Calendar, Clock, Mail, Plus, Trash2, Send } from 'lucide-react';
import { ScheduledReport, ReportTemplate, ReportSchedule, ReportFormat } from '@/types/reports';
import { EmailAPI } from '@/api/emailAPI';
import { useToast } from '@/hooks/use-toast';

export interface ScheduledReportsProps {
  schedules: ScheduledReport[];
  templates: ReportTemplate[];
  onAdd: (schedule: Omit<ScheduledReport, 'id' | 'createdAt'>) => void;
  onUpdate: (scheduleId: string, updates: Partial<ScheduledReport>) => void;
  onDelete: (scheduleId: string) => void;
  onSendNow?: (scheduleId: string) => Promise<void>;
}

const SCHEDULE_OPTIONS: { value: ReportSchedule; label: string }[] = [
  { value: 'daily', label: 'Ежедневно' },
  { value: 'weekly', label: 'Еженедельно' },
  { value: 'monthly', label: 'Ежемесячно' },
  { value: 'custom', label: 'Пользовательское' },
];

const FORMAT_OPTIONS: { value: ReportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF' },
  { value: 'excel', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
  { value: 'html', label: 'HTML' },
];

export function ScheduledReports({
  schedules,
  templates,
  onAdd,
  onUpdate,
  onDelete,
  onSendNow,
}: ScheduledReportsProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sendingReportId, setSendingReportId] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState<Omit<ScheduledReport, 'id' | 'createdAt'>>({
    templateId: '',
    name: '',
    schedule: 'daily',
    format: 'pdf',
    recipients: [],
    isActive: true,
  });
  const [recipientEmail, setRecipientEmail] = useState('');

  const handleAddSchedule = () => {
    if (newSchedule.templateId && newSchedule.name && newSchedule.recipients.length > 0) {
      onAdd(newSchedule);
      setIsDialogOpen(false);
      setNewSchedule({
        templateId: '',
        name: '',
        schedule: 'daily',
        format: 'pdf',
        recipients: [],
        isActive: true,
      });
      setRecipientEmail('');
    }
  };

  const addRecipient = () => {
    if (recipientEmail && !newSchedule.recipients.includes(recipientEmail)) {
      setNewSchedule((prev) => ({
        ...prev,
        recipients: [...prev.recipients, recipientEmail],
      }));
      setRecipientEmail('');
    }
  };

  const removeRecipient = (email: string) => {
    setNewSchedule((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((r) => r !== email),
    }));
  };

  const getScheduleLabel = (schedule: ReportSchedule) => {
    return SCHEDULE_OPTIONS.find((o) => o.value === schedule)?.label || schedule;
  };

  const getFormatLabel = (format: ReportFormat) => {
    return FORMAT_OPTIONS.find((o) => o.value === format)?.label || format;
  };

  // Send report now
  const handleSendNow = async (scheduleId: string) => {
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (!schedule) {
      toast({
        title: 'Ошибка',
        description: 'Расписание не найдено',
        variant: 'destructive',
      });
      return;
    }

    const template = templates.find((t) => t.id === schedule.templateId);
    if (!template) {
      toast({
        title: 'Ошибка',
        description: 'Шаблон отчёта не найден',
        variant: 'destructive',
      });
      return;
    }

    setSendingReportId(scheduleId);
    try {
      // Use onSendNow callback if provided
      if (onSendNow) {
        await onSendNow(scheduleId);
      } else {
        // Use EmailAPI to send report
        await EmailAPI.sendScheduledReport({
          scheduleId: schedule.id,
          reportData: { message: 'Sample report data' }, // Replace with actual report data
          format: schedule.format,
          recipients: schedule.recipients,
          templateName: template.name,
        });
      }

      toast({
        title: 'Отчёт отправлен',
        description: `Отчёт "${schedule.name}" отправлен получателям`,
      });
    } catch (error) {
      console.error('Send report error:', error);
      toast({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось отправить отчёт',
        variant: 'destructive',
      });
    } finally {
      setSendingReportId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Запланированные отчеты</h3>
          <p className="text-sm text-muted-foreground">
            Автоматическая генерация и отправка отчетов
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Добавить расписание
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Новое расписание отчета</DialogTitle>
              <DialogDescription>
                Настройте автоматическую генерацию и отправку отчета
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Название</Label>
                <Input
                  value={newSchedule.name}
                  onChange={(e) =>
                    setNewSchedule((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ежедневный отчет по продажам"
                />
              </div>

              <div className="space-y-2">
                <Label>Шаблон отчета</Label>
                <Select
                  value={newSchedule.templateId}
                  onValueChange={(value) =>
                    setNewSchedule((prev) => ({ ...prev, templateId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите шаблон" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Расписание</Label>
                  <Select
                    value={newSchedule.schedule}
                    onValueChange={(value: ReportSchedule) =>
                      setNewSchedule((prev) => ({ ...prev, schedule: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Формат</Label>
                  <Select
                    value={newSchedule.format}
                    onValueChange={(value: ReportFormat) =>
                      setNewSchedule((prev) => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAT_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newSchedule.schedule === 'custom' && (
                <div className="space-y-2">
                  <Label>Cron выражение</Label>
                  <Input
                    value={newSchedule.cronExpression || ''}
                    onChange={(e) =>
                      setNewSchedule((prev) => ({ ...prev, cronExpression: e.target.value }))
                    }
                    placeholder="0 9 * * *"
                  />
                  <p className="text-xs text-muted-foreground">
                    Пример: 0 9 * * * (каждый день в 9:00)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Получатели</Label>
                <div className="flex gap-2">
                  <Input
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="email@example.com"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addRecipient();
                      }
                    }}
                  />
                  <Button type="button" onClick={addRecipient}>
                    Добавить
                  </Button>
                </div>
                {newSchedule.recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newSchedule.recipients.map((email) => (
                      <Badge key={email} variant="secondary">
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="ml-2 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <Label>Активно</Label>
                <Switch
                  checked={newSchedule.isActive}
                  onCheckedChange={(checked) =>
                    setNewSchedule((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleAddSchedule}>Создать</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Schedules List */}
      {schedules.length > 0 ? (
        <div className="grid gap-4">
          {schedules.map((schedule) => {
            const template = templates.find((t) => t.id === schedule.templateId);
            return (
              <Card key={schedule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{schedule.name}</CardTitle>
                      <CardDescription>
                        Шаблон: {template?.name || 'Не найден'}
                      </CardDescription>
                    </div>
                    <Switch
                      checked={schedule.isActive}
                      onCheckedChange={(checked) =>
                        onUpdate(schedule.id, { isActive: checked })
                      }
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        <Calendar className="mr-1 h-3 w-3" />
                        {getScheduleLabel(schedule.schedule)}
                      </Badge>
                      <Badge variant="outline">{getFormatLabel(schedule.format)}</Badge>
                      <Badge variant="outline">
                        <Mail className="mr-1 h-3 w-3" />
                        {schedule.recipients.length} получателей
                      </Badge>
                    </div>

                    {schedule.lastRun && (
                      <div className="text-sm text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Последний запуск:{' '}
                        {new Date(schedule.lastRun).toLocaleString('ru-RU')}
                      </div>
                    )}

                    {schedule.nextRun && (
                      <div className="text-sm text-muted-foreground">
                        <Clock className="inline h-3 w-3 mr-1" />
                        Следующий запуск:{' '}
                        {new Date(schedule.nextRun).toLocaleString('ru-RU')}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendNow(schedule.id)}
                        disabled={sendingReportId === schedule.id}
                      >
                        <Send className="mr-2 h-4 w-4" />
                        {sendingReportId === schedule.id ? 'Отправка...' : 'Отправить сейчас'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => onDelete(schedule.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Нет запланированных отчетов</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Создайте расписание для автоматической генерации отчетов
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
