import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code2, Zap } from 'lucide-react';

export function WebhookEvents() {
  const { data: events } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .order('event_type');

      if (error) throw error;
      return data || [];
    },
  });

  const eventCategories = {
    database: events?.filter(e => e.event_type.startsWith('database.')) || [],
    row: events?.filter(e => e.event_type.startsWith('row.')) || [],
    import: events?.filter(e => e.event_type.startsWith('import.')) || [],
    report: events?.filter(e => e.event_type.startsWith('report.')) || [],
    comment: events?.filter(e => e.event_type.startsWith('comment.')) || [],
  };

  const renderEventCard = (event: any) => (
    <Card key={event.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-mono">{event.event_type}</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            Event
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{event.description}</p>

        {event.payload_schema && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="h-3 w-3" />
              <span className="text-xs font-semibold text-muted-foreground">Payload Schema</span>
            </div>
            <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
              {JSON.stringify(event.payload_schema, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-2">Доступные события</h3>
          <p className="text-sm text-muted-foreground">
            Выберите события, которые будут триггерить ваши webhooks. Каждое событие отправляет
            POST запрос с JSON payload на указанный URL.
          </p>
        </CardContent>
      </Card>

      <ScrollArea className="h-[600px]">
        {/* Database Events */}
        {eventCategories.database.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Badge>Database</Badge>
              События базы данных
            </h3>
            {eventCategories.database.map(renderEventCard)}
          </div>
        )}

        {/* Row Events */}
        {eventCategories.row.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Badge>Row</Badge>
              События записей
            </h3>
            {eventCategories.row.map(renderEventCard)}
          </div>
        )}

        {/* Import Events */}
        {eventCategories.import.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Badge>Import</Badge>
              События импорта
            </h3>
            {eventCategories.import.map(renderEventCard)}
          </div>
        )}

        {/* Report Events */}
        {eventCategories.report.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Badge>Report</Badge>
              События отчётов
            </h3>
            {eventCategories.report.map(renderEventCard)}
          </div>
        )}

        {/* Comment Events */}
        {eventCategories.comment.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Badge>Comment</Badge>
              События комментариев
            </h3>
            {eventCategories.comment.map(renderEventCard)}
          </div>
        )}
      </ScrollArea>

      {/* Integration Example */}
      <Card>
        <CardHeader>
          <CardTitle>Пример интеграции</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Webhook Endpoint (Node.js/Express)</h4>
            <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto">
{`const express = require('express');
const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const webhookId = req.headers['x-webhook-id'];
  const eventType = req.headers['x-webhook-event'];
  const payload = req.body;

  // Verify signature (if secret key is set)
  const expectedSignature = crypto
    .createHmac('sha256', YOUR_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest('hex');

  if (signature !== \`sha256=\${expectedSignature}\`) {
    return res.status(401).send('Invalid signature');
  }

  // Process the webhook
  console.log('Received event:', eventType);
  console.log('Payload:', payload);

  // Return 200 to acknowledge receipt
  res.status(200).send('OK');
});`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
