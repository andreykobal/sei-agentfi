import OpenAI from "openai";
import { OPENAI_API_KEY } from "../../config/env.config";
import { ChatHandler } from "./chat-handler";
import { IChatMessage } from "../../models/chat.model";
import { ChatServiceConfig } from "./types";

/**
 * Main OpenAI service that orchestrates all chat functionality
 */
export class OpenAIService {
  private chatHandler: ChatHandler;
  private readonly config: ChatServiceConfig = {
    MAX_CONTEXT_MESSAGES: 20, // Sliding window size
  };

  constructor() {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    this.chatHandler = new ChatHandler(openai, this.config);
  }

  /**
   * Main chat method with tool calling
   */
  async chat(
    userEmail: string,
    message: string,
    currentTokenAddress?: string
  ): Promise<string> {
    return this.chatHandler.handleChat(userEmail, message, currentTokenAddress);
  }

  /**
   * Get chat history for a user
   */
  async getChatHistory(userEmail: string): Promise<IChatMessage[]> {
    return this.chatHandler.getChatHistory(userEmail);
  }

  /**
   * Clear chat history for a user
   */
  async clearChatHistory(userEmail: string): Promise<void> {
    return this.chatHandler.clearChatHistory(userEmail);
  }

  /**
   * Clear all chat histories (useful for clearing old function_call format data)
   */
  async clearAllChatHistories(): Promise<void> {
    return this.chatHandler.clearAllChatHistories();
  }
}
