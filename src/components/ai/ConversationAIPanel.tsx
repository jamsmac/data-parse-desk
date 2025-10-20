import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Send, Loader2, Plus, MessageSquare, Mic, BarChart3, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface ConversationAIPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  tool_calls?: string;
  tool_results?: string;
}

export function ConversationAIPanel({ open, onOpenChange, projectId }: ConversationAIPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations
  const { data: conversations } = useQuery({
    queryKey: ['ai-conversations', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false });
      return data || [];
    },
    enabled: open && !!projectId,
  });

  // Load messages for active conversation
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['ai-messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const { data } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });
      return data as Message[] || [];
    },
    enabled: !!activeConversationId,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          project_id: projectId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActiveConversationId(data.id);
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
  });

  // Send message with streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      let convId = activeConversationId;

      // Create conversation if doesn't exist
      if (!convId) {
        const { data: newConv } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            project_id: projectId,
          })
          .select()
          .single();

        if (!newConv) throw new Error('Failed to create conversation');
        convId = newConv.id;
        setActiveConversationId(convId);
      }

      // Save user message
      await supabase.from('ai_messages').insert({
        conversation_id: convId,
        role: 'user',
        content: message,
      });

      // Start streaming
      setIsStreaming(true);
      setStreamingContent('');

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              conversation_id: convId,
              message: message,
              project_id: projectId,
              database_id: null,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('AI request failed');
        }

        // Handle SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedContent = '';

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || line.startsWith(':')) continue;
            if (!line.startsWith('data: ')) continue;

            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsStreaming(false);
              setStreamingContent('');
              break;
            }

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.type === 'content') {
                accumulatedContent += parsed.content;
                setStreamingContent(accumulatedContent);
              } else if (parsed.type === 'tools') {
                setStreamingContent(prev => prev + '\n\n🔧 ' + parsed.message);
              } else if (parsed.type === 'tool_result') {
                setStreamingContent(prev => prev + `\n✅ ${parsed.tool} completed`);
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
        
        return { success: true };
      } finally {
        setIsStreaming(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-messages'] });
      queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      setInput('');
    },
    onError: (error: any) => {
      setIsStreaming(false);
      setStreamingContent('');
      toast.error(error.message || 'Ошибка отправки сообщения');
    },
  });

  const handleSend = () => {
    if (!input.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(input);
  };

  const handleNewConversation = () => {
    createConversationMutation.mutate();
  };

  const handleVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Распознавание речи не поддерживается в вашем браузере');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = false;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Ассистент с контекстом
          </SheetTitle>
          <SheetDescription>
            Задавайте вопросы о ваших данных. AI помнит контекст разговора.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with conversations */}
          <div className="w-64 border-r flex flex-col">
            <div className="p-4 border-b">
              <Button
                onClick={handleNewConversation}
                className="w-full"
                size="sm"
                disabled={createConversationMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Новый разговор
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations?.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg hover:bg-accent transition-colors',
                      activeConversationId === conv.id && 'bg-accent'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conv.title || 'Новый разговор'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.updated_at).toLocaleDateString('ru')}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main chat area */}
          <div className="flex-1 flex flex-col">
            {activeConversationId ? (
              <>
                {/* Messages */}
                <ScrollArea className="flex-1 p-6">
                  {messagesLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Загрузка...</p>
                    </div>
                  ) : messages && messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn(
                            'flex',
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                           <div className={cn('max-w-[80%]', msg.role === 'user' ? 'w-full' : '')}>
                            <Card
                              className={cn(
                                msg.role === 'user'
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              )}
                            >
                              <CardContent className="p-3">
                                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                <p
                                  className={cn(
                                    'text-xs mt-1',
                                    msg.role === 'user'
                                      ? 'text-primary-foreground/70'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {new Date(msg.created_at).toLocaleTimeString('ru', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </CardContent>
                            </Card>

                            {/* Render tool results */}
                            {msg.role === 'assistant' && msg.tool_results && (() => {
                              try {
                                const toolResults = JSON.parse(msg.tool_results);
                                return (
                                  <div className="mt-2 space-y-2">
                                    {toolResults.map((result: any, idx: number) => {
                                      // Render chart if tool is create_chart
                                      if (result.tool === 'create_chart' && result.result?.chart_id) {
                                        return (
                                          <Card key={idx} className="bg-card border-border">
                                            <CardContent className="p-4">
                                              <div className="flex items-center gap-2 mb-3">
                                                <BarChart3 className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-medium">{result.result.name}</span>
                                              </div>
                                              <ChartRenderer config={result.result.config} />
                                            </CardContent>
                                          </Card>
                                        );
                                      }

                                      // Regular tool result display
                                      return (
                                        <Card key={idx} className="bg-muted/50 border-border">
                                          <CardContent className="p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                              <Wrench className="h-4 w-4 text-muted-foreground" />
                                              <span className="text-sm font-medium">{result.tool}</span>
                                            </div>
                                            <pre className="text-xs overflow-auto max-h-32">
                                              {JSON.stringify(result.result, null, 2)}
                                            </pre>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                );
                              } catch (e) {
                                return null;
                              }
                            })()}
                          </div>
                        </div>
                      ))}
                      {(sendMessageMutation.isPending || isStreaming) && (
                        <div className="flex justify-start">
                          <Card className="bg-muted max-w-[80%]">
                            <CardContent className="p-3">
                              {isStreaming && streamingContent ? (
                                <>
                                  <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                                  <span className="inline-block w-2 h-4 bg-foreground/50 animate-pulse ml-1" />
                                </>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <p className="text-sm">AI думает...</p>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Начните разговор</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Задайте вопрос о ваших данных. AI помнит контекст и может использовать
                        инструменты для анализа.
                      </p>
                    </div>
                  )}
                </ScrollArea>

                {/* Input area */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Задайте вопрос..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      rows={2}
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <div className="flex flex-col gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleVoiceInput}
                        disabled={isRecording || sendMessageMutation.isPending}
                      >
                        <Mic className={cn('h-4 w-4', isRecording && 'text-red-500')} />
                      </Button>
                      <Button
                        size="icon"
                        onClick={handleSend}
                        disabled={!input.trim() || sendMessageMutation.isPending}
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                  <Sparkles className="h-16 w-16 mx-auto mb-4 text-primary opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">
                    Выберите или создайте разговор
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    AI ассистент с памятью контекста и доступом к инструментам анализа данных
                  </p>
                  <Button onClick={handleNewConversation}>
                    <Plus className="h-4 w-4 mr-2" />
                    Начать новый разговор
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Chart renderer component
function ChartRenderer({ config }: { config: any }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [config]);

  const loadChartData = async () => {
    try {
      const { data, error } = await supabase
        .from('table_data')
        .select('data')
        .eq('database_id', config.database_id);

      if (error) throw error;

      const rows = data?.map(row => row.data) || [];
      setChartData(rows);
    } catch (error) {
      console.error('Error loading chart data:', error);
      toast.error('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
        Нет данных для отображения
      </div>
    );
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--chart-1))'];

  if (config.type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={config.x_column} stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line 
            type="monotone" 
            dataKey={config.y_column} 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))' }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={config.x_column} stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey={config.y_column} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey={config.y_column}
            nameKey={config.x_column}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (config.type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={config.x_column} stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: '12px' }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px'
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Area 
            type="monotone" 
            dataKey={config.y_column} 
            stroke="hsl(var(--primary))" 
            fill="hsl(var(--primary) / 0.2)"
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return null;
}
