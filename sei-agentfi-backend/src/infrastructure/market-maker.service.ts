import { BuyTokensCommand } from "../application/buy-tokens.command";
import { SellTokensCommand } from "../application/sell-tokens.command";
import {
  MarketMakerModel,
  IMarketMakerBot,
} from "../models/market-maker.model";
import { TokenProjection } from "../projections/token.projection";
import { parseEther, formatEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { WalletService } from "./wallet.service";
import { UserModel } from "../models/user.model";

export interface MarketMakerConfig {
  tokenAddress: string;
  targetGrowthPerHour: number; // Growth percentage per hour (e.g., 1 = 1%)
  budget: string; // Total budget in USDT (e.g., "1000")
}

export interface BotStatus {
  isActive: boolean;
  totalTrades: number;
  totalBuyVolume: string;
  totalSellVolume: string;
  currentUsdtBalance: string;
  currentTokenBalance: string;
  lastTradeAt?: Date;
  nextTradeAt?: Date;
}

export class MarketMakerService {
  // Static properties to hold active bot timers
  private static activeBotTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Wait for price update after transaction with timeout
   */
  private static async waitForPriceUpdate(
    tokenAddress: string,
    currentPrice: string,
    timeoutMs: number = 30000 // 30 second timeout
  ): Promise<string> {
    const startTime = Date.now();
    const checkInterval = 500; // Check every 500ms

    console.log(
      `⏳ [PRICE WAIT] Waiting for price update from ${formatEther(
        BigInt(currentPrice)
      )} USDT...`
    );

    while (Date.now() - startTime < timeoutMs) {
      try {
        const token = await TokenProjection.getTokenByAddress(tokenAddress);
        const newPrice = token?.price || currentPrice;

        // Check if price has changed
        if (newPrice !== currentPrice) {
          const waitTime = Date.now() - startTime;
          console.log(
            `✅ [PRICE WAIT] Price updated to ${formatEther(
              BigInt(newPrice)
            )} USDT after ${waitTime}ms`
          );
          return newPrice;
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error(`❌ [PRICE WAIT] Error checking price:`, error);
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      }
    }

    // Timeout reached, return current price
    console.log(
      `⏰ [PRICE WAIT] Timeout reached (${timeoutMs}ms), using current price ${formatEther(
        BigInt(currentPrice)
      )} USDT`
    );
    return currentPrice;
  }

  /**
   * Analyze price impact and trade effectiveness
   */
  private static analyzePriceImpact(
    action: "buy" | "sell",
    priceBefore: string,
    priceAfter: string,
    expectedGrowth: number
  ): {
    priceChangePercent: number;
    expectedDirection: boolean;
    effectivenessScore: number;
    recommendation: "continue" | "adjust_up" | "adjust_down" | "pause";
  } {
    const priceBeforeBig = BigInt(priceBefore);
    const priceAfterBig = BigInt(priceAfter);

    // Calculate price change percentage
    const priceChange = priceAfterBig - priceBeforeBig;
    const priceChangePercent =
      Number((priceChange * BigInt(10000)) / priceBeforeBig) / 100; // Convert to percentage

    console.log(`📊 [PRICE ANALYSIS] Action: ${action}`);
    console.log(
      `📊 [PRICE ANALYSIS] Price before: ${formatEther(priceBeforeBig)} USDT`
    );
    console.log(
      `📊 [PRICE ANALYSIS] Price after: ${formatEther(priceAfterBig)} USDT`
    );
    console.log(
      `📊 [PRICE ANALYSIS] Price change: ${priceChangePercent.toFixed(4)}%`
    );

    // Check if price moved in expected direction
    const expectedDirection =
      action === "buy" ? priceChangePercent > 0 : priceChangePercent < 0;

    // Calculate effectiveness score based on price movement vs expected growth
    let effectivenessScore = 0;
    if (action === "buy" && priceChangePercent > 0) {
      // Good: price went up after buy
      effectivenessScore = Math.min(
        priceChangePercent / (expectedGrowth / 100),
        1.0
      );
    } else if (action === "sell" && priceChangePercent < 0) {
      // Good: price went down after sell (but we want overall growth)
      effectivenessScore = Math.min(
        Math.abs(priceChangePercent) / (expectedGrowth / 200),
        0.5
      ); // Sells should have less impact
    } else {
      // Unexpected direction
      effectivenessScore = -0.5;
    }

    // Generate recommendation
    let recommendation: "continue" | "adjust_up" | "adjust_down" | "pause" =
      "continue";

    if (!expectedDirection) {
      recommendation = "adjust_up"; // Need stronger buy bias
    } else if (
      action === "buy" &&
      priceChangePercent < (expectedGrowth / 100) * 0.1
    ) {
      recommendation = "adjust_up"; // Buy impact too weak
    } else if (
      action === "buy" &&
      priceChangePercent > (expectedGrowth / 100) * 0.5
    ) {
      recommendation = "adjust_down"; // Buy impact too strong, might look suspicious
    }

    console.log(
      `📊 [PRICE ANALYSIS] Expected direction: ${
        expectedDirection ? "✅" : "❌"
      }`
    );
    console.log(
      `📊 [PRICE ANALYSIS] Effectiveness score: ${effectivenessScore.toFixed(
        3
      )}`
    );
    console.log(`📊 [PRICE ANALYSIS] Recommendation: ${recommendation}`);

    return {
      priceChangePercent,
      expectedDirection,
      effectivenessScore,
      recommendation,
    };
  }

  /**
   * Calculate overall progress towards growth target
   */
  private static async calculateGrowthProgress(
    botDoc: IMarketMakerBot,
    currentPrice: string
  ): Promise<{
    totalGrowthPercent: number;
    hourlyGrowthRate: number;
    isOnTarget: boolean;
    targetPrice: string;
  }> {
    try {
      // For now, use creation time as start point
      const timeSinceStart = Date.now() - botDoc.createdAt.getTime();
      const hoursSinceStart = timeSinceStart / (1000 * 60 * 60);

      // Use stored initial price from bot configuration (much more reliable!)
      const initialPrice = botDoc.initialPrice;

      console.log(
        `🎯 [GROWTH ANALYSIS] Initial price from bot: ${formatEther(
          BigInt(initialPrice)
        )} USDT`
      );
      console.log(
        `🎯 [GROWTH ANALYSIS] Current price: ${formatEther(
          BigInt(currentPrice)
        )} USDT`
      );

      const initialPriceBig = BigInt(initialPrice || currentPrice);
      const currentPriceBig = BigInt(currentPrice);

      // Calculate total growth percentage
      const totalGrowth = currentPriceBig - initialPriceBig;
      const totalGrowthPercent =
        Number((totalGrowth * BigInt(10000)) / initialPriceBig) / 100;

      // Calculate hourly growth rate
      const hourlyGrowthRate =
        hoursSinceStart > 0 ? totalGrowthPercent / hoursSinceStart : 0;

      // Check if on target (within 20% of target)
      const isOnTarget =
        Math.abs(hourlyGrowthRate - botDoc.targetGrowthPerHour) <=
        botDoc.targetGrowthPerHour * 0.2;

      // Calculate target price
      const targetGrowthMultiplier =
        1 + (botDoc.targetGrowthPerHour * hoursSinceStart) / 100;
      const targetPrice = (
        (initialPriceBig * BigInt(Math.floor(targetGrowthMultiplier * 1000))) /
        BigInt(1000)
      ).toString();

      console.log(
        `🎯 [GROWTH ANALYSIS] Time since start: ${hoursSinceStart.toFixed(
          2
        )} hours`
      );
      console.log(
        `🎯 [GROWTH ANALYSIS] Total growth: ${totalGrowthPercent.toFixed(4)}%`
      );
      console.log(
        `🎯 [GROWTH ANALYSIS] Hourly rate: ${hourlyGrowthRate.toFixed(
          4
        )}%/h (target: ${botDoc.targetGrowthPerHour}%/h)`
      );
      console.log(
        `🎯 [GROWTH ANALYSIS] On target: ${isOnTarget ? "✅" : "❌"}`
      );
      console.log(
        `🎯 [GROWTH ANALYSIS] Target price: ${formatEther(
          BigInt(targetPrice)
        )} USDT`
      );

      return {
        totalGrowthPercent,
        hourlyGrowthRate,
        isOnTarget,
        targetPrice,
      };
    } catch (error) {
      console.error(`❌ [GROWTH ANALYSIS] Error calculating progress:`, error);
      return {
        totalGrowthPercent: 0,
        hourlyGrowthRate: 0,
        isOnTarget: true,
        targetPrice: currentPrice,
      };
    }
  }

  /**
   * Adjust trading strategy based on effectiveness analysis
   */
  private static async adjustTradingStrategy(
    botId: string,
    analysis: {
      priceChangePercent: number;
      expectedDirection: boolean;
      effectivenessScore: number;
      recommendation: "continue" | "adjust_up" | "adjust_down" | "pause";
    },
    growthProgress: {
      totalGrowthPercent: number;
      hourlyGrowthRate: number;
      isOnTarget: boolean;
      targetPrice: string;
    }
  ): Promise<void> {
    try {
      const currentBot = await MarketMakerModel.updateBot(botId, {});
      if (!currentBot) return;

      let updates: any = {};
      let adjustmentMade = false;

      // Adjust growth bias based on effectiveness
      if (
        analysis.recommendation === "adjust_up" &&
        currentBot.growthBuyBias < 0.1
      ) {
        updates.growthBuyBias = Math.min(currentBot.growthBuyBias * 1.2, 0.1); // Increase by 20%, cap at 10%
        adjustmentMade = true;
        console.log(
          `⚡ [STRATEGY ADJUST] Increasing growth bias to ${updates.growthBuyBias.toFixed(
            3
          )}`
        );
      } else if (
        analysis.recommendation === "adjust_down" &&
        currentBot.growthBuyBias > 0.005
      ) {
        updates.growthBuyBias = Math.max(currentBot.growthBuyBias * 0.8, 0.005); // Decrease by 20%, floor at 0.5%
        adjustmentMade = true;
        console.log(
          `⚡ [STRATEGY ADJUST] Decreasing growth bias to ${updates.growthBuyBias.toFixed(
            3
          )}`
        );
      }

      // Adjust trading frequency based on growth progress
      if (!growthProgress.isOnTarget) {
        if (
          growthProgress.hourlyGrowthRate <
          currentBot.targetGrowthPerHour * 0.8
        ) {
          // Too slow growth - trade more frequently
          if (currentBot.minPauseBetweenTrades > 20) {
            updates.minPauseBetweenTrades = Math.max(
              currentBot.minPauseBetweenTrades - 5,
              20
            );
            updates.maxPauseBetweenTrades = Math.max(
              currentBot.maxPauseBetweenTrades - 10,
              40
            );
            adjustmentMade = true;
            console.log(
              `⚡ [STRATEGY ADJUST] Increasing trade frequency: ${updates.minPauseBetweenTrades}-${updates.maxPauseBetweenTrades}s`
            );
          }
        } else if (
          growthProgress.hourlyGrowthRate >
          currentBot.targetGrowthPerHour * 1.2
        ) {
          // Too fast growth - trade less frequently
          if (currentBot.maxPauseBetweenTrades < 120) {
            updates.minPauseBetweenTrades = Math.min(
              currentBot.minPauseBetweenTrades + 5,
              60
            );
            updates.maxPauseBetweenTrades = Math.min(
              currentBot.maxPauseBetweenTrades + 10,
              120
            );
            adjustmentMade = true;
            console.log(
              `⚡ [STRATEGY ADJUST] Decreasing trade frequency: ${updates.minPauseBetweenTrades}-${updates.maxPauseBetweenTrades}s`
            );
          }
        }
      }

      // Apply updates if any adjustments were made
      if (adjustmentMade) {
        await MarketMakerModel.updateBot(botId, updates);
        console.log(`✅ [STRATEGY ADJUST] Strategy updated for bot ${botId}`);
      } else {
        console.log(
          `📊 [STRATEGY ADJUST] No adjustments needed for bot ${botId}`
        );
      }
    } catch (error) {
      console.error(`❌ [STRATEGY ADJUST] Error adjusting strategy:`, error);
    }
  }

  /**
   * Create and start a new market maker bot
   */
  static async createBot(
    userEmail: string,
    config: MarketMakerConfig
  ): Promise<IMarketMakerBot> {
    try {
      console.log(`🤖 [MARKET MAKER] Creating bot for user: ${userEmail}`);
      console.log(`🤖 [MARKET MAKER] Config:`, config);

      // Validate configuration
      this.validateConfig(config);

      // Check if bot already exists for this user and token
      const existingBot = await MarketMakerModel.findBotByUserAndToken(
        userEmail,
        config.tokenAddress
      );

      if (existingBot) {
        throw new Error(
          `Market maker bot already exists for token ${config.tokenAddress}`
        );
      }

      // Verify token exists
      const token = await TokenProjection.getTokenByAddress(
        config.tokenAddress
      );
      if (!token) {
        throw new Error(`Token not found: ${config.tokenAddress}`);
      }

      // Get user to access wallet and fetch real balances
      const user = await UserModel.findByEmail(userEmail);
      if (!user || !user.walletAddress) {
        throw new Error(`User not found or no wallet address: ${userEmail}`);
      }

      // Get real balances from blockchain for initial bot state
      console.log(
        `🔍 [MARKET MAKER] Fetching initial real balances from blockchain...`
      );
      const initialRealBalances = await WalletService.getUsdtAndTokenBalances(
        user.walletAddress as `0x${string}`,
        config.tokenAddress as `0x${string}`
      );

      console.log(`💰 [MARKET MAKER] Initial real balances:`, {
        usdtBalance:
          formatEther(BigInt(initialRealBalances.usdtBalance)) + " USDT",
        tokenBalance:
          formatEther(BigInt(initialRealBalances.tokenBalance)) + " tokens",
      });

      // Get initial token price
      const initialPrice = token.price || "0";
      console.log(
        `💰 [MARKET MAKER] Initial token price: ${formatEther(
          BigInt(initialPrice)
        )} USDT`
      );

      // Generate dedicated wallet for the bot
      const botPrivateKey = generatePrivateKey();
      const botAccount = privateKeyToAccount(botPrivateKey);
      console.log(
        `🔐 [MARKET MAKER] Generated dedicated wallet for bot: ${botAccount.address}`
      );

      // Convert budget to wei
      const budgetWei = parseEther(config.budget);

      // Calculate optimal parameters for ~1 minute trading intervals
      const optimalParams = this.calculateOptimalParameters(
        config.targetGrowthPerHour
      );

      // Create bot in database
      const bot = await MarketMakerModel.createBot(
        userEmail,
        config.tokenAddress,
        {
          targetGrowthPerHour: config.targetGrowthPerHour,
          budget: budgetWei.toString(),
          initialPrice: initialPrice,
          botWalletAddress: botAccount.address,
          botPrivateKey: botPrivateKey,
          minTradePercentage: optimalParams.minTradePercentage,
          maxTradePercentage: optimalParams.maxTradePercentage,
          minPauseBetweenTrades: optimalParams.minPauseBetweenTrades,
          maxPauseBetweenTrades: optimalParams.maxPauseBetweenTrades,
          growthBuyBias: optimalParams.growthBuyBias,
        }
      );

      // Transfer USDT from user wallet to bot wallet
      console.log(
        `💸 [MARKET MAKER] Transferring ${config.budget} USDT from user to bot wallet...`
      );
      try {
        const transferTxHash = await WalletService.transferUsdt(
          user.privateKey,
          botAccount.address as `0x${string}`,
          config.budget
        );
        console.log(
          `✅ [MARKET MAKER] USDT transfer successful: ${transferTxHash}`
        );
      } catch (transferError) {
        console.error(
          `❌ [MARKET MAKER] Failed to transfer USDT to bot wallet:`,
          transferError
        );

        // Clean up: delete the bot since funding failed
        await MarketMakerModel.deleteBot(userEmail, config.tokenAddress);
        console.log(`🗑️ [MARKET MAKER] Cleaned up bot due to transfer failure`);

        throw new Error(
          `Failed to transfer USDT to bot wallet: ${
            transferError instanceof Error
              ? transferError.message
              : "Unknown error"
          }`
        );
      }

      // Get real balances from bot's wallet (not user's wallet)
      const botRealBalances = await WalletService.getUsdtAndTokenBalances(
        botAccount.address as `0x${string}`,
        config.tokenAddress as `0x${string}`
      );

      // Update bot with real balances from bot's blockchain wallet
      await MarketMakerModel.updateBot((bot._id as any).toString(), {
        currentUsdtBalance: botRealBalances.usdtBalance,
        currentTokenBalance: botRealBalances.tokenBalance,
      });

      console.log(
        `✅ [MARKET MAKER] Bot created with dedicated wallet and USDT funded`
      );

      // Log bot creation
      await MarketMakerModel.createLog({
        botId: (bot._id as any).toString(),
        userEmail,
        tokenAddress: config.tokenAddress,
        action: "start",
        amount: budgetWei.toString(),
        usdtBalanceAfter: budgetWei.toString(),
        tokenBalanceAfter: "0",
        success: true,
        metadata: { config },
      });

      console.log(
        `✅ [MARKET MAKER] Bot created successfully: ${(
          bot._id as any
        ).toString()}`
      );
      return bot;
    } catch (error) {
      console.error(`❌ [MARKET MAKER] Error creating bot:`, error);
      throw error;
    }
  }

  /**
   * Start an existing bot
   */
  static async startBot(
    userEmail: string,
    tokenAddress: string
  ): Promise<void> {
    try {
      console.log(
        `🚀 [MARKET MAKER] Starting bot for ${userEmail}, token: ${tokenAddress}`
      );

      const bot = await MarketMakerModel.findBotByUserAndToken(
        userEmail,
        tokenAddress
      );
      if (!bot) {
        throw new Error("Bot not found");
      }

      if (bot.isActive) {
        throw new Error("Bot is already active");
      }

      // Update bot status to active
      await MarketMakerModel.updateBot((bot._id as any).toString(), {
        isActive: true,
        lastTradeAt: new Date(),
      });

      // Start bot execution
      await this.scheduleNextTrade((bot._id as any).toString());

      // Log bot start
      await MarketMakerModel.createLog({
        botId: (bot._id as any).toString(),
        userEmail,
        tokenAddress,
        action: "start",
        amount: "0",
        usdtBalanceAfter: bot.currentUsdtBalance,
        tokenBalanceAfter: bot.currentTokenBalance,
        success: true,
      });

      console.log(
        `✅ [MARKET MAKER] Bot started successfully: ${(
          bot._id as any
        ).toString()}`
      );
    } catch (error) {
      console.error(`❌ [MARKET MAKER] Error starting bot:`, error);
      throw error;
    }
  }

  /**
   * Stop a bot
   */
  static async stopBot(userEmail: string, tokenAddress: string): Promise<void> {
    try {
      console.log(
        `🛑 [MARKET MAKER] Stopping bot for ${userEmail}, token: ${tokenAddress}`
      );

      const bot = await MarketMakerModel.findBotByUserAndToken(
        userEmail,
        tokenAddress
      );
      if (!bot) {
        throw new Error("Bot not found");
      }

      // Clear timer if exists
      const botKey = `${userEmail}-${tokenAddress}`;
      const timer = this.activeBotTimers.get(botKey);
      if (timer) {
        clearTimeout(timer);
        this.activeBotTimers.delete(botKey);
      }

      // Update bot status to inactive
      await MarketMakerModel.updateBot((bot._id as any).toString(), {
        isActive: false,
        nextTradeAt: undefined,
      });

      // Log bot stop
      await MarketMakerModel.createLog({
        botId: (bot._id as any).toString(),
        userEmail,
        tokenAddress,
        action: "stop",
        amount: "0",
        usdtBalanceAfter: bot.currentUsdtBalance,
        tokenBalanceAfter: bot.currentTokenBalance,
        success: true,
      });

      console.log(`✅ [MARKET MAKER] Bot stopped successfully: ${bot._id}`);
    } catch (error) {
      console.error(`❌ [MARKET MAKER] Error stopping bot:`, error);
      throw error;
    }
  }

  /**
   * Delete a bot and return all funds to user
   */
  static async deleteBot(
    userEmail: string,
    tokenAddress: string
  ): Promise<void> {
    try {
      console.log(
        `🗑️ [MARKET MAKER] Deleting bot for ${userEmail}, token: ${tokenAddress}`
      );

      const bot = await MarketMakerModel.findBotByUserAndToken(
        userEmail,
        tokenAddress
      );
      if (!bot) {
        throw new Error("Bot not found");
      }

      // Stop bot first if it's running
      if (bot.isActive) {
        console.log(`🛑 [MARKET MAKER] Stopping active bot before deletion...`);
        await this.stopBot(userEmail, tokenAddress);
      }

      // Get user info for wallet address
      const user = await UserModel.findByEmail(userEmail);
      if (!user || !user.walletAddress) {
        throw new Error(`User not found or no wallet address: ${userEmail}`);
      }

      // Get real balances from bot's wallet
      console.log(
        `🔍 [MARKET MAKER] Checking bot wallet balances for refund...`
      );
      const botBalances = await WalletService.getUsdtAndTokenBalances(
        bot.botWalletAddress as `0x${string}`,
        tokenAddress as `0x${string}`
      );

      console.log(`💰 [MARKET MAKER] Bot wallet balances to refund:`, {
        usdtBalance: formatEther(BigInt(botBalances.usdtBalance)) + " USDT",
        tokenBalance: formatEther(BigInt(botBalances.tokenBalance)) + " tokens",
      });

      // Transfer USDT back to user if any
      const usdtBalance = BigInt(botBalances.usdtBalance);
      if (usdtBalance > 0) {
        console.log(
          `💸 [MARKET MAKER] Transferring ${formatEther(
            usdtBalance
          )} USDT back to user...`
        );
        try {
          const usdtTxHash = await WalletService.transferUsdt(
            bot.botPrivateKey,
            user.walletAddress as `0x${string}`,
            formatEther(usdtBalance)
          );
          console.log(
            `✅ [MARKET MAKER] USDT refund successful: ${usdtTxHash}`
          );
        } catch (usdtError) {
          console.error(`❌ [MARKET MAKER] Failed to refund USDT:`, usdtError);
          // Continue with deletion but log the error
        }
      }

      // Transfer tokens back to user if any
      const tokenBalance = BigInt(botBalances.tokenBalance);
      if (tokenBalance > 0) {
        console.log(
          `💸 [MARKET MAKER] Transferring ${formatEther(
            tokenBalance
          )} tokens back to user...`
        );
        try {
          const tokenTxHash = await WalletService.transferToken(
            bot.botPrivateKey,
            user.walletAddress as `0x${string}`,
            tokenAddress as `0x${string}`,
            formatEther(tokenBalance)
          );
          console.log(
            `✅ [MARKET MAKER] Token refund successful: ${tokenTxHash}`
          );
        } catch (tokenError) {
          console.error(
            `❌ [MARKET MAKER] Failed to refund tokens:`,
            tokenError
          );
          // Continue with deletion but log the error
        }
      }

      // Delete bot from database
      const deleted = await MarketMakerModel.deleteBot(userEmail, tokenAddress);
      if (!deleted) {
        throw new Error("Failed to delete bot from database");
      }

      // Log bot deletion
      await MarketMakerModel.createLog({
        botId: (bot._id as any).toString(),
        userEmail,
        tokenAddress,
        action: "stop", // Using "stop" as we don't have "delete" action in enum
        amount: "0",
        usdtBalanceAfter: "0", // All funds returned
        tokenBalanceAfter: "0", // All funds returned
        success: true,
        metadata: {
          action: "delete",
          fundsReturned: {
            usdtBalance: botBalances.usdtBalance,
            tokenBalance: botBalances.tokenBalance,
          },
        },
      });

      console.log(
        `✅ [MARKET MAKER] Bot deleted successfully and funds returned to user: ${bot._id}`
      );
    } catch (error) {
      console.error(`❌ [MARKET MAKER] Error deleting bot:`, error);
      throw error;
    }
  }

  /**
   * Get bot status
   */
  static async getBotStatus(
    userEmail: string,
    tokenAddress: string
  ): Promise<BotStatus | null> {
    try {
      const bot = await MarketMakerModel.findBotByUserAndToken(
        userEmail,
        tokenAddress
      );
      if (!bot) {
        return null;
      }

      // Get user to access wallet for real balances
      const user = await UserModel.findByEmail(userEmail);
      let realUsdtBalance = bot.currentUsdtBalance;
      let realTokenBalance = bot.currentTokenBalance;

      if (user && user.walletAddress) {
        // Get real balances from blockchain
        const realBalances = await WalletService.getUsdtAndTokenBalances(
          user.walletAddress as `0x${string}`,
          tokenAddress as `0x${string}`
        );
        realUsdtBalance = realBalances.usdtBalance;
        realTokenBalance = realBalances.tokenBalance;

        // Update stored balances in database with real ones
        await MarketMakerModel.updateBot((bot._id as any).toString(), {
          currentUsdtBalance: realUsdtBalance,
          currentTokenBalance: realTokenBalance,
        });
      }

      return {
        isActive: bot.isActive,
        totalTrades: bot.totalTrades,
        totalBuyVolume: bot.totalBuyVolume,
        totalSellVolume: bot.totalSellVolume,
        currentUsdtBalance: realUsdtBalance,
        currentTokenBalance: realTokenBalance,
        lastTradeAt: bot.lastTradeAt,
        nextTradeAt: bot.nextTradeAt,
      };
    } catch (error) {
      console.error(`❌ [MARKET MAKER] Error getting bot status:`, error);
      throw error;
    }
  }

  /**
   * Initialize bots on server startup
   */
  static async initializeBots(): Promise<void> {
    try {
      console.log(`🔄 [MARKET MAKER] Initializing active bots on startup...`);

      const activeBots = await MarketMakerModel.findActiveBots();
      console.log(`🔄 [MARKET MAKER] Found ${activeBots.length} active bots`);

      for (const bot of activeBots) {
        try {
          await this.scheduleNextTrade((bot._id as any).toString());
          console.log(
            `✅ [MARKET MAKER] Restarted bot: ${(bot._id as any).toString()}`
          );
        } catch (error) {
          console.error(
            `❌ [MARKET MAKER] Failed to restart bot ${(
              bot._id as any
            ).toString()}:`,
            error
          );
          // Mark bot as inactive if restart fails
          await MarketMakerModel.updateBot((bot._id as any).toString(), {
            isActive: false,
          });
        }
      }
    } catch (error) {
      console.error(`❌ [MARKET MAKER] Error initializing bots:`, error);
    }
  }

  /**
   * Schedule the next trade for a bot
   */
  private static async scheduleNextTrade(botId: string): Promise<void> {
    try {
      // Get bot by ID using a findById equivalent with updateBot
      const botDoc = await MarketMakerModel.updateBot(botId, {}); // Get bot by ID

      if (!botDoc || !botDoc.isActive) {
        return;
      }

      // Calculate random pause between trades
      const pauseSeconds = this.getRandomPause(
        botDoc.minPauseBetweenTrades,
        botDoc.maxPauseBetweenTrades
      );

      const nextTradeTime = new Date(Date.now() + pauseSeconds * 1000);

      // Update next trade time in database
      await MarketMakerModel.updateBot(botId, {
        nextTradeAt: nextTradeTime,
      });

      // Create timer for next trade
      const botKey = `${botDoc.userEmail}-${botDoc.tokenAddress}`;
      const timer = setTimeout(async () => {
        await this.executeTrade(botId);
      }, pauseSeconds * 1000);

      this.activeBotTimers.set(botKey, timer);

      console.log(
        `⏰ [MARKET MAKER] Scheduled next trade for bot ${botId} in ${pauseSeconds} seconds`
      );
    } catch (error) {
      console.error(`❌ [MARKET MAKER] Error scheduling next trade:`, error);
    }
  }

  /**
   * Execute a trade for a bot
   */
  private static async executeTrade(botId: string): Promise<void> {
    let botDoc: IMarketMakerBot | null = null;

    try {
      // Get fresh bot data
      botDoc = await MarketMakerModel.updateBot(botId, {});
      if (!botDoc || !botDoc.isActive) {
        console.log(
          `🤖 [MARKET MAKER] Bot ${botId} is not active, skipping trade`
        );
        return;
      }

      console.log(`💹 [MARKET MAKER] Executing trade for bot ${botId}`);

      // Get current token price
      const token = await TokenProjection.getTokenByAddress(
        botDoc.tokenAddress
      );
      if (!token) {
        throw new Error(`Token not found: ${botDoc.tokenAddress}`);
      }

      const currentPrice = token.price || "0";
      console.log(
        `💹 [MARKET MAKER] Current token price: ${formatEther(
          BigInt(currentPrice)
        )} USDT`
      );

      // Get real balances from bot's dedicated blockchain wallet
      console.log(
        `🔍 [MARKET MAKER] Fetching real balances from bot wallet: ${botDoc.botWalletAddress}...`
      );
      const realBalances = await WalletService.getUsdtAndTokenBalances(
        botDoc.botWalletAddress as `0x${string}`,
        botDoc.tokenAddress as `0x${string}`
      );

      console.log(`💰 [MARKET MAKER] Real balances:`, {
        usdtBalance: formatEther(BigInt(realBalances.usdtBalance)) + " USDT",
        tokenBalance:
          formatEther(BigInt(realBalances.tokenBalance)) + " tokens",
        storedUsdtBalance:
          formatEther(BigInt(botDoc.currentUsdtBalance)) + " USDT (stored)",
        storedTokenBalance:
          formatEther(BigInt(botDoc.currentTokenBalance)) + " tokens (stored)",
      });

      // Determine trade action and size using real balances
      const tradeDecision = this.makeTradeDecision(
        botDoc,
        realBalances.usdtBalance,
        realBalances.tokenBalance,
        currentPrice
      );

      if (tradeDecision.action === "pause") {
        console.log(
          `⏸️ [MARKET MAKER] Bot ${botId} pausing - balanced or no funds`
        );
        await this.logTrade(
          botDoc,
          "pause",
          "0",
          currentPrice,
          currentPrice,
          "",
          false,
          "Pausing due to balance constraints"
        );
        await this.scheduleNextTrade(botId);
        return;
      }

      // Execute the trade
      let transactionHash = "";
      let success = false;
      let errorMessage = "";
      let newPrice = currentPrice;

      if (tradeDecision.action === "buy") {
        const result = await BuyTokensCommand.executeWithWallet(
          botDoc.botWalletAddress,
          botDoc.botPrivateKey,
          {
            tokenAddress: botDoc.tokenAddress,
            usdtAmount: formatEther(BigInt(tradeDecision.amount)),
          }
        );

        success = result.success;
        transactionHash = result.transactionHash;
        errorMessage = result.error || "";

        if (success) {
          // Get real balances from bot wallet after successful trade
          const updatedRealBalances =
            await WalletService.getUsdtAndTokenBalances(
              botDoc.botWalletAddress as `0x${string}`,
              botDoc.tokenAddress as `0x${string}`
            );

          console.log(`✅ [MARKET MAKER] Updated real balances after buy:`, {
            usdtBalance:
              formatEther(BigInt(updatedRealBalances.usdtBalance)) + " USDT",
            tokenBalance:
              formatEther(BigInt(updatedRealBalances.tokenBalance)) + " tokens",
          });

          // Update bot with real balances and trade statistics
          await MarketMakerModel.updateBot(botId, {
            currentUsdtBalance: updatedRealBalances.usdtBalance,
            currentTokenBalance: updatedRealBalances.tokenBalance,
            totalTrades: botDoc.totalTrades + 1,
            totalBuyVolume: (
              BigInt(botDoc.totalBuyVolume) + BigInt(tradeDecision.amount)
            ).toString(),
            lastTradeAt: new Date(),
          });

          // Get new price after trade with timeout for indexing
          newPrice = await this.waitForPriceUpdate(
            botDoc.tokenAddress,
            currentPrice,
            30000 // 30 second timeout
          );

          // Update botDoc in memory for accurate logging
          botDoc.currentUsdtBalance = updatedRealBalances.usdtBalance;
          botDoc.currentTokenBalance = updatedRealBalances.tokenBalance;
        }
      } else if (tradeDecision.action === "sell") {
        const result = await SellTokensCommand.executeWithWallet(
          botDoc.botWalletAddress,
          botDoc.botPrivateKey,
          {
            tokenAddress: botDoc.tokenAddress,
            tokenAmount: formatEther(BigInt(tradeDecision.amount)),
          }
        );

        success = result.success;
        transactionHash = result.transactionHash;
        errorMessage = result.error || "";

        if (success) {
          // Get real balances from bot wallet after successful trade
          const updatedRealBalances =
            await WalletService.getUsdtAndTokenBalances(
              botDoc.botWalletAddress as `0x${string}`,
              botDoc.tokenAddress as `0x${string}`
            );

          console.log(`✅ [MARKET MAKER] Updated real balances after sell:`, {
            usdtBalance:
              formatEther(BigInt(updatedRealBalances.usdtBalance)) + " USDT",
            tokenBalance:
              formatEther(BigInt(updatedRealBalances.tokenBalance)) + " tokens",
          });

          // Update bot with real balances and trade statistics
          await MarketMakerModel.updateBot(botId, {
            currentUsdtBalance: updatedRealBalances.usdtBalance,
            currentTokenBalance: updatedRealBalances.tokenBalance,
            totalTrades: botDoc.totalTrades + 1,
            totalSellVolume: (
              BigInt(botDoc.totalSellVolume) + BigInt(tradeDecision.amount)
            ).toString(),
            lastTradeAt: new Date(),
          });

          // Get new price after trade with timeout for indexing
          newPrice = await this.waitForPriceUpdate(
            botDoc.tokenAddress,
            currentPrice,
            30000 // 30 second timeout
          );

          // Update botDoc in memory for accurate logging
          botDoc.currentUsdtBalance = updatedRealBalances.usdtBalance;
          botDoc.currentTokenBalance = updatedRealBalances.tokenBalance;
        }
      }

      // Log the trade
      await this.logTrade(
        botDoc,
        tradeDecision.action,
        tradeDecision.amount,
        currentPrice,
        newPrice,
        transactionHash,
        success,
        errorMessage
      );

      // Analyze trade effectiveness and adjust strategy for successful trades
      if (success) {
        try {
          console.log(`🧠 [MARKET MAKER] Analyzing trade effectiveness...`);

          // Analyze price impact
          const priceAnalysis = this.analyzePriceImpact(
            tradeDecision.action,
            currentPrice,
            newPrice,
            botDoc.targetGrowthPerHour
          );

          // Calculate overall growth progress
          const growthProgress = await this.calculateGrowthProgress(
            botDoc,
            newPrice
          );

          // Adjust strategy based on analysis
          await this.adjustTradingStrategy(
            botId,
            priceAnalysis,
            growthProgress
          );

          console.log(
            `✅ [MARKET MAKER] Trade analysis completed for bot ${botId}`
          );
        } catch (analysisError) {
          console.error(
            `❌ [MARKET MAKER] Error in trade analysis:`,
            analysisError
          );
          // Don't fail the trade execution if analysis fails
        }
      }

      // Schedule next trade if bot is still active and trade was successful
      if (success) {
        await this.scheduleNextTrade(botId);
      } else {
        console.error(
          `❌ [MARKET MAKER] Trade failed for bot ${botId}: ${errorMessage}`
        );
        // Still schedule next trade, but with a longer delay
        setTimeout(() => this.scheduleNextTrade(botId), 30000); // 30 second delay on error
      }
    } catch (error) {
      console.error(
        `❌ [MARKET MAKER] Error executing trade for bot ${botId}:`,
        error
      );

      // Log error
      if (botDoc) {
        await this.logTrade(
          botDoc,
          "error",
          "0",
          "0",
          "0",
          "",
          false,
          error instanceof Error ? error.message : "Unknown error"
        );
      }

      // Schedule next trade with delay
      setTimeout(() => this.scheduleNextTrade(botId), 60000); // 1 minute delay on error
    }
  }

  /**
   * Make trading decision based on bot state
   */
  private static makeTradeDecision(
    bot: IMarketMakerBot,
    currentUsdtBalance: string,
    currentTokenBalance: string,
    currentTokenPrice: string
  ): {
    action: "buy" | "sell" | "pause";
    amount: string; // Amount in wei
  } {
    const budgetWei = BigInt(bot.budget);
    const currentUsdtWei = BigInt(currentUsdtBalance);
    const currentTokenWei = BigInt(currentTokenBalance);

    // Calculate trade size (random between min and max percentage of budget)
    const tradePercentage = this.getRandomTradePercentage(
      bot.minTradePercentage,
      bot.maxTradePercentage
    );

    const baseTradeAmount =
      (budgetWei * BigInt(Math.floor(tradePercentage * 100))) / BigInt(10000);

    // Apply growth bias to trade amounts
    const buyAmount =
      baseTradeAmount +
      (baseTradeAmount * BigInt(Math.floor(bot.growthBuyBias * 100))) /
        BigInt(100);
    const sellAmount = baseTradeAmount;

    // Determine if we should buy or sell based on current balances
    // Calculate tokens value in USDT: (tokenBalance * tokenPrice) / 10^18
    const currentTokenPriceWei = BigInt(currentTokenPrice);
    const tokensValueInUsdt =
      (currentTokenWei * currentTokenPriceWei) / BigInt(10 ** 18);

    // Calculate total portfolio value (USDT + tokens value in USDT)
    const totalPortfolioValue = currentUsdtWei + tokensValueInUsdt;

    // Calculate actual percentages of current portfolio
    const usdtPercentage =
      totalPortfolioValue > 0
        ? Number((currentUsdtWei * BigInt(100)) / totalPortfolioValue)
        : 50; // Default to 50% if no portfolio

    const tokenPercentage = 100 - usdtPercentage;

    console.log(`🧮 [MARKET MAKER] Balance analysis:`);
    console.log(`  - USDT balance: ${formatEther(currentUsdtWei)} USDT`);
    console.log(`  - Token balance: ${formatEther(currentTokenWei)} tokens`);
    console.log(
      `  - Token price: ${formatEther(currentTokenPriceWei)} USDT per token`
    );
    console.log(`  - Tokens value: ${formatEther(tokensValueInUsdt)} USDT`);
    console.log(
      `  - Total portfolio: ${formatEther(totalPortfolioValue)} USDT`
    );
    console.log(`  - USDT: ${usdtPercentage.toFixed(1)}%`);
    console.log(`  - Tokens: ${tokenPercentage.toFixed(1)}%`);
    console.log(`  - Buy amount: ${formatEther(buyAmount)} USDT`);
    console.log(`  - Sell amount: ${formatEther(sellAmount)} tokens`);

    // Decision logic with more balanced thresholds
    if (usdtPercentage > 70) {
      // Too much USDT, prefer buying
      console.log(
        `💰 [MARKET MAKER] Too much USDT (${usdtPercentage.toFixed(
          1
        )}%), preferring BUY`
      );
      if (currentUsdtWei >= buyAmount) {
        return { action: "buy", amount: buyAmount.toString() };
      }
    } else if (usdtPercentage < 30) {
      // Too many tokens, prefer selling
      console.log(
        `🪙 [MARKET MAKER] Too many tokens (${tokenPercentage.toFixed(
          1
        )}%), preferring SELL`
      );
      if (currentTokenWei >= sellAmount) {
        return { action: "sell", amount: sellAmount.toString() };
      }
    } else {
      // Balanced, alternate trades with growth bias
      const shouldBuy = Math.random() < 0.6; // 60% chance to buy (growth bias)
      console.log(
        `⚖️ [MARKET MAKER] Balanced portfolio, random choice: ${
          shouldBuy ? "BUY" : "SELL"
        }`
      );

      if (shouldBuy && currentUsdtWei >= buyAmount) {
        return { action: "buy", amount: buyAmount.toString() };
      } else if (!shouldBuy && currentTokenWei >= sellAmount) {
        return { action: "sell", amount: sellAmount.toString() };
      }
    }

    // If we can't make the preferred trade, try the opposite
    if (currentUsdtWei >= buyAmount) {
      return { action: "buy", amount: buyAmount.toString() };
    } else if (currentTokenWei >= sellAmount) {
      return { action: "sell", amount: sellAmount.toString() };
    }

    // If neither trade is possible, pause
    return { action: "pause", amount: "0" };
  }

  /**
   * Log a trade to the database
   */
  private static async logTrade(
    bot: IMarketMakerBot,
    action: string,
    amount: string,
    priceBefore: string,
    priceAfter: string,
    transactionHash: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    try {
      const nextTradeTime = new Date(
        Date.now() +
          this.getRandomPause(
            bot.minPauseBetweenTrades,
            bot.maxPauseBetweenTrades
          ) *
            1000
      );

      await MarketMakerModel.createLog({
        botId: (bot._id as any).toString(),
        userEmail: bot.userEmail,
        tokenAddress: bot.tokenAddress,
        action,
        amount,
        priceBefore,
        priceAfter,
        transactionHash: transactionHash || undefined,
        usdtBalanceAfter: bot.currentUsdtBalance,
        tokenBalanceAfter: bot.currentTokenBalance,
        success,
        errorMessage: errorMessage || undefined,
        nextTradeScheduledAt: nextTradeTime,
        metadata: {
          tradePercentage: Number(
            (BigInt(amount || "0") * BigInt(100)) / BigInt(bot.budget)
          ),
        },
      });
    } catch (error) {
      console.error(`❌ [MARKET MAKER] Error logging trade:`, error);
    }
  }

  /**
   * Get random trade percentage between min and max
   */
  private static getRandomTradePercentage(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Get random pause between trades
   */
  private static getRandomPause(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min));
  }

  /**
   * Calculate optimal parameters for trading frequency and growth
   */
  private static calculateOptimalParameters(targetGrowthPerHour: number): {
    minTradePercentage: number;
    maxTradePercentage: number;
    minPauseBetweenTrades: number;
    maxPauseBetweenTrades: number;
    growthBuyBias: number;
  } {
    // Optimal parameters for ~1 minute trading intervals with randomness
    // Trading every 40-80 seconds gives average of 60 seconds (1 minute)
    const baseParams = {
      minTradePercentage: 1, // 1% of budget per trade
      maxTradePercentage: 3, // 3% of budget per trade
      minPauseBetweenTrades: 40, // 40 seconds minimum (60 - 20)
      maxPauseBetweenTrades: 80, // 80 seconds maximum (60 + 20)
      growthBuyBias: 0.02, // 2% buy bias for growth
    };

    // Adjust parameters based on target growth
    // Higher growth = more aggressive parameters
    if (targetGrowthPerHour > 5) {
      // Very aggressive growth (>5% per hour)
      return {
        ...baseParams,
        growthBuyBias: 0.05, // 5% buy bias
        minPauseBetweenTrades: 30, // Faster trading
        maxPauseBetweenTrades: 60,
      };
    } else if (targetGrowthPerHour > 2) {
      // Moderate growth (2-5% per hour)
      return {
        ...baseParams,
        growthBuyBias: 0.03, // 3% buy bias
        minPauseBetweenTrades: 35,
        maxPauseBetweenTrades: 70,
      };
    } else {
      // Conservative growth (0-2% per hour)
      return baseParams;
    }
  }

  /**
   * Validate bot configuration
   */
  private static validateConfig(config: MarketMakerConfig): void {
    const errors: string[] = [];

    if (
      !config.tokenAddress ||
      !config.tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)
    ) {
      errors.push("Invalid token address");
    }

    if (config.targetGrowthPerHour < 0 || config.targetGrowthPerHour > 100) {
      errors.push("Target growth per hour must be between 0 and 100");
    }

    if (!config.budget || parseFloat(config.budget) <= 0) {
      errors.push("Budget must be a positive number");
    }

    if (parseFloat(config.budget) > 100000) {
      errors.push("Budget too large (max 100,000 USDT)");
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(", ")}`);
    }
  }

  /**
   * Clean up all bot timers (for shutdown)
   */
  static cleanup(): void {
    console.log(
      `🧹 [MARKET MAKER] Cleaning up ${this.activeBotTimers.size} active bot timers`
    );

    for (const [key, timer] of this.activeBotTimers) {
      clearTimeout(timer);
    }

    this.activeBotTimers.clear();
  }
}
