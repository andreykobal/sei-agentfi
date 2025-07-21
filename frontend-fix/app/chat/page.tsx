"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Trash2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserStore } from "@/stores/userStore";
import { useChatStore } from "@/stores/chatStore";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatEventEmitter, CHAT_EVENTS } from "@/lib/eventEmitter";

interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  timestamp: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

interface ChatResponse {
  success: boolean;
  response?: string;
  timestamp?: string;
  error?: string;
  details?: string;
}

interface ChatHistoryResponse {
  success: boolean;
  history: ChatMessage[];
  count: number;
  error?: string;
}

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { isAuthenticated, userEmail } = useUserStore();
  const { currentTokenAddress, currentTokenName, currentTokenSymbol } =
    useChatStore();
  const { post, get, delete: del } = useApi();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat history when component mounts (if authenticated)
  useEffect(() => {
    if (isAuthenticated && messages.length === 0) {
      loadChatHistory();
    }
  }, [isAuthenticated]);

  const loadChatHistory = async () => {
    if (!isAuthenticated) {
      console.log(`[CHAT PAGE] Skipping chat history load - not authenticated`);
      return;
    }

    console.log(`[CHAT PAGE] Loading chat history...`);
    setIsLoadingHistory(true);
    try {
      const response = await get<ChatHistoryResponse>("/chat/history");
      console.log(`[CHAT PAGE] Chat history response:`, {
        success: response.data.success,
        historyCount: response.data.history?.length || 0,
        error: response.data.error,
      });

      if (response.data.success) {
        const allMessages = response.data.history;
        const visibleMessages = allMessages.filter(
          (msg: ChatMessage) => msg.role !== "tool"
        );
        const toolMessages = allMessages.filter(
          (msg: ChatMessage) => msg.role === "tool"
        );

        setMessages(allMessages); // Store all messages for context
        console.log(
          `[CHAT PAGE] Chat history loaded: ${allMessages.length} total messages (${visibleMessages.length} visible, ${toolMessages.length} tool messages hidden)`
        );
      } else {
        console.error("Failed to load chat history:", response.data.error);
      }
    } catch (error: any) {
      console.error(`[CHAT PAGE] Error loading chat history:`, error);
      // Don't show error toast for history loading - it's not critical
    } finally {
      setIsLoadingHistory(false);
      console.log(`[CHAT PAGE] Chat history loading completed`);
    }
  };

  const emitRefreshEvents = () => {
    console.log(`[CHAT PAGE] Emitting refresh events after chat response...`);

    // Emit with 500ms delay as requested
    setTimeout(() => {
      // Always refresh tokens list on home page
      chatEventEmitter.emit(CHAT_EVENTS.REFRESH_TOKENS);

      // Also emit token data refresh for any token pages that might be open
      chatEventEmitter.emit(CHAT_EVENTS.REFRESH_TOKEN_DATA, {});

      console.log(`[CHAT PAGE] Refresh events emitted`);
    }, 500);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !isAuthenticated || isLoading) return;

    const messageContent = message.trim();
    console.log(`[CHAT PAGE] Sending message: "${messageContent}"`);

    // Log current token context
    if (currentTokenAddress) {
      console.log(`[CHAT PAGE] Current token context:`, {
        address: currentTokenAddress,
        name: currentTokenName,
        symbol: currentTokenSymbol,
      });
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: messageContent,
      timestamp: new Date().toISOString(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      console.log(`[CHAT PAGE] Making POST request to /chat/message`);
      const requestBody = {
        message: messageContent,
        ...(currentTokenAddress && { currentTokenAddress }),
      };

      console.log(`[CHAT PAGE] Request body:`, requestBody);

      const response = await post<ChatResponse>("/chat/message", requestBody);

      console.log(`[CHAT PAGE] Response received:`, {
        status: response.status,
        success: response.data?.success,
        hasResponse: !!response.data?.response,
        responseLength: response.data?.response?.length || 0,
        error: response.data?.error,
        details: response.data?.details,
      });

      if (response.data.success && response.data.response) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: response.data.response,
          timestamp: response.data.timestamp || new Date().toISOString(),
        };
        console.log(`[CHAT PAGE] Adding assistant message to chat:`, {
          contentLength: assistantMessage.content.length,
          timestamp: assistantMessage.timestamp,
        });
        setMessages((prev) => [...prev, assistantMessage]);

        // Emit refresh events after successful response
        emitRefreshEvents();
      } else {
        console.error(`[CHAT PAGE] Response indicates failure:`, {
          success: response.data.success,
          error: response.data.error,
          details: response.data.details,
        });
        throw new Error(response.data.error || "Failed to get response");
      }
    } catch (error: any) {
      console.error(`[CHAT PAGE] Error caught in sendMessage:`, error);
      console.error(`[CHAT PAGE] Error details:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        stack: error.stack,
      });

      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to send message";
      console.log(`[CHAT PAGE] Using error message: "${errorMessage}"`);

      toast.error(errorMessage);

      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      console.log(`[CHAT PAGE] Adding error message to chat`);
      setMessages((prev) => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
      console.log(`[CHAT PAGE] Request completed, loading set to false`);
    }
  };

  const clearHistory = async () => {
    if (!isAuthenticated) return;

    try {
      await del("/chat/history");
      setMessages([]);
      toast.success("Chat history cleared");
    } catch (error: any) {
      console.error("Error clearing history:", error);
      toast.error("Failed to clear chat history");
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper function to wrap 0x strings with break-all styling
  const processTextWithHexBreaking = (text: string) => {
    // Split by 0x pattern and wrap those parts with break-all
    const parts = text.split(/(0x[a-fA-F0-9]+)/g);
    return parts.map((part, index) => {
      if (part.match(/^0x[a-fA-F0-9]+$/)) {
        return (
          <span key={index} className="break-all">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const renderMessage = (msg: ChatMessage, index: number) => {
    const isUser = msg.role === "user";

    return (
      <div
        key={index}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div
          className={`max-w-[80%] rounded-lg px-3 py-2 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <div className="text-sm">
            {isUser ? (
              // User messages as plain text with selective breaking for 0x strings
              <div className="whitespace-pre-wrap break-words">
                {processTextWithHexBreaking(msg.content)}
              </div>
            ) : (
              // Assistant messages with markdown - let ReactMarkdown handle formatting
              <div className="markdown-content break-words">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    // Handle paragraphs with proper spacing
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0 break-words">{children}</p>
                    ),
                    // Handle code blocks with proper wrapping
                    code: ({ children, className }) => (
                      <code
                        className={`${
                          className || ""
                        } break-words bg-muted/50 px-1 py-0.5 rounded text-xs`}
                      >
                        {typeof children === "string"
                          ? processTextWithHexBreaking(children)
                          : children}
                      </code>
                    ),
                    // Handle preformatted blocks
                    pre: ({ children }) => (
                      <pre className="whitespace-pre-wrap break-words bg-muted/50 p-2 rounded text-xs overflow-x-auto mb-2 last:mb-0">
                        {children}
                      </pre>
                    ),
                    // Handle lists with proper spacing
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-2 last:mb-0 space-y-1">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-1">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="break-words">{children}</li>
                    ),
                    // Handle line breaks explicitly
                    br: () => <br />,
                    // Handle links with proper word wrapping
                    a: ({ children, href, ...props }) => (
                      <a
                        href={href}
                        {...props}
                        className="text-blue-400 hover:text-blue-300 underline break-all"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    ),
                    // Handle text nodes to process 0x strings
                    text: ({ children }) => {
                      if (typeof children === "string") {
                        return <>{processTextWithHexBreaking(children)}</>;
                      }
                      return <>{children}</>;
                    },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}
          </div>
          <div
            className={`text-xs mt-1 opacity-70 ${
              isUser ? "text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {formatTime(msg.timestamp)}
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <Card className="w-full h-[calc(100vh-8rem)] flex items-center justify-center">
          <CardContent>
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">Sign in Required</h2>
              <p className="text-muted-foreground">
                Please sign in to access the AI chat assistant.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="w-full h-[calc(100vh-8rem)] flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-3">
              <MessageCircle className="h-7 w-7" />
              AI Assistant
            </CardTitle>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear History
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">
            Ask me about tokens, trading, and the platform
          </p>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-6 pt-0 min-h-0">
          {/* Messages Container */}
          <div className="flex-1 mb-4 min-h-0">
            <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Loading chat history...
                  </span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      Start a conversation
                    </h3>
                    <p className="text-muted-foreground">
                      Ask me anything about tokens, trading, or the platform
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages
                    .filter((msg) => msg.role !== "tool") // Hide tool messages from UI
                    .map((msg, index) => renderMessage(msg, index))}
                  {isLoading && (
                    <div className="flex justify-start mb-4">
                      <div className="bg-muted text-muted-foreground rounded-lg px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Input Form */}
          <div className="flex-shrink-0">
            <form onSubmit={sendMessage} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask about tokens, trading, or the platform..."
                disabled={isLoading}
                className="flex-1"
                maxLength={2000}
              />
              <Button type="submit" disabled={isLoading || !message.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
