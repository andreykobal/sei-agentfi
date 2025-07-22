import { OpenAITool } from "./types";

/**
 * Define available tools/functions for OpenAI
 */
export function getTools(): OpenAITool[] {
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
          "Get the user's complete balance information including SEI (ETH), USDT, and all token balances from tokens created on the platform. Only returns tokens with non-zero balances. Requires the user to be authenticated and have a wallet address.",
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
    {
      type: "function",
      function: {
        name: "getTokenHolders",
        description:
          "Get the top token holders for a specific token, showing their wallet addresses, token balances, and percentage of total supply. If no token address is provided, uses the current token context if available.",
        parameters: {
          type: "object",
          properties: {
            tokenAddress: {
              type: "string",
              description:
                "The contract address of the token to get holders for (optional if current token context is available)",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getTokenTransactions",
        description:
          "Get recent transaction history (buys and sells) for a specific token. Shows who bought/sold, amounts, and timestamps. If no token address is provided, uses the current token context if available.",
        parameters: {
          type: "object",
          properties: {
            tokenAddress: {
              type: "string",
              description:
                "The contract address of the token to get transactions for (optional if current token context is available)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of transactions to return (default: 50, max: 100)",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getPlatformKnowledge",
        description:
          "Get comprehensive information about the SEI AgentFi platform including its mission, features, technology stack, and how it works. Use this when users ask about the platform, what AgentFi is, how it works, or want to learn more about the project. Use the returned information to craft a helpful, concise response tailored to the user's specific question.",
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
        name: "createMarketMakerBot",
        description:
          "Create a new market maker bot (also called autonomous agent, liquidity automation bot, or trading bot) for a specific token. The bot will automatically buy and sell tokens to create liquidity and promote growth. Only call this after collecting all required information from the user.",
        parameters: {
          type: "object",
          properties: {
            tokenAddress: {
              type: "string",
              description:
                "The contract address of the token to create a bot for",
            },
            targetGrowthPerHour: {
              type: "number",
              description:
                "Target growth percentage per hour (e.g., 1 for 1% growth per hour). Typical range: 0.5-5%",
            },
            budget: {
              type: "string",
              description:
                "Total budget in USDT for the bot to use (e.g., '100' for 100 USDT)",
            },
          },
          required: ["tokenAddress", "targetGrowthPerHour", "budget"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "startMarketMakerBot",
        description:
          "Start a market maker bot that has been created but is not currently running. This will begin the automated trading process.",
        parameters: {
          type: "object",
          properties: {
            tokenAddress: {
              type: "string",
              description:
                "The contract address of the token for the bot to start",
            },
          },
          required: ["tokenAddress"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "stopMarketMakerBot",
        description:
          "Stop a running market maker bot. This will pause the automated trading but keep the bot and its funds intact.",
        parameters: {
          type: "object",
          properties: {
            tokenAddress: {
              type: "string",
              description:
                "The contract address of the token for the bot to stop",
            },
          },
          required: ["tokenAddress"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "deleteMarketMakerBot",
        description:
          "Delete a market maker bot completely and return all remaining funds to the user's wallet. This action cannot be undone.",
        parameters: {
          type: "object",
          properties: {
            tokenAddress: {
              type: "string",
              description:
                "The contract address of the token for the bot to delete",
            },
          },
          required: ["tokenAddress"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getMarketMakerBotStatus",
        description:
          "Get detailed status information for a specific market maker bot including trading activity, balances, and performance metrics.",
        parameters: {
          type: "object",
          properties: {
            tokenAddress: {
              type: "string",
              description:
                "The contract address of the token for the bot to get status for (optional if current token context is available)",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "getUserMarketMakerBots",
        description:
          "Get a list of all market maker bots created by the user, including their status, performance metrics, and configuration.",
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
        name: "getMarketMakerBotLogs",
        description:
          "Get trading logs and activity history for a specific market maker bot, showing recent trades and actions.",
        parameters: {
          type: "object",
          properties: {
            tokenAddress: {
              type: "string",
              description:
                "The contract address of the token for the bot to get logs for (optional if current token context is available)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of log entries to return (default: 50, max: 100)",
            },
          },
          required: [],
        },
      },
    },
  ];
}
