import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface TelegramBot {
  id: string;
  project_id: string;
  bot_token: string;
  bot_username: string;
  bot_name: string | null;
  enabled: boolean;
  webhook_url: string | null;
  webhook_status: string;
}

interface TelegramIntegrationProps {
  projectId: string;
}

export function TelegramIntegration({ projectId }: TelegramIntegrationProps) {
  const [bots, setBots] = useState<TelegramBot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBotToken, setNewBotToken] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadBots();
  }, [projectId]);

  const loadBots = async () => {
    try {
      const { data, error } = await supabase
        .from('telegram_bots')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setBots(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addBot = async () => {
    if (!newBotToken.trim()) return;

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${newBotToken}/getMe`
      );
      const data = await response.json();

      if (!data.ok) throw new Error('Invalid bot token');

      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.from('telegram_bots').insert({
        project_id: projectId,
        bot_token: newBotToken,
        bot_username: data.result.username,
        bot_name: data.result.first_name,
        created_by: session?.session?.user?.id,
      });

      if (error) throw error;

      toast({ title: 'Bot added successfully' });
      setNewBotToken('');
      loadBots();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Telegram Integration</CardTitle>
          <CardDescription>
            Connect Telegram bots to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Add New Bot</Label>
            <div className="flex gap-2">
              <Input
                id="bot-token"
                type="password"
                placeholder="Bot token from @BotFather"
                value={newBotToken}
                onChange={(e) => setNewBotToken(e.target.value)}
              />
              <Button onClick={addBot}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {bots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Bots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{bot.bot_name}</p>
                    <p className="text-sm text-muted-foreground">
                      @{bot.bot_username}
                    </p>
                  </div>
                  <Badge>{bot.enabled ? 'Active' : 'Disabled'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
