import { formatEther } from "viem";
import {
  MarketMakerModel,
  IMarketMakerBot,
} from "../../models/market-maker.model";
import { PriceAnalysis, GrowthProgress } from "./config";

/**
 * Analyze price impact and trade effectiveness
 */
export function analyzePriceImpact(
  action: "buy" | "sell",
  priceBefore: string,
  priceAfter: string,
  expectedGrowth: number
): PriceAnalysis {
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
  let recommendation: "continue" | "adjust_up" | "adjust_down" = "continue";

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
    `📊 [PRICE ANALYSIS] Expected direction: ${expectedDirection ? "✅" : "❌"}`
  );
  console.log(
    `📊 [PRICE ANALYSIS] Effectiveness score: ${effectivenessScore.toFixed(3)}`
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
export async function calculateGrowthProgress(
  botDoc: IMarketMakerBot
): Promise<GrowthProgress> {
  try {
    // For now, use creation time as start point
    const timeSinceStart = Date.now() - botDoc.createdAt.getTime();
    const hoursSinceStart = timeSinceStart / (1000 * 60 * 60);

    // Use stored initial price from bot configuration (much more reliable!)
    const initialPrice = botDoc.initialPrice;

    // Get current price from token projection
    const token = await import("../../projections/token.projection").then(
      (module) => module.TokenProjection.getTokenByAddress(botDoc.tokenAddress)
    );
    const currentPrice = token?.price || botDoc.initialPrice;

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
    console.log(`🎯 [GROWTH ANALYSIS] On target: ${isOnTarget ? "✅" : "❌"}`);
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

    // Fallback to current price
    const currentPrice = botDoc.initialPrice;
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
export async function adjustTradingStrategy(
  botId: string,
  analysis: PriceAnalysis,
  growthProgress: GrowthProgress
): Promise<void> {
  try {
    const currentBot = await MarketMakerModel.updateBot(botId, {});
    if (!currentBot) return;

    let updates: any = {};
    let adjustmentMade = false;

    // Adjust growth bias based on effectiveness (expanded range: 0.001-0.2)
    if (
      analysis.recommendation === "adjust_up" &&
      currentBot.growthBuyBias < 0.2
    ) {
      updates.growthBuyBias = Math.min(currentBot.growthBuyBias * 1.2, 0.2); // Increase by 20%, cap at 20%
      adjustmentMade = true;
      console.log(
        `⚡ [STRATEGY ADJUST] Increasing growth bias to ${updates.growthBuyBias.toFixed(
          3
        )}`
      );
    } else if (
      analysis.recommendation === "adjust_down" &&
      currentBot.growthBuyBias > 0.001
    ) {
      updates.growthBuyBias = Math.max(currentBot.growthBuyBias * 0.8, 0.001); // Decrease by 20%, floor at 0.1%
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
        // Too slow growth - trade more frequently (expanded range: 10-300s)
        if (currentBot.minPauseBetweenTrades > 10) {
          updates.minPauseBetweenTrades = Math.max(
            currentBot.minPauseBetweenTrades - 5,
            10
          );
          updates.maxPauseBetweenTrades = Math.max(
            currentBot.maxPauseBetweenTrades - 10,
            20
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
        // Too fast growth - trade less frequently (expanded range: 10-300s)
        if (currentBot.maxPauseBetweenTrades < 300) {
          updates.minPauseBetweenTrades = Math.min(
            currentBot.minPauseBetweenTrades + 5,
            150
          );
          updates.maxPauseBetweenTrades = Math.min(
            currentBot.maxPauseBetweenTrades + 10,
            300
          );
          adjustmentMade = true;
          console.log(
            `⚡ [STRATEGY ADJUST] Decreasing trade frequency: ${updates.minPauseBetweenTrades}-${updates.maxPauseBetweenTrades}s`
          );
        }
      }
    }

    // Alternative adjustments when main parameters hit limits
    if (
      !adjustmentMade &&
      (analysis.recommendation === "adjust_down" ||
        analysis.recommendation === "adjust_up")
    ) {
      // Try alternative adjustments when main parameters are at limits
      if (analysis.recommendation === "adjust_down") {
        // If growth bias is at minimum, try increasing pause times
        if (
          currentBot.growthBuyBias <= 0.001 &&
          currentBot.maxPauseBetweenTrades < 300
        ) {
          updates.maxPauseBetweenTrades = Math.min(
            currentBot.maxPauseBetweenTrades + 20,
            300
          );
          updates.minPauseBetweenTrades = Math.min(
            currentBot.minPauseBetweenTrades + 10,
            150
          );
          adjustmentMade = true;
          console.log(
            `⚡ [STRATEGY ADJUST] Alt: Increasing pause times (bias at min): ${updates.minPauseBetweenTrades}-${updates.maxPauseBetweenTrades}s`
          );
        }
        // If both bias and pause are at limits, reduce trade size range
        else if (
          currentBot.growthBuyBias <= 0.001 &&
          currentBot.maxPauseBetweenTrades >= 300
        ) {
          console.log(
            `📊 [STRATEGY ADJUST] All down-adjustment parameters at limits`
          );
        }
      } else if (analysis.recommendation === "adjust_up") {
        // If growth bias is at maximum, try decreasing pause times
        if (
          currentBot.growthBuyBias >= 0.2 &&
          currentBot.minPauseBetweenTrades > 10
        ) {
          updates.minPauseBetweenTrades = Math.max(
            currentBot.minPauseBetweenTrades - 10,
            10
          );
          updates.maxPauseBetweenTrades = Math.max(
            currentBot.maxPauseBetweenTrades - 20,
            20
          );
          adjustmentMade = true;
          console.log(
            `⚡ [STRATEGY ADJUST] Alt: Decreasing pause times (bias at max): ${updates.minPauseBetweenTrades}-${updates.maxPauseBetweenTrades}s`
          );
        }
        // If both bias and pause are at limits
        else if (
          currentBot.growthBuyBias >= 0.2 &&
          currentBot.minPauseBetweenTrades <= 10
        ) {
          console.log(
            `📊 [STRATEGY ADJUST] All up-adjustment parameters at limits`
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
        `📊 [STRATEGY ADJUST] No adjustments possible for bot ${botId} - parameters at limits`
      );
    }
  } catch (error) {
    console.error(`❌ [STRATEGY ADJUST] Error adjusting strategy:`, error);
  }
}
