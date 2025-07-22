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

export interface OptimalParameters {
  minTradePercentage: number;
  maxTradePercentage: number;
  minPauseBetweenTrades: number;
  maxPauseBetweenTrades: number;
  growthBuyBias: number;
}

export interface TradeDecision {
  action: "buy" | "sell" | "pause";
  amount: string; // Amount in wei
}

export interface PriceAnalysis {
  priceChangePercent: number;
  expectedDirection: boolean;
  effectivenessScore: number;
  recommendation: "continue" | "adjust_up" | "adjust_down";
}

export interface GrowthProgress {
  totalGrowthPercent: number;
  hourlyGrowthRate: number;
  isOnTarget: boolean;
  targetPrice: string;
}

/**
 * Calculate optimal parameters for trading frequency and growth
 */
export function calculateOptimalParameters(
  targetGrowthPerHour: number
): OptimalParameters {
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
export function validateConfig(config: MarketMakerConfig): void {
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
