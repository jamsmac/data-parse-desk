import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAIChat, AIMessage, ToolResult } from '@/hooks/useAIChat';
import { ChartRenderer } from './ChartRenderer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2, Sparkles, StopCircle, Database } from 'lucide-react';

/**
 * Props for the AIChatPanel component
 */
interface AIChatPanelProps {
  /** Whether the panel is open */
  open: boolean;
  /** Callback when panel open state changes */
  onOpenChange: (open: boolean) => void;
  /** Optional database ID for AI context */
  databaseId?: string;
  /** Optional project ID for AI context */
  projectId?: string;
}

/**
 * AI Chat Panel with SSE streaming support
 *
 * Provides a conversational interface for interacting with the AI assistant.
 * Features include:
 * - Real-time streaming responses via Server-Sent Events
 * - SQL query execution and result display
 * - Chart creation and visualization
 * - Conversation history
 *
 * @param props - Component props
 *
 * @example
 * ```tsx
 * <AIChatPanel
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   databaseId="db-123"
 *   projectId="proj-456"
 * />
 * ```
 */
export const AIChatPanel = ({ open, onOpenChange, databaseId, projectId }: AIChatPanelProps) => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, toolResults, sendMessage, cancelRequest, loadMessages } = useAIChat(
    conversationId,
    databaseId,
    projectId
  );

  // Create or get conversation
  useEffect(() => {
    if (!open || !user?.id) return;

    const initConversation = async () => {
      // Try to get existing conversation for this database
      const { data: existing } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('user_id', user.id)
        .eq('database_id', databaseId || '')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
      } else {
        // Create new conversation
        const { data: newConv } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            database_id: databaseId,
            title: 'New Chat',
          })
          .select('id')
          .single();

        if (newConv) {
          setConversationId(newConv.id);
        }
      }
    };

    initConversation();
  }, [open, user?.id, databaseId]);

  // Load messages when conversation is ready
  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId, loadMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Render chart from tool result
  const renderChart = (result: ToolResult) => {
    if (result.tool !== 'create_chart' || !result.result?.config) return null;

    const { type, database_id, x_column, y_column } = result.result.config;

    return (
      <ChartRenderer
        chartName={result.result.name}
        chartType={type}
        databaseId={database_id}
        xColumn={x_column}
        yColumn={y_column}
      />
    );
  };

  // Render SQL query result
  const renderSQLResult = (result: ToolResult) => {
    if (result.tool !== 'execute_sql_query') return null;

    const rows = result.result?.rows || [];
    if (rows.length === 0) return null;

    return (
      <Card className="mt-2">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Query Results ({rows.length} rows)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {Object.keys(rows[0]).map(key => (
                    <th key={key} className="text-left p-2 font-medium">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    {Object.values(row).map((val: any, i) => (
                      <td key={i} className="p-2">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <p className="text-xs text-muted-foreground mt-2">
                ...and {rows.length - 5} more rows
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] sm:w-[700px] flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Assistant
          </SheetTitle>
          <SheetDescription>
            Ask questions about your data, create charts, and get insights.
          </SheetDescription>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 p-6">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Start a conversation with AI Assistant</p>
                <p className="text-xs mt-2">
                  Try: "Show me the total sales" or "Create a bar chart of revenue by month"
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <Card
                  className={`max-w-[85%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <CardContent className="p-3">
                    {message.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-medium">AI Assistant</span>
                        {message.isStreaming && (
                          <Badge variant="outline" className="text-xs">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Thinking...
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>

                    {/* Render tool results for this message */}
                    {message.role === 'assistant' &&
                      !message.isStreaming &&
                      toolResults.map((result, idx) => (
                        <div key={idx}>
                          {renderChart(result)}
                          {renderSQLResult(result)}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-6 pt-4 border-t">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your data..."
              className="min-h-[80px] resize-none"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </p>
              <div className="flex gap-2">
                {isLoading && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={cancelRequest}
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
};
