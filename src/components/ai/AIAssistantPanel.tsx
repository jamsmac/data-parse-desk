import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Send, Loader2, Database, FileText, Image, Mic, BarChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AIAssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  databaseId?: string;
}

const agentIcons = {
  schema_creator: Database,
  data_parser: FileText,
  ocr_processor: Image,
  voice_transcriber: Mic,
  analytics_advisor: BarChart,
  chart_builder: BarChart,
};

export const AIAssistantPanel = ({ open, onOpenChange, databaseId }: AIAssistantPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('schema_creator');

  const { data: agents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('created_at');
      return data || [];
    },
  });

  const { data: credits } = useQuery({
    queryKey: ['user-credits', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['ai-requests', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('ai_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: open && !!user?.id,
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (data: { agent_type: string; input: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Создаем запрос
      const { data: request, error } = await supabase
        .from('ai_requests')
        .insert({
          user_id: user.id,
          agent_type: data.agent_type,
          input_data: { message: data.input, database_id: databaseId },
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Вызвать Edge Function для обработки через AI
      // Здесь будет вызов ai-orchestrator Edge Function

      return request;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-requests'] });
      queryClient.invalidateQueries({ queryKey: ['user-credits'] });
      setInput('');
      toast({
        title: 'Запрос отправлен',
        description: 'AI обрабатывает ваш запрос...',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSend = () => {
    if (!input.trim()) return;
    sendRequestMutation.mutate({ agent_type: selectedAgent, input });
  };

  const totalCredits = (credits?.free_credits || 0) + (credits?.paid_credits || 0);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Ассистент
          </SheetTitle>
          <SheetDescription>
            Доступно кредитов: <span className="font-semibold text-foreground">{totalCredits.toFixed(2)}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-120px)] mt-6">
          {/* Выбор агента */}
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Тип задачи:</p>
            <div className="grid grid-cols-2 gap-2">
              {agents?.map((agent) => {
                const Icon = agentIcons[agent.agent_type as keyof typeof agentIcons] || Database;
                return (
                  <Button
                    key={agent.id}
                    variant={selectedAgent === agent.agent_type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedAgent(agent.agent_type)}
                    className="justify-start"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {agent.name}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* История запросов */}
          <ScrollArea className="flex-1 border rounded-lg p-4 mb-4">
            {requestsLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Загрузка...
              </div>
            ) : requests && requests.length > 0 ? (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div key={req.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={req.status === 'completed' ? 'default' : req.status === 'failed' ? 'destructive' : 'secondary'}>
                        {req.status === 'completed' ? 'Завершено' : req.status === 'failed' ? 'Ошибка' : 'В обработке'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(req.created_at).toLocaleTimeString('ru')}
                      </span>
                    </div>
                    <p className="text-sm">{(req.input_data as any)?.message || 'Запрос'}</p>
                    {req.output_data && (
                      <div className="bg-muted p-2 rounded text-sm">
                        {JSON.stringify(req.output_data, null, 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Начните диалог с AI ассистентом</p>
              </div>
            )}
          </ScrollArea>

          {/* Ввод */}
          <div className="space-y-2">
            <Textarea
              placeholder="Опишите задачу для AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={3}
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || sendRequestMutation.isPending}
              className="w-full"
            >
              {sendRequestMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Отправить
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
