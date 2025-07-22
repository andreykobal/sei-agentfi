import { formatEther } from "viem";
import { BuyTokensCommand } from "../../application/buy-tokens.command";
import { SellTokensCommand } from "../../application/sell-tokens.command";
import {
  MarketMakerModel,
  IMarketMakerBot,
} from "../../models/market-maker.model";
import { TokenProjection } from "../../projections/token.projection";
import { WalletService } from "../wallet.service";
import { TradeDecision } from "./config";
import { scheduleNextTrade } from "./scheduling";
import {
  analyzePriceImpact,
  calculateGrowthProgress,
  adjustTradingStrategy,
} from "./analysis";

/**
 * Wait for price update after transaction with timeout
 */
async function waitForPriceUpdate(
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
 * Get random trade percentage between min and max
 */
function getRandomTradePercentage(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Get adaptive trade size based on portfolio balance
 */
function getAdaptiveTradeSize(
  bot: IMarketMakerBot,
  usdtPercentage: number,
  tokenPercentage: number
): { minPercent: number; maxPercent: number } {
  // Larger trades when severely imbalanced (>80% or <20%)
  if (usdtPercentage > 80 || usdtPercentage < 20) {
    return { minPercent: 3, maxPercent: 8 }; // 3-8% for fast rebalancing
  }

  // Medium trades when moderately imbalanced (60-80% or 20-40%)
  if (usdtPercentage > 60 || usdtPercentage < 40) {
    return { minPercent: 2, maxPercent: 5 }; // 2-5% for gradual rebalancing
  }

  // Small trades when balanced (40-60%)
  return { minPercent: 1, maxPercent: 3 }; // 1-3% for fine-tuning
}

/**
 * Make trade decision based on current balances and bot configuration
 */
function makeTradeDecision(
  bot: IMarketMakerBot,
  currentUsdtBalance: string,
  currentTokenBalance: string,
  currentTokenPrice: string
): TradeDecision {
  const budgetWei = BigInt(bot.budget);
  const currentUsdtWei = BigInt(currentUsdtBalance);
  const currentTokenWei = BigInt(currentTokenBalance);

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

  // Get adaptive trade size based on current balance
  const adaptiveSize = getAdaptiveTradeSize(
    bot,
    usdtPercentage,
    tokenPercentage
  );
  const tradePercentage = getRandomTradePercentage(
    adaptiveSize.minPercent,
    adaptiveSize.maxPercent
  );

  const tradeAmountWei =
    (budgetWei * BigInt(Math.floor(tradePercentage * 100))) / BigInt(10000);
  const buyAmount = tradeAmountWei; // Amount in USDT wei to spend on buying
  const sellAmount = tradeAmountWei; // Amount in token wei to sell

  console.log(`🧮 [MARKET MAKER] Balance analysis:`);
  console.log(`  - USDT balance: ${formatEther(currentUsdtWei)} USDT`);
  console.log(`  - Token balance: ${formatEther(currentTokenWei)} tokens`);
  console.log(
    `  - Token price: ${formatEther(currentTokenPriceWei)} USDT per token`
  );
  console.log(`  - Tokens value: ${formatEther(tokensValueInUsdt)} USDT`);
  console.log(`  - Total portfolio: ${formatEther(totalPortfolioValue)} USDT`);
  console.log(`  - USDT: ${usdtPercentage.toFixed(1)}%`);
  console.log(`  - Tokens: ${tokenPercentage.toFixed(1)}%`);
  console.log(
    `  - Trade size range: ${adaptiveSize.minPercent}-${
      adaptiveSize.maxPercent
    }% (${tradePercentage.toFixed(1)}% selected)`
  );
  console.log(`  - Buy amount: ${formatEther(buyAmount)} USDT`);
  console.log(`  - Sell amount: ${formatEther(sellAmount)} tokens`);
  console.log(
    `  - Consecutive buys: ${bot.consecutiveBuys}, sells: ${bot.consecutiveSells}`
  );

  // Forced alternation: prevent too many consecutive trades of same type
  if (
    bot.consecutiveBuys >= 5 &&
    tokenPercentage > 20 &&
    currentTokenWei >= sellAmount
  ) {
    console.log(
      `🔄 [MARKET MAKER] Forcing SELL after ${bot.consecutiveBuys} consecutive buys`
    );
    return { action: "sell", amount: sellAmount.toString() };
  }

  if (
    bot.consecutiveSells >= 3 &&
    usdtPercentage > 20 &&
    currentUsdtWei >= buyAmount
  ) {
    console.log(
      `🔄 [MARKET MAKER] Forcing BUY after ${bot.consecutiveSells} consecutive sells`
    );
    return { action: "buy", amount: buyAmount.toString() };
  }

  // Decision logic with more balanced thresholds (55%/45% instead of 70%/30%)
  if (usdtPercentage > 55) {
    // Too much USDT, prefer buying
    console.log(
      `💰 [MARKET MAKER] Too much USDT (${usdtPercentage.toFixed(
        1
      )}%), preferring BUY`
    );
    if (currentUsdtWei >= buyAmount) {
      return { action: "buy", amount: buyAmount.toString() };
    }
  } else if (usdtPercentage < 45) {
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
    // Balanced (45-55%), alternate trades with growth bias
    const shouldBuy = Math.random() < 0.6; // 60% chance to buy (growth bias)
    console.log(
      `⚖️ [MARKET MAKER] Balanced portfolio (${usdtPercentage.toFixed(
        1
      )}% USDT), random choice: ${shouldBuy ? "BUY" : "SELL"}`
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
 * Log a trade
 */
async function logTrade(
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
    await MarketMakerModel.createLog({
      botId: (bot._id as any).toString(),
      userEmail: bot.userEmail,
      tokenAddress: bot.tokenAddress,
      action: action as "buy" | "sell" | "pause" | "error" | "start" | "stop",
      amount,
      priceBefore,
      priceAfter,
      transactionHash: transactionHash || undefined,
      usdtBalanceAfter: bot.currentUsdtBalance,
      tokenBalanceAfter: bot.currentTokenBalance,
      success,
      errorMessage,
    });
  } catch (error) {
    console.error(`❌ [MARKET MAKER] Error logging trade:`, error);
  }
}

/**
 * Execute a trade for a bot
 */
export async function executeTrade(botId: string): Promise<void> {
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
    const token = await TokenProjection.getTokenByAddress(botDoc.tokenAddress);
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
      tokenBalance: formatEther(BigInt(realBalances.tokenBalance)) + " tokens",
      storedUsdtBalance:
        formatEther(BigInt(botDoc.currentUsdtBalance)) + " USDT (stored)",
      storedTokenBalance:
        formatEther(BigInt(botDoc.currentTokenBalance)) + " tokens (stored)",
    });

    // Determine trade action and size using real balances
    const tradeDecision = makeTradeDecision(
      botDoc,
      realBalances.usdtBalance,
      realBalances.tokenBalance,
      currentPrice
    );

    if (tradeDecision.action === "pause") {
      console.log(
        `⏸️ [MARKET MAKER] Bot ${botId} pausing - balanced or no funds`
      );
      await logTrade(
        botDoc,
        "pause",
        "0",
        currentPrice,
        currentPrice,
        "",
        false,
        "Pausing due to balance constraints"
      );
      await scheduleNextTrade(botId);
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
        const updatedRealBalances = await WalletService.getUsdtAndTokenBalances(
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
          consecutiveBuys: botDoc.consecutiveBuys + 1,
          consecutiveSells: 0, // Reset sell counter
          lastTradeAt: new Date(),
        });

        // Get new price after trade with timeout for indexing
        newPrice = await waitForPriceUpdate(
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
        const updatedRealBalances = await WalletService.getUsdtAndTokenBalances(
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
          consecutiveBuys: 0, // Reset buy counter
          consecutiveSells: botDoc.consecutiveSells + 1,
          lastTradeAt: new Date(),
        });

        // Get new price after trade with timeout for indexing
        newPrice = await waitForPriceUpdate(
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
    await logTrade(
      botDoc,
      tradeDecision.action,
      tradeDecision.amount,
      currentPrice,
      newPrice,
      transactionHash,
      success,
      errorMessage
    );

    if (success) {
      console.log(`🧠 [MARKET MAKER] Analyzing trade effectiveness...`);

      // Analyze price impact and growth progress
      const priceAnalysis = await analyzePriceImpact(
        tradeDecision.action,
        currentPrice,
        newPrice,
        botDoc.targetGrowthPerHour
      );

      const growthProgress = await calculateGrowthProgress(botDoc);

      // Adjust strategy based on analysis
      await adjustTradingStrategy(botId, priceAnalysis, growthProgress);

      console.log(
        `✅ [MARKET MAKER] Trade analysis completed for bot ${botId}`
      );
    }

    // Schedule next trade
    await scheduleNextTrade(botId);
  } catch (error) {
    console.error(
      `❌ [MARKET MAKER] Error executing trade for bot ${botId}:`,
      error
    );

    if (botDoc) {
      // Log error
      await logTrade(
        botDoc,
        "error",
        "0",
        "0",
        "0",
        "",
        false,
        error instanceof Error ? error.message : "Unknown error"
      );

      // Schedule next trade with delay on error
      setTimeout(() => scheduleNextTrade(botId), 30000); // 30 second delay on error
    }
  }
}
