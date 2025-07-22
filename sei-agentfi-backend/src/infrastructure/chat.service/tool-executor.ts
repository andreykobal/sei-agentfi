import { TokenProjection } from "../../projections/token.projection";
import { User } from "../../models/user.model";
import {
  CreateTokenCommand,
  type CreateTokenParams,
} from "../../application/create-token.command";
import {
  BuyTokensCommand,
  type BuyTokensParams,
} from "../../application/buy-tokens.command";
import {
  SellTokensCommand,
  type SellTokensParams,
} from "../../application/sell-tokens.command";
import { WalletService } from "../wallet.service";
import { PLATFORM_KNOWLEDGE_BASE } from "../knowledge-base.util";
import { formatTokenFinancials, weiToEth } from "./helpers";
import { MarketMakerService } from "../market-maker.service";
import { MarketMakerModel } from "../../models/market-maker.model";

/**
 * Execute tool functions
 */
export async function executeFunction(
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
            formatTokenFinancials({
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
            formatTokenFinancials({
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
          token: formatTokenFinancials({
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
            formatTokenFinancials({
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
          const explorerLink = `https://testnet.seistream.app/transactions/${createResult.transactionHash}`;
          return JSON.stringify({
            success: true,
            message: "Token created successfully!",
            transactionHash: createResult.transactionHash,
            explorerLink: explorerLink,
            tokenAddress: createResult.tokenAddress,
            tokenData: tokenParams,
          });
        } else {
          const response: any = {
            success: false,
            error: createResult.error || "Token creation failed",
          };
          // Include explorer link if transaction hash is available even on failure
          if (createResult.transactionHash) {
            response.transactionHash = createResult.transactionHash;
            response.explorerLink = `https://testnet.seistream.app/transactions/${createResult.transactionHash}`;
          }
          return JSON.stringify(response);
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

          // Get basic balances using WalletService
          const balances = await WalletService.getUserBalances(
            user.walletAddress as `0x${string}`
          );

          // Get all token balances
          const tokenBalances = await WalletService.getAllTokenBalances(
            user.walletAddress as `0x${string}`
          );

          // Format balances from wei to ETH/tokens
          // All tokens in our platform use 18 decimals, so we always divide by 10^18
          const formattedBalances = {
            ethBalance: weiToEth(balances.ethBalance).toFixed(6),
            usdtBalance: weiToEth(balances.usdtBalance).toFixed(2),
          };

          // Format token balances - Always use 18 decimals since all platform tokens are 18 decimals
          const formattedTokenBalances = tokenBalances.map((token) => ({
            tokenAddress: token.tokenAddress,
            name: token.name,
            symbol: token.symbol,
            balance: weiToEth(token.balance).toFixed(6), // Use weiToEth for consistency
            decimals: token.decimals,
          }));

          console.log(`[DEBUG] User balances retrieved:`, {
            ...formattedBalances,
            tokenCount: formattedTokenBalances.length,
          });

          return JSON.stringify({
            success: true,
            balances: formattedBalances,
            tokenBalances: formattedTokenBalances,
            walletAddress: user.walletAddress,
            message: `Retrieved balances for ${formattedTokenBalances.length} tokens with non-zero balances`,
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
            const explorerLink = `https://testnet.seistream.app/transactions/${buyResult.transactionHash}`;
            return JSON.stringify({
              success: true,
              message: `Tokens purchased successfully! Transaction hash: ${buyResult.transactionHash}`,
              transactionHash: buyResult.transactionHash,
              explorerLink: explorerLink,
              tokenAddress,
              tokenData: tokenData,
              usdtAmount: args.usdtAmount,
            });
          } else {
            const response: any = {
              success: false,
              error: buyResult.error || "Failed to purchase tokens",
              tokenAddress,
              tokenData: tokenData,
              usdtAmount: args.usdtAmount,
            };
            // Include explorer link if transaction hash is available even on failure
            if (buyResult.transactionHash) {
              response.transactionHash = buyResult.transactionHash;
              response.explorerLink = `https://testnet.seistream.app/transactions/${buyResult.transactionHash}`;
            }
            return JSON.stringify(response);
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
            const explorerLink = `https://testnet.seistream.app/transactions/${sellResult.transactionHash}`;
            return JSON.stringify({
              success: true,
              message: `Tokens sold successfully! Transaction hash: ${sellResult.transactionHash}`,
              transactionHash: sellResult.transactionHash,
              explorerLink: explorerLink,
              tokenAddress,
              tokenData: tokenData,
              tokenAmount: args.tokenAmount,
            });
          } else {
            const response: any = {
              success: false,
              error: sellResult.error || "Failed to sell tokens",
              tokenAddress,
              tokenData: tokenData,
              tokenAmount: args.tokenAmount,
            };
            // Include explorer link if transaction hash is available even on failure
            if (sellResult.transactionHash) {
              response.transactionHash = sellResult.transactionHash;
              response.explorerLink = `https://testnet.seistream.app/transactions/${sellResult.transactionHash}`;
            }
            return JSON.stringify(response);
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

      case "getTokenHolders":
        console.log(`[DEBUG] Getting token holders`);

        try {
          // Determine token address to get holders for
          const tokenAddress = args.tokenAddress || currentTokenAddress;
          if (!tokenAddress) {
            return JSON.stringify({
              success: false,
              error:
                "Token address is required to get holders. Either provide tokenAddress parameter or use this function in a token context.",
            });
          }

          console.log(`[DEBUG] Getting holders for token:`, tokenAddress);

          // Get holders using TokenProjection
          const holders = await TokenProjection.getTokenHolders(tokenAddress);

          if (holders === null) {
            return JSON.stringify({
              success: false,
              error: "Token not found",
              tokenAddress,
            });
          }

          console.log(`[DEBUG] Holders retrieved:`, holders.length);

          return JSON.stringify({
            success: true,
            holders,
            tokenAddress,
            count: holders.length,
          });
        } catch (error) {
          console.error(`[ERROR] Error getting token holders:`, error);
          return JSON.stringify({
            success: false,
            error: "Failed to retrieve token holders",
          });
        }

      case "getTokenTransactions":
        console.log(`[DEBUG] Getting token transactions`);

        try {
          // Determine token address to get transactions for
          const tokenAddress = args.tokenAddress || currentTokenAddress;
          if (!tokenAddress) {
            return JSON.stringify({
              success: false,
              error:
                "Token address is required to get transactions. Either provide tokenAddress parameter or use this function in a token context.",
            });
          }

          const limit = Math.min(args.limit || 50, 100); // Cap at 100
          console.log(
            `[DEBUG] Getting transactions for token: ${tokenAddress}, limit: ${limit}`
          );

          // Get transactions using TokenProjection
          const transactions = await TokenProjection.getRecentTransactions(
            tokenAddress,
            limit
          );

          // Format transactions with wei to human-readable conversion
          const formattedTransactions = transactions.map((tx) => ({
            ...tx,
            amountInFormatted:
              tx.type === "buy"
                ? weiToEth(tx.amountIn).toFixed(2) + " USDT"
                : weiToEth(tx.amountIn).toFixed(6) + " tokens",
            amountOutFormatted:
              tx.type === "buy"
                ? weiToEth(tx.amountOut).toFixed(6) + " tokens"
                : weiToEth(tx.amountOut).toFixed(2) + " USDT",
          }));

          console.log(`[DEBUG] Transactions retrieved:`, transactions.length);

          return JSON.stringify({
            success: true,
            transactions: formattedTransactions,
            tokenAddress,
            count: transactions.length,
          });
        } catch (error) {
          console.error(`[ERROR] Error getting token transactions:`, error);
          return JSON.stringify({
            success: false,
            error: "Failed to retrieve token transactions",
          });
        }

      case "getPlatformKnowledge":
        console.log(`[DEBUG] Getting full platform knowledge base`);

        try {
          return JSON.stringify({
            success: true,
            knowledge: PLATFORM_KNOWLEDGE_BASE,
          });
        } catch (error) {
          console.error(`[ERROR] Error getting platform knowledge:`, error);
          return JSON.stringify({
            success: false,
            error: "Failed to retrieve platform knowledge",
          });
        }

      case "createMarketMakerBot":
        if (!userEmail) {
          return JSON.stringify({
            success: false,
            error: "User email is required to create market maker bot",
          });
        }

        console.log(`[DEBUG] Creating market maker bot for user: ${userEmail}`);
        console.log(`[DEBUG] Bot parameters:`, args);

        try {
          // Validate required parameters
          const { tokenAddress, targetGrowthPerHour, budget } = args;

          if (!tokenAddress || !targetGrowthPerHour || !budget) {
            return JSON.stringify({
              success: false,
              error:
                "Missing required parameters: tokenAddress, targetGrowthPerHour, and budget are all required",
            });
          }

          // Validate numeric values
          if (
            typeof targetGrowthPerHour !== "number" ||
            targetGrowthPerHour <= 0
          ) {
            return JSON.stringify({
              success: false,
              error: "targetGrowthPerHour must be a positive number",
            });
          }

          // Validate budget
          const budgetFloat = parseFloat(budget);
          if (isNaN(budgetFloat) || budgetFloat <= 0) {
            return JSON.stringify({
              success: false,
              error: "Budget must be a positive number",
            });
          }

          // Create the bot
          const bot = await MarketMakerService.createBot(userEmail, {
            tokenAddress: tokenAddress.trim(),
            targetGrowthPerHour,
            budget: budget.trim(),
          });

          console.log(
            `[DEBUG] Market maker bot created successfully: ${(
              bot._id as any
            ).toString()}`
          );

          return JSON.stringify({
            success: true,
            message: "Market maker bot created successfully",
            bot: {
              botId: (bot._id as any).toString(),
              tokenAddress: bot.tokenAddress,
              targetGrowthPerHour: bot.targetGrowthPerHour,
              budget: bot.budget,
              isActive: bot.isActive,
              createdAt: bot.createdAt,
            },
          });
        } catch (error) {
          console.error(`[ERROR] Error creating market maker bot:`, error);
          return JSON.stringify({
            success: false,
            error: `Failed to create market maker bot: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }

      case "startMarketMakerBot":
        if (!userEmail) {
          return JSON.stringify({
            success: false,
            error: "User email is required to start market maker bot",
          });
        }

        console.log(`[DEBUG] Starting market maker bot for user: ${userEmail}`);

        try {
          const tokenAddress = args.tokenAddress;
          if (!tokenAddress) {
            return JSON.stringify({
              success: false,
              error: "Token address is required to start bot",
            });
          }

          await MarketMakerService.startBot(userEmail, tokenAddress);

          console.log(`[DEBUG] Market maker bot started successfully`);

          return JSON.stringify({
            success: true,
            message: "Market maker bot started successfully",
          });
        } catch (error) {
          console.error(`[ERROR] Error starting market maker bot:`, error);
          return JSON.stringify({
            success: false,
            error: `Failed to start market maker bot: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }

      case "stopMarketMakerBot":
        if (!userEmail) {
          return JSON.stringify({
            success: false,
            error: "User email is required to stop market maker bot",
          });
        }

        console.log(`[DEBUG] Stopping market maker bot for user: ${userEmail}`);

        try {
          const tokenAddress = args.tokenAddress;
          if (!tokenAddress) {
            return JSON.stringify({
              success: false,
              error: "Token address is required to stop bot",
            });
          }

          await MarketMakerService.stopBot(userEmail, tokenAddress);

          console.log(`[DEBUG] Market maker bot stopped successfully`);

          return JSON.stringify({
            success: true,
            message: "Market maker bot stopped successfully",
          });
        } catch (error) {
          console.error(`[ERROR] Error stopping market maker bot:`, error);
          return JSON.stringify({
            success: false,
            error: `Failed to stop market maker bot: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }

      case "deleteMarketMakerBot":
        if (!userEmail) {
          return JSON.stringify({
            success: false,
            error: "User email is required to delete market maker bot",
          });
        }

        console.log(`[DEBUG] Deleting market maker bot for user: ${userEmail}`);

        try {
          const tokenAddress = args.tokenAddress;
          if (!tokenAddress) {
            return JSON.stringify({
              success: false,
              error: "Token address is required to delete bot",
            });
          }

          await MarketMakerService.deleteBot(userEmail, tokenAddress);

          console.log(`[DEBUG] Market maker bot deleted successfully`);

          return JSON.stringify({
            success: true,
            message:
              "Market maker bot deleted successfully. All funds have been returned to your wallet.",
          });
        } catch (error) {
          console.error(`[ERROR] Error deleting market maker bot:`, error);
          return JSON.stringify({
            success: false,
            error: `Failed to delete market maker bot: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }

      case "getMarketMakerBotStatus":
        if (!userEmail) {
          return JSON.stringify({
            success: false,
            error: "User email is required to get market maker bot status",
          });
        }

        console.log(
          `[DEBUG] Getting market maker bot status for user: ${userEmail}`
        );

        try {
          // Determine token address to get status for
          const tokenAddress = args.tokenAddress || currentTokenAddress;
          if (!tokenAddress) {
            return JSON.stringify({
              success: false,
              error:
                "Token address is required to get bot status. Either provide tokenAddress parameter or use this function in a token context.",
            });
          }

          const status = await MarketMakerService.getBotStatus(
            userEmail,
            tokenAddress
          );

          if (!status) {
            return JSON.stringify({
              success: false,
              error: "Market maker bot not found for this token",
            });
          }

          console.log(`[DEBUG] Market maker bot status retrieved successfully`);

          return JSON.stringify({
            success: true,
            status: {
              tokenAddress,
              isActive: status.isActive,
              totalTrades: status.totalTrades,
              totalBuyVolume:
                weiToEth(status.totalBuyVolume).toFixed(2) + " USDT",
              totalSellVolume:
                weiToEth(status.totalSellVolume).toFixed(6) + " tokens",
              currentUsdtBalance:
                weiToEth(status.currentUsdtBalance).toFixed(2) + " USDT",
              currentTokenBalance:
                weiToEth(status.currentTokenBalance).toFixed(6) + " tokens",
              lastTradeAt: status.lastTradeAt,
              nextTradeAt: status.nextTradeAt,
            },
          });
        } catch (error) {
          console.error(
            `[ERROR] Error getting market maker bot status:`,
            error
          );
          return JSON.stringify({
            success: false,
            error: `Failed to get market maker bot status: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }

      case "getUserMarketMakerBots":
        if (!userEmail) {
          return JSON.stringify({
            success: false,
            error: "User email is required to get user's market maker bots",
          });
        }

        console.log(
          `[DEBUG] Getting all market maker bots for user: ${userEmail}`
        );

        try {
          const bots = await MarketMakerModel.findUserBots(userEmail);

          console.log(
            `[DEBUG] Found ${bots.length} market maker bots for user`
          );

          const formattedBots = bots.map((bot) => ({
            botId: (bot._id as any).toString(),
            tokenAddress: bot.tokenAddress,
            targetGrowthPerHour: bot.targetGrowthPerHour,
            budget: weiToEth(bot.budget).toFixed(2) + " USDT",
            isActive: bot.isActive,
            totalTrades: bot.totalTrades,
            totalBuyVolume: weiToEth(bot.totalBuyVolume).toFixed(2) + " USDT",
            totalSellVolume:
              weiToEth(bot.totalSellVolume).toFixed(6) + " tokens",
            currentUsdtBalance:
              weiToEth(bot.currentUsdtBalance).toFixed(2) + " USDT",
            currentTokenBalance:
              weiToEth(bot.currentTokenBalance).toFixed(6) + " tokens",
            lastTradeAt: bot.lastTradeAt,
            nextTradeAt: bot.nextTradeAt,
            createdAt: bot.createdAt,
          }));

          return JSON.stringify({
            success: true,
            bots: formattedBots,
            count: formattedBots.length,
          });
        } catch (error) {
          console.error(
            `[ERROR] Error getting user's market maker bots:`,
            error
          );
          return JSON.stringify({
            success: false,
            error: `Failed to get user's market maker bots: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }

      case "getMarketMakerBotLogs":
        if (!userEmail) {
          return JSON.stringify({
            success: false,
            error: "User email is required to get market maker bot logs",
          });
        }

        console.log(
          `[DEBUG] Getting market maker bot logs for user: ${userEmail}`
        );

        try {
          // Determine token address to get logs for
          const tokenAddress = args.tokenAddress || currentTokenAddress;
          if (!tokenAddress) {
            return JSON.stringify({
              success: false,
              error:
                "Token address is required to get bot logs. Either provide tokenAddress parameter or use this function in a token context.",
            });
          }

          const limit = Math.min(args.limit || 50, 100); // Cap at 100

          const logs = await MarketMakerModel.getUserLogs(
            userEmail,
            tokenAddress,
            limit
          );

          console.log(`[DEBUG] Found ${logs.length} logs for market maker bot`);

          const formattedLogs = logs.map((log) => ({
            action: log.action,
            amount:
              log.amount === "0"
                ? "N/A"
                : log.action === "buy"
                ? weiToEth(log.amount).toFixed(2) + " USDT"
                : log.action === "sell"
                ? weiToEth(log.amount).toFixed(6) + " tokens"
                : log.amount,
            priceBefore:
              log.priceBefore === "0"
                ? "N/A"
                : weiToEth(log.priceBefore).toFixed(6) + " USDT",
            priceAfter:
              log.priceAfter === "0"
                ? "N/A"
                : weiToEth(log.priceAfter).toFixed(6) + " USDT",
            transactionHash: log.transactionHash,
            success: log.success,
            errorMessage: log.errorMessage,
            timestamp: log.timestamp,
            nextTradeScheduledAt: log.nextTradeScheduledAt,
          }));

          return JSON.stringify({
            success: true,
            logs: formattedLogs,
            tokenAddress,
            count: formattedLogs.length,
          });
        } catch (error) {
          console.error(`[ERROR] Error getting market maker bot logs:`, error);
          return JSON.stringify({
            success: false,
            error: `Failed to get market maker bot logs: ${
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
