import OpenAI from "openai";
import { OPENAI_API_KEY } from "../config/env.config";
import { TokenProjection } from "../read/token.projection";
import { Chat, IChatMessage } from "../models/chat.model";
import { User } from "../models/user.model";
import { connectToMongoDB } from "../config/database";
import {
  CreateTokenCommand,
  type CreateTokenParams,
} from "../commands/create-token.command";
import {
  BuyTokensCommand,
  type BuyTokensParams,
} from "../commands/buy-tokens.command";
import {
  SellTokensCommand,
  type SellTokensParams,
} from "../commands/sell-tokens.command";
import { WalletService } from "./wallet.service";

class OpenAIService {
  private openai: OpenAI;
  private readonly MAX_CONTEXT_MESSAGES = 20; // Sliding window size

  constructor() {
    this.openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });
  }

  // Helper function to format wei values to ETH with appropriate decimals
  private formatTokenFinancials(token: any) {
    const weiToEth = (weiValue: string): number => {
      if (!weiValue || weiValue === "0") return 0;
      return parseFloat(weiValue) / Math.pow(10, 18);
    };

    return {
      ...token,
      price: weiToEth(token.price || "0").toFixed(6),
      marketCap: weiToEth(token.marketCap || "0").toFixed(2),
      totalUsdtRaised: weiToEth(token.totalUsdtRaised || "0").toFixed(2),
      volume24hBuy: weiToEth(token.volume24hBuy || "0").toFixed(2),
      volume24hSell: weiToEth(token.volume24hSell || "0").toFixed(2),
      volume24hTotal: weiToEth(token.volume24hTotal || "0").toFixed(2),
    };
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
      {
        type: "function",
        function: {
          name: "collectTokenCreationData",
          description:
            "Collect structured data for creating a new token. Use this when the user wants to create a token and you need to gather all the required information.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "The name of the token (max 50 characters)",
              },
              symbol: {
                type: "string",
                description:
                  "The ticker symbol for the token (max 10 characters, uppercase)",
              },
              description: {
                type: "string",
                description:
                  "Description of the token and its purpose (max 500 characters)",
              },
              image: {
                type: "string",
                description: "URL for the token's image/logo (optional)",
              },
              website: {
                type: "string",
                description: "Official website URL (optional)",
              },
              twitter: {
                type: "string",
                description: "Twitter/X profile URL (optional)",
              },
              telegram: {
                type: "string",
                description: "Telegram group/channel URL (optional)",
              },
              discord: {
                type: "string",
                description: "Discord server URL (optional)",
              },
            },
            required: ["name", "symbol", "description"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "createToken",
          description:
            "Create a new token on the Sei AgentFi platform using the bonding curve contract. Only call this after collecting all required token data.",
          parameters: {
            type: "object",
            properties: {
              tokenData: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "The name of the token",
                  },
                  symbol: {
                    type: "string",
                    description: "The ticker symbol for the token",
                  },
                  description: {
                    type: "string",
                    description: "Description of the token",
                  },
                  image: {
                    type: "string",
                    description: "URL for the token's image/logo",
                  },
                  website: {
                    type: "string",
                    description: "Official website URL",
                  },
                  twitter: {
                    type: "string",
                    description: "Twitter/X profile URL",
                  },
                  telegram: {
                    type: "string",
                    description: "Telegram group/channel URL",
                  },
                  discord: {
                    type: "string",
                    description: "Discord server URL",
                  },
                },
                required: ["name", "symbol", "description"],
              },
            },
            required: ["tokenData"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getUserBalances",
          description:
            "Get the user's ETH and USDT balances. Requires the user to be authenticated and have a wallet address.",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getUserTokenBalance",
          description:
            "Get the user's balance for a specific token. If no token address is provided, uses the current token context if available.",
          parameters: {
            type: "object",
            properties: {
              tokenAddress: {
                type: "string",
                description:
                  "The contract address of the token to check balance for (optional if current token context is available)",
              },
            },
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "buyTokens",
          description:
            "Execute a buy transaction for tokens using USDT. The user must specify how much USDT they want to spend (in human-readable format, not wei). Only call this after confirming the user wants to proceed with the purchase.",
          parameters: {
            type: "object",
            properties: {
              tokenAddress: {
                type: "string",
                description:
                  "The contract address of the token to buy (optional if current token context is available)",
              },
              usdtAmount: {
                type: "string",
                description:
                  "The amount of USDT to spend on buying tokens (in human-readable format, e.g., '10.5' for 10.5 USDT)",
              },
            },
            required: ["usdtAmount"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "sellTokens",
          description:
            "Execute a sell transaction for tokens to receive USDT. The user must specify how many tokens they want to sell (in human-readable format, not wei). Only call this after confirming the user wants to proceed with the sale.",
          parameters: {
            type: "object",
            properties: {
              tokenAddress: {
                type: "string",
                description:
                  "The contract address of the token to sell (optional if current token context is available)",
              },
              tokenAmount: {
                type: "string",
                description:
                  "The amount of tokens to sell (in human-readable format, e.g., '100.5' for 100.5 tokens)",
              },
            },
            required: ["tokenAmount"],
          },
        },
      },
    ];
  }

  // Execute tool functions
  private async executeFunction(
    name: string,
    args: any,
    userEmail?: string,
    currentTokenAddress?: string
  ): Promise<string> {
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
            tokens: limitedTokens.map((token) =>
              this.formatTokenFinancials({
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
                price: token.price,
                marketCap: token.marketCap,
                totalUsdtRaised: token.totalUsdtRaised,
                volume24hBuy: token.volume24hBuy,
                volume24hSell: token.volume24hSell,
                volume24hTotal: token.volume24hTotal,
                timestamp: token.timestamp,
                blockNumber: token.blockNumber,
                createdAt: token.createdAt,
              })
            ),
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
            tokens: creatorTokens.map((token) =>
              this.formatTokenFinancials({
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
                price: token.price,
                marketCap: token.marketCap,
                totalUsdtRaised: token.totalUsdtRaised,
                volume24hBuy: token.volume24hBuy,
                volume24hSell: token.volume24hSell,
                volume24hTotal: token.volume24hTotal,
                timestamp: token.timestamp,
                blockNumber: token.blockNumber,
                createdAt: token.createdAt,
              })
            ),
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
            token: this.formatTokenFinancials({
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
              price: token.price,
              marketCap: token.marketCap,
              totalUsdtRaised: token.totalUsdtRaised,
              volume24hBuy: token.volume24hBuy,
              volume24hSell: token.volume24hSell,
              volume24hTotal: token.volume24hTotal,
              timestamp: token.timestamp,
              blockNumber: token.blockNumber,
              createdAt: token.createdAt,
            }),
          });

        case "getRecentTokens":
          const limit = args.limit || 10;
          const recentTokens = await TokenProjection.getRecentTokens(limit);
          return JSON.stringify({
            success: true,
            count: recentTokens.length,
            tokens: recentTokens.map((token) =>
              this.formatTokenFinancials({
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
                price: token.price,
                marketCap: token.marketCap,
                totalUsdtRaised: token.totalUsdtRaised,
                volume24hBuy: token.volume24hBuy,
                volume24hSell: token.volume24hSell,
                volume24hTotal: token.volume24hTotal,
                timestamp: token.timestamp,
                blockNumber: token.blockNumber,
                createdAt: token.createdAt,
              })
            ),
          });

        case "collectTokenCreationData":
          // This is a structured data collection tool - just return the collected data
          return JSON.stringify({
            success: true,
            message: "Token data collected successfully",
            tokenData: {
              name: args.name,
              symbol: args.symbol?.toUpperCase(),
              description: args.description,
              image: args.image || "",
              website: args.website || "",
              twitter: args.twitter || "",
              telegram: args.telegram || "",
              discord: args.discord || "",
            },
          });

        case "createToken":
          if (!userEmail) {
            return JSON.stringify({
              success: false,
              error: "User email is required for token creation",
            });
          }

          console.log(`[DEBUG] Creating token for user: ${userEmail}`);
          console.log(`[DEBUG] Token data:`, args.tokenData);

          // Prepare token creation parameters
          const tokenParams: CreateTokenParams = {
            name: args.tokenData.name.trim(),
            symbol: args.tokenData.symbol.trim().toUpperCase(),
            description: args.tokenData.description.trim(),
            image: args.tokenData.image?.trim() || "",
            website: args.tokenData.website?.trim() || "",
            twitter: args.tokenData.twitter?.trim() || "",
            telegram: args.tokenData.telegram?.trim() || "",
            discord: args.tokenData.discord?.trim() || "",
          };

          // Execute token creation command
          const createResult = await CreateTokenCommand.execute(
            userEmail,
            tokenParams
          );

          if (createResult.success) {
            return JSON.stringify({
              success: true,
              message: "Token created successfully!",
              transactionHash: createResult.transactionHash,
              tokenAddress: createResult.tokenAddress,
              tokenData: tokenParams,
            });
          } else {
            return JSON.stringify({
              success: false,
              error: createResult.error || "Token creation failed",
            });
          }

        case "getUserBalances":
          if (!userEmail) {
            return JSON.stringify({
              success: false,
              error: "User email is required to get balances",
            });
          }

          console.log(`[DEBUG] Getting balances for user: ${userEmail}`);

          try {
            // Get user from database
            const user = await User.findOne({ email: userEmail });
            if (!user || !user.walletAddress) {
              return JSON.stringify({
                success: false,
                error: "User not found or no wallet address associated",
              });
            }

            // Get balances using WalletService
            const balances = await WalletService.getUserBalances(
              user.walletAddress as `0x${string}`
            );

            // Format balances from wei to ETH
            const weiToEth = (weiValue: string): number => {
              if (!weiValue || weiValue === "0") return 0;
              return parseFloat(weiValue) / Math.pow(10, 18);
            };

            const formattedBalances = {
              ethBalance: weiToEth(balances.ethBalance).toFixed(6),
              usdtBalance: weiToEth(balances.usdtBalance).toFixed(2),
            };

            console.log(`[DEBUG] User balances retrieved:`, formattedBalances);

            return JSON.stringify({
              success: true,
              balances: formattedBalances,
              walletAddress: user.walletAddress,
            });
          } catch (error) {
            console.error(`[ERROR] Error getting user balances:`, error);
            return JSON.stringify({
              success: false,
              error: "Failed to retrieve user balances",
            });
          }

        case "getUserTokenBalance":
          if (!userEmail) {
            return JSON.stringify({
              success: false,
              error: "User email is required to get token balance",
            });
          }

          console.log(`[DEBUG] Getting token balance for user: ${userEmail}`);

          try {
            // Get user from database
            const user = await User.findOne({ email: userEmail });
            if (!user || !user.walletAddress) {
              return JSON.stringify({
                success: false,
                error: "User not found or no wallet address associated",
              });
            }

            // Determine token address to check
            const tokenAddress = args.tokenAddress || currentTokenAddress;
            if (!tokenAddress) {
              return JSON.stringify({
                success: false,
                error:
                  "Token address is required. Either provide tokenAddress parameter or use this function in a token context.",
              });
            }

            console.log(`[DEBUG] Checking token balance for:`, {
              userWallet: user.walletAddress,
              tokenAddress,
            });

            // Get token balance using WalletService
            const tokenBalance = await WalletService.getTokenBalance(
              user.walletAddress as `0x${string}`,
              tokenAddress as `0x${string}`
            );

            // Format balance from wei to ETH
            const weiToEth = (weiValue: string): number => {
              if (!weiValue || weiValue === "0") return 0;
              return parseFloat(weiValue) / Math.pow(10, 18);
            };

            const formattedBalance = weiToEth(tokenBalance).toFixed(6);

            console.log(`[DEBUG] User token balance retrieved:`, {
              tokenAddress,
              balance: formattedBalance,
            });

            return JSON.stringify({
              success: true,
              tokenBalance: formattedBalance,
              tokenAddress,
              walletAddress: user.walletAddress,
            });
          } catch (error) {
            console.error(`[ERROR] Error getting user token balance:`, error);
            return JSON.stringify({
              success: false,
              error: "Failed to retrieve user token balance",
            });
          }

        case "buyTokens":
          if (!userEmail) {
            return JSON.stringify({
              success: false,
              error: "User email is required to buy tokens",
            });
          }

          console.log(`[DEBUG] Buying tokens for user: ${userEmail}`);
          console.log(`[DEBUG] Buy parameters:`, args);

          try {
            // Get user from database
            const user = await User.findOne({ email: userEmail });
            if (!user || !user.walletAddress) {
              return JSON.stringify({
                success: false,
                error: "User not found or no wallet address associated",
              });
            }

            // Determine token address to buy
            const tokenAddress = args.tokenAddress || currentTokenAddress;
            if (!tokenAddress) {
              return JSON.stringify({
                success: false,
                error:
                  "Token address is required to buy tokens. Either provide tokenAddress parameter or use this function in a token context.",
              });
            }

            // Get token details to get price
            const tokenData = await TokenProjection.getTokenByAddress(
              tokenAddress
            );
            if (!tokenData) {
              return JSON.stringify({
                success: false,
                error: "Token not found",
                tokenAddress,
              });
            }

            // Validate USDT amount (keep in human-readable format)
            const usdtAmountFloat = parseFloat(args.usdtAmount);
            if (isNaN(usdtAmountFloat) || usdtAmountFloat <= 0) {
              return JSON.stringify({
                success: false,
                error: "Invalid USDT amount specified.",
              });
            }

            console.log(
              `[DEBUG] Attempting to buy ${args.usdtAmount} USDT worth of tokens for token: ${tokenData.name}`
            );

            // Prepare buy tokens parameters (command handles wei conversion internally)
            const buyParams: BuyTokensParams = {
              tokenAddress: tokenAddress,
              usdtAmount: args.usdtAmount, // Keep in human-readable format
            };

            // Execute buy transaction using BuyTokensCommand
            const buyResult = await BuyTokensCommand.execute(
              userEmail,
              buyParams
            );

            if (buyResult.success) {
              return JSON.stringify({
                success: true,
                message: `Tokens purchased successfully! Transaction hash: ${buyResult.transactionHash}`,
                transactionHash: buyResult.transactionHash,
                tokenAddress,
                tokenData: tokenData,
                usdtAmount: args.usdtAmount,
              });
            } else {
              return JSON.stringify({
                success: false,
                error: buyResult.error || "Failed to purchase tokens",
                transactionHash: buyResult.transactionHash,
                tokenAddress,
                tokenData: tokenData,
                usdtAmount: args.usdtAmount,
              });
            }
          } catch (error) {
            console.error(`[ERROR] Error buying tokens:`, error);
            return JSON.stringify({
              success: false,
              error: `Failed to purchase tokens: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            });
          }

        case "sellTokens":
          if (!userEmail) {
            return JSON.stringify({
              success: false,
              error: "User email is required to sell tokens",
            });
          }

          console.log(`[DEBUG] Selling tokens for user: ${userEmail}`);
          console.log(`[DEBUG] Sell parameters:`, args);

          try {
            // Get user from database
            const user = await User.findOne({ email: userEmail });
            if (!user || !user.walletAddress) {
              return JSON.stringify({
                success: false,
                error: "User not found or no wallet address associated",
              });
            }

            // Determine token address to sell
            const tokenAddress = args.tokenAddress || currentTokenAddress;
            if (!tokenAddress) {
              return JSON.stringify({
                success: false,
                error:
                  "Token address is required to sell tokens. Either provide tokenAddress parameter or use this function in a token context.",
              });
            }

            // Get token details to get price
            const tokenData = await TokenProjection.getTokenByAddress(
              tokenAddress
            );
            if (!tokenData) {
              return JSON.stringify({
                success: false,
                error: "Token not found",
                tokenAddress,
              });
            }

            // Validate token amount (keep in human-readable format)
            const tokenAmountFloat = parseFloat(args.tokenAmount);
            if (isNaN(tokenAmountFloat) || tokenAmountFloat <= 0) {
              return JSON.stringify({
                success: false,
                error: "Invalid token amount specified.",
              });
            }

            console.log(
              `[DEBUG] Attempting to sell ${args.tokenAmount} tokens for token: ${tokenData.name}`
            );

            // Prepare sell tokens parameters (command handles wei conversion)
            const sellParams: SellTokensParams = {
              tokenAddress: tokenAddress,
              tokenAmount: args.tokenAmount, // Keep in human-readable format
            };

            // Execute sell transaction using SellTokensCommand
            const sellResult = await SellTokensCommand.execute(
              userEmail,
              sellParams
            );

            if (sellResult.success) {
              return JSON.stringify({
                success: true,
                message: `Tokens sold successfully! Transaction hash: ${sellResult.transactionHash}`,
                transactionHash: sellResult.transactionHash,
                tokenAddress,
                tokenData: tokenData,
                tokenAmount: args.tokenAmount,
              });
            } else {
              return JSON.stringify({
                success: false,
                error: sellResult.error || "Failed to sell tokens",
                transactionHash: sellResult.transactionHash,
                tokenAddress,
                tokenData: tokenData,
                tokenAmount: args.tokenAmount,
              });
            }
          } catch (error) {
            console.error(`[ERROR] Error selling tokens:`, error);
            return JSON.stringify({
              success: false,
              error: `Failed to sell tokens: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            });
          }

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
  private getSystemPrompt(
    currentTokenAddress?: string,
    currentTokenData?: any
  ): string {
    let basePrompt = `You are an AI assistant for Sei AgentFi, a decentralized platform for creating and trading tokens on the Sei blockchain. 

Your role is to help users understand and interact with the platform by:
1. Providing information about tokens created on the platform
2. Explaining how the platform works
3. Answering questions about specific tokens, creators, or recent activity
4. Helping users understand token details like supply, social links, and creation info
5. **Assisting users with creating new tokens on the platform**
6. **Assisting users with buying and selling tokens on the platform**

**Token Creation Process:**
When a user wants to create a token, follow this process:
1. Ask them for the required token information (name, symbol, description)
2. Ask for optional information (image URL, website, social links)
3. Use the "collectTokenCreationData" tool to structure their responses
4. Once you have all the information, use the "createToken" tool to create the token
5. Inform them about the transaction and provide the transaction hash

**Required Token Information:**
- **Name**: The full name of the token (max 50 characters)
- **Symbol/Ticker**: Short identifier (max 10 characters, will be uppercased)
- **Description**: What the token is for and its purpose (max 500 characters)

**Optional Token Information:**
- **Image**: URL to token logo/image
- **Website**: Official website URL
- **Twitter**: Twitter/X profile URL  
- **Telegram**: Telegram group or channel URL
- **Discord**: Discord server URL

**Token Trading Process:**
When a user wants to buy tokens:
1. Check their USDT balance using getUserBalances()
2. Inform them of their available USDT balance
3. Ask how much USDT they want to spend
4. Once confirmed, use buyTokens() tool to execute the purchase
5. Provide transaction hash and confirmation

When a user wants to sell tokens:
1. Check their token balance using getUserTokenBalance()
2. Inform them of their available token balance
3. Ask how many tokens they want to sell
4. Once confirmed, use sellTokens() tool to execute the sale
5. Provide transaction hash and confirmation

**Important Trading Notes:**
- Always check balances before trading
- Confirm amounts with users before executing trades
- Use human-readable amounts (not wei) when asking users for input
- The tools will automatically convert to wei for blockchain transactions
- Always provide transaction hashes after successful trades

You have access to the following tools:
- getAllTokens(): Get all tokens on the platform
- getTokensByCreator(creator): Get tokens by a specific creator address  
- getTokenByAddress(address): Get details about a specific token
- getRecentTokens(limit): Get recently created tokens
- collectTokenCreationData(...): Collect structured token creation data
- createToken(tokenData): Create a new token on the platform
- getUserBalances(): Get the user's ETH and USDT balances (requires authentication)
- getUserTokenBalance(tokenAddress): Get the user's balance for a specific token (uses current token context if no address provided)
- buyTokens(tokenAddress, usdtAmount): Execute a buy transaction for tokens using USDT.
- sellTokens(tokenAddress, tokenAmount): Execute a sell transaction for tokens to receive USDT.

When users ask about tokens, use these tools to provide accurate, up-to-date information. When they want to create tokens, guide them through the process step by step. When users ask about their balances or how many tokens they own, use the balance tools to get real-time data. Be helpful, informative, and clear in your responses.

**Important Balance Display Instructions:**
- When referring to ETH balance from getUserBalances(), always call it "SEI balance" instead of "ETH balance" since this platform runs on the Sei blockchain
- Display SEI balance as "SEI" not "ETH"
- USDT balance should still be called "USDT balance"

Always format token information in a clear, readable way and include relevant details like names, symbols, descriptions, and social links when available.`;

    // Add current token context if available
    if (currentTokenAddress && currentTokenData) {
      basePrompt += `

**CURRENT CONTEXT:**
The user is currently viewing the token page for: ${currentTokenData.name} (${
        currentTokenData.symbol
      })
Token Address: ${currentTokenAddress}
${
  currentTokenData.description
    ? `Description: ${currentTokenData.description}`
    : ""
}

When users ask questions like "what is this token?", "tell me about this token", "what's the market cap?", etc., they are referring to this specific token. Use the getTokenByAddress tool with address "${currentTokenAddress}" to get the most up-to-date information about this token.`;
    } else if (currentTokenAddress) {
      basePrompt += `

**CURRENT CONTEXT:**
The user is currently viewing a token page for token address: ${currentTokenAddress}

When users ask questions like "what is this token?", "tell me about this token", "what's the market cap?", etc., they are referring to this specific token. Use the getTokenByAddress tool with address "${currentTokenAddress}" to get the most up-to-date information about this token.`;
    }

    return basePrompt;
  }

  // Main chat method with tool calling
  async chat(
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
      let currentTokenData = null;
      if (currentTokenAddress) {
        try {
          currentTokenData = await TokenProjection.getTokenByAddress(
            currentTokenAddress
          );
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
            content: this.getSystemPrompt(
              currentTokenAddress,
              currentTokenData
            ),
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
        for (const toolCall of assistantMessage.tool_calls) {
          if (toolCall.type === "function") {
            console.log(
              `[DEBUG] Executing tool: ${toolCall.function.name} with args:`,
              toolCall.function.arguments
            );

            const functionResult = await this.executeFunction(
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
              content: this.getSystemPrompt(
                currentTokenAddress,
                currentTokenData
              ),
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
