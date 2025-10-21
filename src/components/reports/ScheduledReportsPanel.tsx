import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Mail, Send, Plus, Trash2, Play } from 'lucide-react';

interface ScheduledReportsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseId?: string;
}

const SCHEDULE_PRESETS = [
  { value: '0 9 * * *', label: 'Daily at 9 AM' },
  { value: '0 9 * * 1', label: 'Every Monday at 9 AM' },
  { value: '0 9 1 * *', label: 'First day of month at 9 AM' },
  { value: '0 17 * * 5', label: 'Every Friday at 5 PM' },
];

export const ScheduledReportsPanel = ({ open, onOpenChange, databaseId }: ScheduledReportsPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const [newReport, setNewReport] = useState({
    name: '',
    description: '',
    schedule_cron: '0 9 * * *',
    delivery_method: 'email' as 'email' | 'telegram' | 'both',
    report_format: 'pdf' as 'pdf' | 'xlsx' | 'csv',
    email_recipients: '',
    include_data: true,
    include_charts: false,
    include_insights: false,
  });

  // Load scheduled reports
  const { data: reports } = useQuery({
    queryKey: ['scheduled-reports', databaseId],
    queryFn: async () => {
      let query = supabase
        .from('scheduled_reports')
        .select('*, report_executions(count)')
        .order('created_at', { ascending: false });

      if (databaseId) {
        query = query.eq('database_id', databaseId);
      } else {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Create report
  const createReportMutation = useMutation({
    mutationFn: async (report: typeof newReport) => {
      const emailRecipients = report.email_recipients
        .split(',')
        .map(e => e.trim())
        .filter(e => e);

      const { error } = await supabase
        .from('scheduled_reports')
        .insert({
          user_id: user?.id,
          database_id: databaseId,
          name: report.name,
          description: report.description,
          schedule_cron: report.schedule_cron,
          delivery_method: report.delivery_method,
          report_format: report.report_format,
          email_recipients: emailRecipients,
          include_data: report.include_data,
          include_charts: report.include_charts,
          include_insights: report.include_insights,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      setIsAdding(false);
      setNewReport({
        name: '',
        description: '',
        schedule_cron: '0 9 * * *',
        delivery_method: 'email',
        report_format: 'pdf',
        email_recipients: '',
        include_data: true,
        include_charts: false,
        include_insights: false,
      });
      toast({ description: 'Scheduled report created' });
    },
  });

  // Delete report
  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_reports')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
      toast({ description: 'Report deleted' });
    },
  });

  // Toggle active
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('scheduled_reports')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-reports'] });
    },
  });

  // Run report now
  const runNowMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.functions.invoke('generate-scheduled-report', {
        body: { report_id: reportId },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ description: 'Report generation started' });
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Scheduled Reports
          </SheetTitle>
          <SheetDescription>
            Automatically generate and send reports on a schedule
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          {/* Existing Reports */}
          <div className="space-y-3 mb-6">
            {reports?.map((report) => (
              <Card key={report.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {report.name}
                        {!report.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Paused
                          </Badge>
                        )}
                      </CardTitle>
                      {report.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {SCHEDULE_PRESETS.find(p => p.value === report.schedule_cron)?.label || report.schedule_cron}
                        </div>
                        <div className="flex items-center gap-1">
                          {report.delivery_method === 'email' && <Mail className="h-3 w-3" />}
                          {report.delivery_method === 'telegram' && <Send className="h-3 w-3" />}
                          {report.delivery_method}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {report.report_format.toUpperCase()}
                        </Badge>
                      </div>
                      {report.last_run_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last run: {new Date(report.last_run_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => runNowMutation.mutate(report.id)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteReportMutation.mutate(report.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={report.is_active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: report.id, isActive: checked })
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {report.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add New Report */}
          {!isAdding ? (
            <Button onClick={() => setIsAdding(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Schedule New Report
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">New Scheduled Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Report Name</Label>
                  <Input
                    value={newReport.name}
                    onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                    placeholder="Weekly Sales Report"
                  />
                </div>

                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={newReport.description}
                    onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
                    placeholder="Detailed description..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Schedule</Label>
                  <Select
                    value={newReport.schedule_cron}
                    onValueChange={(value) => setNewReport({ ...newReport, schedule_cron: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Format</Label>
                  <Select
                    value={newReport.report_format}
                    onValueChange={(value: any) => setNewReport({ ...newReport, report_format: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Delivery Method</Label>
                  <Select
                    value={newReport.delivery_method}
                    onValueChange={(value: any) => setNewReport({ ...newReport, delivery_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(newReport.delivery_method === 'email' || newReport.delivery_method === 'both') && (
                  <div>
                    <Label>Email Recipients (comma-separated)</Label>
                    <Input
                      value={newReport.email_recipients}
                      onChange={(e) => setNewReport({ ...newReport, email_recipients: e.target.value })}
                      placeholder="user1@example.com, user2@example.com"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newReport.include_data}
                      onCheckedChange={(checked) => setNewReport({ ...newReport, include_data: checked })}
                    />
                    <Label>Include data table</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newReport.include_charts}
                      onCheckedChange={(checked) => setNewReport({ ...newReport, include_charts: checked })}
                    />
                    <Label>Include charts</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newReport.include_insights}
                      onCheckedChange={(checked) => setNewReport({ ...newReport, include_insights: checked })}
                    />
                    <Label>Include AI insights</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => createReportMutation.mutate(newReport)}
                    disabled={!newReport.name || createReportMutation.isPending}
                  >
                    Create Schedule
                  </Button>
                  <Button variant="outline" onClick={() => setIsAdding(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
