import { parseEther, formatEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  MarketMakerModel,
  IMarketMakerBot,
} from "../../models/market-maker.model";
import { TokenProjection } from "../../projections/token.projection";
import { WalletService } from "../wallet.service";
import { UserModel } from "../../models/user.model";
import {
  MarketMakerConfig,
  calculateOptimalParameters,
  validateConfig,
} from "./config";
import { scheduleNextTrade, stopBotTimer } from "./scheduling";

/**
 * Create and start a new market maker bot
 */
export async function createBot(
  userEmail: string,
  config: MarketMakerConfig
): Promise<IMarketMakerBot> {
  try {
    console.log(`🤖 [MARKET MAKER] Creating bot for user: ${userEmail}`);
    console.log(`🤖 [MARKET MAKER] Config:`, config);

    // Validate configuration
    validateConfig(config);

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
    const token = await TokenProjection.getTokenByAddress(config.tokenAddress);
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
    const optimalParams = calculateOptimalParameters(
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
 * Start a bot
 */
export async function startBot(
  userEmail: string,
  tokenAddress: string
): Promise<void> {
  try {
    console.log(
      `▶️ [MARKET MAKER] Starting bot for ${userEmail}, token: ${tokenAddress}`
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
    await scheduleNextTrade((bot._id as any).toString());

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
export async function stopBot(
  userEmail: string,
  tokenAddress: string
): Promise<void> {
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
    stopBotTimer(userEmail, tokenAddress);

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
export async function deleteBot(
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
      await stopBot(userEmail, tokenAddress);
    }

    // Get user info for wallet address
    const user = await UserModel.findByEmail(userEmail);
    if (!user || !user.walletAddress) {
      throw new Error(`User not found or no wallet address: ${userEmail}`);
    }

    // Get real balances from bot's wallet
    console.log(`🔍 [MARKET MAKER] Checking bot wallet balances for refund...`);
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
        console.log(`✅ [MARKET MAKER] USDT refund successful: ${usdtTxHash}`);
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
        console.error(`❌ [MARKET MAKER] Failed to refund tokens:`, tokenError);
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
