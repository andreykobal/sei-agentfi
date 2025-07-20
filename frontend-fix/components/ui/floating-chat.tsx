"use client";

import { useState, useEffect, useRef } from "react";
import { Send, X, Trash2, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUserStore } from "@/stores/userStore";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

export function FloatingChat() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { isAuthenticated, userEmail } = useUserStore();
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

  // Load chat history when expanding chat (if authenticated)
  useEffect(() => {
    if (isExpanded && isAuthenticated && messages.length === 0) {
      loadChatHistory();
    }
  }, [isExpanded, isAuthenticated]);

  // Handle click outside to close expanded chat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded) {
        const chatContainer = document.querySelector("[data-chat-container]");
        if (chatContainer && !chatContainer.contains(event.target as Node)) {
          console.log(
            `[FRONTEND] Closing chat - clicked outside chat container`
          );
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);

  const loadChatHistory = async () => {
    if (!isAuthenticated) {
      console.log(`[FRONTEND] Skipping chat history load - not authenticated`);
      return;
    }

    console.log(`[FRONTEND] Loading chat history...`);
    setIsLoadingHistory(true);
    try {
      const response = await get<ChatHistoryResponse>("/chat/history");
      console.log(`[FRONTEND] Chat history response:`, {
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
          `[FRONTEND] Chat history loaded: ${allMessages.length} total messages (${visibleMessages.length} visible, ${toolMessages.length} tool messages hidden)`
        );
      } else {
        console.error("Failed to load chat history:", response.data.error);
      }
    } catch (error: any) {
      console.error(`[FRONTEND] Error loading chat history:`, error);
      // Don't show error toast for history loading - it's not critical
    } finally {
      setIsLoadingHistory(false);
      console.log(`[FRONTEND] Chat history loading completed`);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !isAuthenticated || isLoading) return;

    const messageContent = message.trim();
    console.log(`[FRONTEND] Sending message: "${messageContent}"`);

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
      console.log(`[FRONTEND] Making POST request to /chat/message`);
      const response = await post<ChatResponse>("/chat/message", {
        message: messageContent,
      });

      console.log(`[FRONTEND] Response received:`, {
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
        console.log(`[FRONTEND] Adding assistant message to chat:`, {
          contentLength: assistantMessage.content.length,
          timestamp: assistantMessage.timestamp,
        });
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        console.error(`[FRONTEND] Response indicates failure:`, {
          success: response.data.success,
          error: response.data.error,
          details: response.data.details,
        });
        throw new Error(response.data.error || "Failed to get response");
      }
    } catch (error: any) {
      console.error(`[FRONTEND] Error caught in sendMessage:`, error);
      console.error(`[FRONTEND] Error details:`, {
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
      console.log(`[FRONTEND] Using error message: "${errorMessage}"`);

      toast.error(errorMessage);

      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        role: "assistant",
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      };
      console.log(`[FRONTEND] Adding error message to chat`);
      setMessages((prev) => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
      console.log(`[FRONTEND] Request completed, loading set to false`);
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
              // User messages as plain text
              <div className="whitespace-pre-wrap break-words">
                {msg.content}
              </div>
            ) : (
              // Assistant messages with simple markdown
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
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

  const handleInputFocus = () => {
    if (!isAuthenticated) {
      toast.info("Please sign in to use the AI chat assistant");
      return;
    }
    console.log(`[FRONTEND] Expanding chat on input focus`);
    setIsExpanded(true);
  };

  return (
    <div
      className="fixed bottom-0 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4"
      data-chat-container
    >
      {/* Expanded Chat */}
      {isExpanded && isAuthenticated && (
        <Card className="mb-4 shadow-2xl border-2" data-chat-card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                AI Assistant
              </CardTitle>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="p-1 h-8 w-8"
                    title="Clear chat history"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    console.log(`[FRONTEND] Closing chat via X button`);
                    setIsExpanded(false);
                  }}
                  className="p-1 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Ask me about tokens and the platform
            </p>
          </CardHeader>

          <CardContent className="p-4 pt-0">
            <div className="flex flex-col">
              {/* Messages Container with fixed height and proper scrolling */}
              <div className="h-80 mb-4">
                <ScrollArea className="h-full pr-4" ref={scrollAreaRef}>
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Loading chat history...
                      </span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-20">
                      <div className="text-center">
                        <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Start a conversation
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Always visible input at bottom */}
      <div className="bg-background border border-border rounded-lg shadow-lg mb-4">
        <form onSubmit={sendMessage} className="flex items-center p-3">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={handleInputFocus}
            placeholder={
              isAuthenticated
                ? "Ask about tokens, trading, or the platform..."
                : "Sign in to chat with AI assistant"
            }
            disabled={isLoading || !isAuthenticated}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
            maxLength={2000}
          />
          {isAuthenticated && (
            <Button
              type="submit"
              size="sm"
              disabled={isLoading || !message.trim()}
              className="ml-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
