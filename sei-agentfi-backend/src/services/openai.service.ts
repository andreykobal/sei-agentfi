import OpenAI from "openai";
import { OPENAI_API_KEY } from "../config/env.config";
import { TokenProjection } from "../read/token.projection";
import { Chat, IChatMessage } from "../models/chat.model";
import { connectToMongoDB } from "../config/database";

class OpenAIService {
  private openai: OpenAI;
  private readonly MAX_CONTEXT_MESSAGES = 20; // Sliding window size

  constructor() {
    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  // Define available tools/functions for OpenAI
  private getTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
    return [
      {
        type: "function",
        function: {
          name: "getAllTokens",
          description:
            "Get all tokens created on the Sei AgentFi platform. Returns detailed information about each token including name, symbol, creator, description, social links, and creation details.",
          parameters: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description:
                  "Optional limit for number of tokens to return. Defaults to all tokens if not specified.",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getTokensByCreator",
          description: "Get all tokens created by a specific wallet address.",
          parameters: {
            type: "object",
            properties: {
              creator: {
                type: "string",
                description: "The wallet address of the token creator",
              },
            },
            required: ["creator"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getTokenByAddress",
          description:
            "Get detailed information about a specific token by its contract address.",
          parameters: {
            type: "object",
            properties: {
              address: {
                type: "string",
                description: "The contract address of the token",
              },
            },
            required: ["address"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getRecentTokens",
          description: "Get the most recently created tokens on the platform.",
          parameters: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description: "Number of recent tokens to return (default: 10)",
              },
            },
            required: [],
          },
        },
      },
    ];
  }

  // Execute tool functions
  private async executeFunction(name: string, args: any): Promise<string> {
    console.log(
      `[DEBUG] Executing function: ${name} with args:`,
      JSON.stringify(args)
    );
    try {
      switch (name) {
        case "getAllTokens":
          const allTokens = await TokenProjection.getAllTokens();
          const limitedTokens = args.limit
            ? allTokens.slice(0, args.limit)
            : allTokens;
          const getAllResult = JSON.stringify({
            success: true,
            count: limitedTokens.length,
            tokens: limitedTokens.map((token) => ({
              name: token.name,
              symbol: token.symbol,
              tokenAddress: token.tokenAddress,
              creator: token.creator,
              description: token.description,
              image: token.image,
              website: token.website,
              twitter: token.twitter,
              telegram: token.telegram,
              discord: token.discord,
              decimals: token.decimals,
              createdAt: token.createdAt,
            })),
          });
          console.log(
            `[DEBUG] getAllTokens result: ${limitedTokens.length} tokens, result length: ${getAllResult.length}`
          );
          return getAllResult;

        case "getTokensByCreator":
          const creatorTokens = await TokenProjection.getTokensByCreator(
            args.creator
          );
          return JSON.stringify({
            success: true,
            count: creatorTokens.length,
            creator: args.creator,
            tokens: creatorTokens.map((token) => ({
              name: token.name,
              symbol: token.symbol,
              tokenAddress: token.tokenAddress,
              description: token.description,
              image: token.image,
              website: token.website,
              twitter: token.twitter,
              telegram: token.telegram,
              discord: token.discord,
              decimals: token.decimals,
              createdAt: token.createdAt,
            })),
          });

        case "getTokenByAddress":
          const token = await TokenProjection.getTokenByAddress(args.address);
          if (!token) {
            return JSON.stringify({
              success: false,
              error: "Token not found",
              address: args.address,
            });
          }
          return JSON.stringify({
            success: true,
            token: {
              name: token.name,
              symbol: token.symbol,
              tokenAddress: token.tokenAddress,
              creator: token.creator,
              description: token.description,
              image: token.image,
              website: token.website,
              twitter: token.twitter,
              telegram: token.telegram,
              discord: token.discord,
              decimals: token.decimals,
              createdAt: token.createdAt,
            },
          });

        case "getRecentTokens":
          const limit = args.limit || 10;
          const recentTokens = await TokenProjection.getRecentTokens(limit);
          return JSON.stringify({
            success: true,
            count: recentTokens.length,
            tokens: recentTokens.map((token) => ({
              name: token.name,
              symbol: token.symbol,
              tokenAddress: token.tokenAddress,
              creator: token.creator,
              description: token.description,
              image: token.image,
              website: token.website,
              twitter: token.twitter,
              telegram: token.telegram,
              discord: token.discord,
              decimals: token.decimals,
              createdAt: token.createdAt,
            })),
          });

        default:
          const unknownResult = JSON.stringify({
            success: false,
            error: `Unknown function: ${name}`,
          });
          console.log(`[DEBUG] Unknown function result: ${unknownResult}`);
          return unknownResult;
      }
    } catch (error) {
      console.error(`[ERROR] Error executing function ${name}:`, error);
      console.error(
        `[ERROR] Function execution stack:`,
        error instanceof Error ? error.stack : "No stack trace"
      );
      const errorResult = JSON.stringify({
        success: false,
        error: `Failed to execute ${name}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
      console.log(`[DEBUG] Function error result: ${errorResult}`);
      return errorResult;
    }
  }

  // Get system prompt for the AI assistant
  private getSystemPrompt(): string {
    return `You are an AI assistant for Sei AgentFi, a decentralized platform for creating and trading tokens on the Sei blockchain. 

Your role is to help users understand and interact with the platform by:
1. Providing information about tokens created on the platform
2. Explaining how the platform works
3. Answering questions about specific tokens, creators, or recent activity
4. Helping users understand token details like supply, social links, and creation info

You have access to the following tools:
- getAllTokens(): Get all tokens on the platform
- getTokensByCreator(creator): Get tokens by a specific creator address  
- getTokenByAddress(address): Get details about a specific token
- getRecentTokens(limit): Get recently created tokens

When users ask about tokens, use these tools to provide accurate, up-to-date information. Be helpful, informative, and concise in your responses. If users ask about specific addresses or want to explore tokens, use the appropriate tools to fetch the data.

Always format token information in a clear, readable way and include relevant details like names, symbols, descriptions, and social links when available.`;
  }

  // Main chat method with tool calling
  async chat(userEmail: string, message: string): Promise<string> {
    console.log(
      `[DEBUG] Starting chat for user: ${userEmail}, message: "${message}"`
    );
    try {
      await connectToMongoDB();

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
        this.MAX_CONTEXT_MESSAGES
      );
      console.log(
        `[DEBUG] Retrieved ${contextMessages.length} context messages`
      );

      // Convert to OpenAI format (exclude our timestamp field)
      const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        [
          {
            role: "system",
            content: this.getSystemPrompt(),
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
        tools: this.getTools(),
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
        console.log(
          `[DEBUG] Processing ${assistantMessage.tool_calls.length} tool calls`
        );

        // Always save assistant message with tool calls (required by OpenAI API)
        // If content is empty, use a placeholder to indicate tools are being called
        const toolCallContent =
          assistantMessage.content && assistantMessage.content.trim().length > 0
            ? assistantMessage.content
            : "Let me look that up for you...";

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
        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type === "function") {
            console.log(
              `[DEBUG] Executing tool: ${toolCall.function.name} with args:`,
              toolCall.function.arguments
            );

            const functionResult = await this.executeFunction(
              toolCall.function.name,
              JSON.parse(toolCall.function.arguments)
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

        // Get updated context and make a follow-up call for final response
        console.log(`[DEBUG] Getting updated context for final response`);
        const updatedContext = await Chat.getSlidingContext(
          userEmail,
          this.MAX_CONTEXT_MESSAGES
        );
        console.log(
          `[DEBUG] Updated context has ${updatedContext.length} messages`
        );

        const finalMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
          [
            {
              role: "system",
              content: this.getSystemPrompt(),
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
      } else {
        // No tool calls, just store and return the response
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

  // Get chat history for a user
  async getChatHistory(userEmail: string): Promise<IChatMessage[]> {
    try {
      await connectToMongoDB();
      return await Chat.getSlidingContext(userEmail, 50); // Return more for history view
    } catch (error) {
      console.error("Error getting chat history:", error);
      throw new Error("Failed to get chat history");
    }
  }

  // Clear chat history for a user
  async clearChatHistory(userEmail: string): Promise<void> {
    try {
      await connectToMongoDB();
      await Chat.clearChatHistory(userEmail);
    } catch (error) {
      console.error("Error clearing chat history:", error);
      throw new Error("Failed to clear chat history");
    }
  }

  // Clear all chat histories (useful for clearing old function_call format data)
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

export const openAIService = new OpenAIService();
