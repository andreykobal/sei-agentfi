import OpenAI from "openai";
import { Chat, IChatMessage } from "../../models/chat.model";
import { TokenProjection } from "../../projections/token.projection";
import { connectToMongoDB } from "../../config/database.config";
import { executeFunction } from "./tool-executor";
import { getTools } from "./tools";
import { getSystemPrompt } from "./helpers";
import { OpenAIMessage, TokenContextData, ChatServiceConfig } from "./types";

export class ChatHandler {
  private openai: OpenAI;
  private config: ChatServiceConfig;

  constructor(openai: OpenAI, config: ChatServiceConfig) {
    this.openai = openai;
    this.config = config;
  }

  /**
   * Main chat method with tool calling
   */
  async handleChat(
    userEmail: string,
    message: string,
    currentTokenAddress?: string
  ): Promise<string> {
    console.log(
      `[DEBUG] Starting chat for user: ${userEmail}, message: "${message}"`
    );

    if (currentTokenAddress) {
      console.log(`[DEBUG] Current token context: ${currentTokenAddress}`);
    }

    try {
      await connectToMongoDB();

      // Get current token data if token address is provided
      let currentTokenData: TokenContextData | undefined = undefined;
      if (currentTokenAddress) {
        try {
          const tokenData = await TokenProjection.getTokenByAddress(
            currentTokenAddress
          );
          currentTokenData = tokenData || undefined;
          console.log(`[DEBUG] Current token data retrieved:`, {
            name: currentTokenData?.name,
            symbol: currentTokenData?.symbol,
            hasData: !!currentTokenData,
          });
        } catch (error) {
          console.log(
            `[DEBUG] Could not retrieve token data for ${currentTokenAddress}:`,
            error
          );
        }
      }

      // Add user message to chat history
      const userMessage: IChatMessage = {
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      console.log(`[DEBUG] Saving user message:`, {
        role: userMessage.role,
        content: userMessage.content,
      });
      await Chat.createOrUpdateChat(userEmail, userMessage);
      console.log(`[DEBUG] User message saved successfully`);

      // Get sliding context window
      const contextMessages = await Chat.getSlidingContext(
        userEmail,
        this.config.MAX_CONTEXT_MESSAGES
      );
      console.log(
        `[DEBUG] Retrieved ${contextMessages.length} context messages`
      );

      // Convert to OpenAI format (exclude our timestamp field)
      const openAIMessages: OpenAIMessage[] = [
        {
          role: "system",
          content: getSystemPrompt(currentTokenAddress, currentTokenData),
        },
        ...contextMessages.map((msg) => ({
          role: msg.role as any,
          content: msg.content,
          ...(msg.name && { name: msg.name }),
          ...(msg.tool_calls &&
            msg.tool_calls.length > 0 && { tool_calls: msg.tool_calls }),
          ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        })),
      ];

      console.log(
        `[DEBUG] Sending ${openAIMessages.length} messages to OpenAI`
      );
      console.log(
        `[DEBUG] OpenAI request:`,
        JSON.stringify(
          {
            model: "gpt-4-turbo-preview",
            messageCount: openAIMessages.length,
            hasTools: true,
          },
          null,
          2
        )
      );

      // Call OpenAI with tools
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: openAIMessages,
        tools: getTools(),
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1000,
      });

      console.log(
        `[DEBUG] OpenAI response received:`,
        JSON.stringify(
          {
            choicesCount: response.choices.length,
            finishReason: response.choices[0]?.finish_reason,
            hasContent: !!response.choices[0]?.message?.content,
            contentLength: response.choices[0]?.message?.content?.length || 0,
            hasToolCalls: !!response.choices[0]?.message?.tool_calls?.length,
          },
          null,
          2
        )
      );

      const assistantMessage = response.choices[0]?.message;

      if (!assistantMessage) {
        throw new Error("No response from OpenAI");
      }

      // Handle tool calls if present
      if (
        assistantMessage.tool_calls &&
        assistantMessage.tool_calls.length > 0
      ) {
        return await this.handleToolCalls(
          userEmail,
          assistantMessage,
          currentTokenAddress,
          currentTokenData
        );
      } else {
        // No tool calls, just store and return the response
        return await this.handleDirectResponse(userEmail, assistantMessage);
      }
    } catch (error) {
      console.error(
        `[ERROR] Error in OpenAI chat for user ${userEmail}:`,
        error
      );
      console.error(
        `[ERROR] Stack trace:`,
        error instanceof Error ? error.stack : "No stack trace"
      );
      throw new Error(
        `Chat service error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Handle tool calls and generate final response
   */
  private async handleToolCalls(
    userEmail: string,
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage,
    currentTokenAddress?: string,
    currentTokenData?: TokenContextData
  ): Promise<string> {
    console.log(
      `[DEBUG] Processing ${assistantMessage.tool_calls?.length} tool calls`
    );

    // Always save assistant message with tool calls (required by OpenAI API)
    // If content is empty, use a placeholder to indicate tools are being called
    const toolCallContent =
      assistantMessage.content && assistantMessage.content.trim().length > 0
        ? assistantMessage.content
        : "Let me help you with that...";

    const assistantMessageWithTools: IChatMessage = {
      role: "assistant",
      content: toolCallContent,
      tool_calls: assistantMessage.tool_calls,
      timestamp: new Date(),
    };
    console.log(`[DEBUG] Saving assistant message with tools:`, {
      role: assistantMessageWithTools.role,
      content: assistantMessageWithTools.content,
      toolCallsCount: assistantMessageWithTools.tool_calls?.length || 0,
      wasContentEmpty:
        !assistantMessage.content ||
        assistantMessage.content.trim().length === 0,
    });
    await Chat.createOrUpdateChat(userEmail, assistantMessageWithTools);
    console.log(`[DEBUG] Assistant message with tools saved successfully`);

    // Execute each tool call
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type === "function") {
          console.log(
            `[DEBUG] Executing tool: ${toolCall.function.name} with args:`,
            toolCall.function.arguments
          );

          const functionResult = await executeFunction(
            toolCall.function.name,
            JSON.parse(toolCall.function.arguments),
            userEmail,
            currentTokenAddress
          );

          console.log(
            `[DEBUG] Tool execution result length: ${
              functionResult?.length || 0
            }`
          );

          // Store tool response
          const toolContent =
            functionResult ||
            "Tool execution completed but returned no content.";
          const toolMessage: IChatMessage = {
            role: "tool",
            content: toolContent,
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            timestamp: new Date(),
          };
          console.log(`[DEBUG] Saving tool message:`, {
            role: toolMessage.role,
            contentLength: toolMessage.content.length,
            toolCallId: toolMessage.tool_call_id,
            name: toolMessage.name,
          });
          await Chat.createOrUpdateChat(userEmail, toolMessage);
          console.log(`[DEBUG] Tool message saved successfully`);
        }
      }
    }

    // Get updated context and make a follow-up call for final response
    console.log(`[DEBUG] Getting updated context for final response`);
    const updatedContext = await Chat.getSlidingContext(
      userEmail,
      this.config.MAX_CONTEXT_MESSAGES
    );
    console.log(
      `[DEBUG] Updated context has ${updatedContext.length} messages`
    );

    const finalMessages: OpenAIMessage[] = [
      {
        role: "system",
        content: getSystemPrompt(currentTokenAddress, currentTokenData),
      },
      ...updatedContext.map((msg) => ({
        role: msg.role as any,
        content: msg.content,
        ...(msg.name && { name: msg.name }),
        ...(msg.tool_calls &&
          msg.tool_calls.length > 0 && { tool_calls: msg.tool_calls }),
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
      })),
    ];

    console.log(
      `[DEBUG] Making final OpenAI call with ${finalMessages.length} messages`
    );
    const finalResponse = await this.openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: finalMessages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    console.log(
      `[DEBUG] Final OpenAI response:`,
      JSON.stringify(
        {
          choicesCount: finalResponse.choices.length,
          finishReason: finalResponse.choices[0]?.finish_reason,
          hasContent: !!finalResponse.choices[0]?.message?.content,
          contentLength:
            finalResponse.choices[0]?.message?.content?.length || 0,
        },
        null,
        2
      )
    );

    const finalMessage = finalResponse.choices[0]?.message;

    if (!finalMessage) {
      console.log(`[ERROR] No final message from OpenAI`);
      throw new Error("No response from OpenAI");
    }

    // Store final assistant response
    const finalContent =
      finalMessage.content ||
      "I apologize, but I couldn't generate a response.";
    console.log(
      `[DEBUG] Final content to save: "${finalContent}" (length: ${finalContent.length})`
    );

    const finalAssistantMessage: IChatMessage = {
      role: "assistant",
      content: finalContent,
      timestamp: new Date(),
    };
    console.log(`[DEBUG] Saving final assistant message:`, {
      role: finalAssistantMessage.role,
      contentLength: finalAssistantMessage.content.length,
    });
    await Chat.createOrUpdateChat(userEmail, finalAssistantMessage);
    console.log(`[DEBUG] Final assistant message saved successfully`);

    return finalContent;
  }

  /**
   * Handle direct response without tool calls
   */
  private async handleDirectResponse(
    userEmail: string,
    assistantMessage: OpenAI.Chat.Completions.ChatCompletionMessage
  ): Promise<string> {
    console.log(`[DEBUG] No tool calls, processing direct response`);
    const responseContent =
      assistantMessage.content ||
      "I apologize, but I couldn't generate a response.";
    console.log(
      `[DEBUG] Direct response content: "${responseContent}" (length: ${responseContent.length})`
    );

    const assistantResponse: IChatMessage = {
      role: "assistant",
      content: responseContent,
      timestamp: new Date(),
    };
    console.log(`[DEBUG] Saving direct assistant response:`, {
      role: assistantResponse.role,
      contentLength: assistantResponse.content.length,
    });
    await Chat.createOrUpdateChat(userEmail, assistantResponse);
    console.log(`[DEBUG] Direct assistant response saved successfully`);

    return responseContent;
  }

  /**
   * Get chat history for a user
   */
  async getChatHistory(userEmail: string): Promise<IChatMessage[]> {
    try {
      await connectToMongoDB();
      return await Chat.getSlidingContext(userEmail, 50); // Return more for history view
    } catch (error) {
      console.error("Error getting chat history:", error);
      throw new Error("Failed to get chat history");
    }
  }

  /**
   * Clear chat history for a user
   */
  async clearChatHistory(userEmail: string): Promise<void> {
    try {
      await connectToMongoDB();
      await Chat.clearChatHistory(userEmail);
    } catch (error) {
      console.error("Error clearing chat history:", error);
      throw new Error("Failed to clear chat history");
    }
  }

  /**
   * Clear all chat histories (useful for clearing old function_call format data)
   */
  async clearAllChatHistories(): Promise<void> {
    try {
      await connectToMongoDB();
      await Chat.deleteMany({});
      console.log("All chat histories cleared");
    } catch (error) {
      console.error("Error clearing all chat histories:", error);
      throw new Error("Failed to clear all chat histories");
    }
  }
}
