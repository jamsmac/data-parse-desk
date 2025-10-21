import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

/**
 * Represents a message in the AI conversation
 */
export interface AIMessage {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** Text content of the message */
  content: string;
  /** Optional tool calls data */
  tool_calls?: any;
  /** Timestamp when the message was created */
  created_at: string;
  /** Whether this message is currently being streamed */
  isStreaming?: boolean;
}

/**
 * Result from an AI tool execution
 */
export interface ToolResult {
  /** Name of the tool that was executed */
  tool: string;
  /** Result data from the tool execution */
  result: any;
}

/**
 * Server-Sent Event from the AI stream
 * @internal
 */
interface StreamEvent {
  type: 'content' | 'tools' | 'tool_result' | 'tool_error';
  content?: string;
  message?: string;
  tool?: string;
  result?: any;
  error?: string;
}

/**
 * React hook for managing AI chat conversations with SSE streaming support
 *
 * @param conversationId - The ID of the conversation
 * @param databaseId - Optional database ID for context
 * @param projectId - Optional project ID for context
 *
 * @returns Object containing messages, loading state, and control functions
 *
 * @example
 * ```tsx
 * const { messages, isLoading, sendMessage, cancelRequest } = useAIChat(
 *   'conversation-123',
 *   'database-456',
 *   'project-789'
 * );
 *
 * // Send a message
 * await sendMessage('Analyze my sales data');
 *
 * // Cancel ongoing request
 * cancelRequest();
 * ```
 */
export function useAIChat(conversationId: string, databaseId?: string, projectId?: string) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toolResults, setToolResults] = useState<ToolResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversation messages
  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
  }, [conversationId]);

  // Send message with SSE streaming
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setIsLoading(true);
    setToolResults([]);

    // Optimistically add user message
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    // Create streaming assistant message
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: AIMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Call AI Orchestrator with SSE
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversation_id: conversationId,
            message,
            database_id: databaseId,
            project_id: projectId,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

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
            // Streaming complete
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, isStreaming: false }
                  : msg
              )
            );
            continue;
          }

          try {
            const event: StreamEvent = JSON.parse(data);

            switch (event.type) {
              case 'content':
                // Append content delta
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + (event.content || '') }
                      : msg
                  )
                );
                break;

              case 'tools':
                // Tool execution started
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + '\n\n🔧 ' + (event.message || 'Executing tools...') }
                      : msg
                  )
                );
                break;

              case 'tool_result':
                // Tool execution result
                if (event.tool && event.result) {
                  setToolResults(prev => [...prev, { tool: event.tool!, result: event.result }]);

                  let resultText = '';
                  if (event.tool === 'execute_sql_query') {
                    resultText = `\n📊 Query returned ${event.result.count} rows`;
                  } else if (event.tool === 'aggregate_data') {
                    resultText = `\n📈 ${event.result.operation}: ${event.result.result}`;
                  } else if (event.tool === 'create_chart') {
                    resultText = `\n📊 Chart "${event.result.name}" created`;
                  }

                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + resultText }
                        : msg
                    )
                  );
                }
                break;

              case 'tool_error':
                // Tool execution error
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + `\n❌ Error: ${event.error}` }
                      : msg
                  )
                );
                break;
            }
          } catch (e) {
            console.error('Error parsing SSE event:', e);
          }
        }
      }

    } catch (error: any) {
      console.error('Error sending message:', error);

      if (error.name === 'AbortError') {
        toast({
          title: 'Request cancelled',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error sending message',
          description: error.message,
          variant: 'destructive',
        });

        // Update assistant message with error
        setMessages(prev =>
          prev.map(msg =>
            msg.id === assistantMessageId
              ? { ...msg, content: '❌ Failed to process request. Please try again.', isStreaming: false }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [conversationId, databaseId, projectId, toast]);

  // Cancel ongoing request
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    isLoading,
    toolResults,
    sendMessage,
    cancelRequest,
    loadMessages,
  };
}
