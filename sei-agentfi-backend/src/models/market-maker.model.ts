import mongoose, { Schema, Document } from "mongoose";

export interface IMarketMakerBot extends Document {
  userEmail: string;
  tokenAddress: string;

  // Bot configuration
  targetGrowthPerHour: number; // Growth percentage per hour (e.g., 1 = 1%)
  budget: string; // Total budget in USDT (as wei string)

  // Bot state
  isActive: boolean;

  // Bot's dedicated wallet
  botWalletAddress: string; // Dedicated wallet address for this bot
  botPrivateKey: string; // Private key for bot's wallet (encrypted in production)

  // Price tracking
  initialPrice: string; // Initial token price when bot was created (wei)

  // Current balances tracked by bot
  currentUsdtBalance: string; // Current USDT available for trading (wei)
  currentTokenBalance: string; // Current token balance (wei)

  // Trade configuration
  minTradePercentage: number; // Min trade size as % of budget (e.g., 1 = 1%)
  maxTradePercentage: number; // Max trade size as % of budget (e.g., 3 = 3%)
  minPauseBetweenTrades: number; // Min pause in seconds
  maxPauseBetweenTrades: number; // Max pause in seconds

  // Strategy settings
  growthBuyBias: number; // How much buy exceeds sell for growth (e.g., 0.02 = 2%)

  // Statistics
  totalTrades: number;
  totalBuyVolume: string; // Total USDT spent on buys (wei)
  totalSellVolume: string; // Total USDT received from sells (wei)

  // Last activity tracking
  lastTradeAt: Date;
  nextTradeAt: Date;

  // State management
  createdAt: Date;
  updatedAt: Date;
}

export interface IMarketMakerLog extends Document {
  botId: string; // Reference to MarketMakerBot
  userEmail: string;
  tokenAddress: string;

  // Trade details
  action: "buy" | "sell" | "pause" | "error" | "start" | "stop";
  amount: string; // Trade amount in respective currency (wei)

  // Price tracking
  priceBefore: string; // Token price before action (wei)
  priceAfter: string; // Token price after action (wei)

  // Transaction details
  transactionHash?: string;

  // Balances after trade
  usdtBalanceAfter: string; // USDT balance after trade (wei)
  tokenBalanceAfter: string; // Token balance after trade (wei)

  // Status and error tracking
  success: boolean;
  errorMessage?: string;

  // Timing
  timestamp: Date;
  nextTradeScheduledAt?: Date;

  // Additional context
  metadata?: any;
}

const marketMakerBotSchema = new Schema<IMarketMakerBot>(
  {
    userEmail: { type: String, required: true, index: true },
    tokenAddress: { type: String, required: true, index: true },

    // Bot configuration
    targetGrowthPerHour: { type: Number, required: true, min: 0, max: 100 },
    budget: { type: String, required: true },

    // Bot state
    isActive: { type: Boolean, required: true, default: false },

    // Bot's dedicated wallet
    botWalletAddress: { type: String, required: true },
    botPrivateKey: { type: String, required: true },

    // Price tracking
    initialPrice: { type: String, required: true },

    // Current balances
    currentUsdtBalance: { type: String, required: true, default: "0" },
    currentTokenBalance: { type: String, required: true, default: "0" },

    // Trade configuration
    minTradePercentage: {
      type: Number,
      required: true,
      default: 1,
      min: 0.1,
      max: 10,
    },
    maxTradePercentage: {
      type: Number,
      required: true,
      default: 3,
      min: 0.1,
      max: 10,
    },
    minPauseBetweenTrades: { type: Number, required: true, default: 2, min: 1 },
    maxPauseBetweenTrades: {
      type: Number,
      required: true,
      default: 10,
      max: 300,
    },

    // Strategy settings
    growthBuyBias: {
      type: Number,
      required: true,
      default: 0.02,
      min: 0,
      max: 0.1,
    },

    // Statistics
    totalTrades: { type: Number, required: true, default: 0 },
    totalBuyVolume: { type: String, required: true, default: "0" },
    totalSellVolume: { type: String, required: true, default: "0" },

    // Timing
    lastTradeAt: { type: Date, required: false },
    nextTradeAt: { type: Date, required: false },
  },
  {
    timestamps: true,
  }
);

const marketMakerLogSchema = new Schema<IMarketMakerLog>(
  {
    botId: { type: String, required: true, index: true },
    userEmail: { type: String, required: true, index: true },
    tokenAddress: { type: String, required: true, index: true },

    // Trade details
    action: {
      type: String,
      required: true,
      enum: ["buy", "sell", "pause", "error", "start", "stop"],
      index: true,
    },
    amount: { type: String, required: true },

    // Price tracking
    priceBefore: { type: String, required: false },
    priceAfter: { type: String, required: false },

    // Transaction details
    transactionHash: { type: String, required: false },

    // Balances
    usdtBalanceAfter: { type: String, required: true },
    tokenBalanceAfter: { type: String, required: true },

    // Status
    success: { type: Boolean, required: true },
    errorMessage: { type: String, required: false },

    // Timing
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    nextTradeScheduledAt: { type: Date, required: false },

    // Metadata
    metadata: { type: Schema.Types.Mixed, required: false },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
marketMakerBotSchema.index({ userEmail: 1, tokenAddress: 1 }, { unique: true });
marketMakerLogSchema.index({ botId: 1, timestamp: -1 });
marketMakerLogSchema.index({ userEmail: 1, tokenAddress: 1, timestamp: -1 });

export const MarketMakerBot = mongoose.model<IMarketMakerBot>(
  "MarketMakerBot",
  marketMakerBotSchema
);
export const MarketMakerLog = mongoose.model<IMarketMakerLog>(
  "MarketMakerLog",
  marketMakerLogSchema
);

export class MarketMakerModel {
  // Bot management
  static async createBot(
    userEmail: string,
    tokenAddress: string,
    config: {
      targetGrowthPerHour: number;
      budget: string;
      initialPrice: string;
      botWalletAddress: string;
      botPrivateKey: string;
      minTradePercentage?: number;
      maxTradePercentage?: number;
      minPauseBetweenTrades?: number;
      maxPauseBetweenTrades?: number;
      growthBuyBias?: number;
    }
  ): Promise<IMarketMakerBot> {
    const bot = new MarketMakerBot({
      userEmail,
      tokenAddress,
      targetGrowthPerHour: config.targetGrowthPerHour,
      budget: config.budget,
      initialPrice: config.initialPrice,
      botWalletAddress: config.botWalletAddress,
      botPrivateKey: config.botPrivateKey,
      currentUsdtBalance: config.budget, // Start with full budget in USDT
      minTradePercentage: config.minTradePercentage || 1,
      maxTradePercentage: config.maxTradePercentage || 3,
      minPauseBetweenTrades: config.minPauseBetweenTrades || 2,
      maxPauseBetweenTrades: config.maxPauseBetweenTrades || 10,
      growthBuyBias: config.growthBuyBias || 0.02,
    });
    return await bot.save();
  }

  static async findBotByUserAndToken(
    userEmail: string,
    tokenAddress: string
  ): Promise<IMarketMakerBot | null> {
    return await MarketMakerBot.findOne({ userEmail, tokenAddress });
  }

  static async findActiveBots(): Promise<IMarketMakerBot[]> {
    return await MarketMakerBot.find({ isActive: true });
  }

  static async findUserBots(userEmail: string): Promise<IMarketMakerBot[]> {
    return await MarketMakerBot.find({ userEmail }).sort({ createdAt: -1 });
  }

  static async updateBot(
    botId: string,
    updateData: Partial<IMarketMakerBot>
  ): Promise<IMarketMakerBot | null> {
    return await MarketMakerBot.findByIdAndUpdate(
      botId,
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  static async deleteBot(
    userEmail: string,
    tokenAddress: string
  ): Promise<boolean> {
    const result = await MarketMakerBot.deleteOne({ userEmail, tokenAddress });
    return result.deletedCount > 0;
  }

  // Log management
  static async createLog(logData: {
    botId: string;
    userEmail: string;
    tokenAddress: string;
    action: string;
    amount: string;
    priceBefore?: string;
    priceAfter?: string;
    transactionHash?: string;
    usdtBalanceAfter: string;
    tokenBalanceAfter: string;
    success: boolean;
    errorMessage?: string;
    nextTradeScheduledAt?: Date;
    metadata?: any;
  }): Promise<IMarketMakerLog> {
    const log = new MarketMakerLog({
      ...logData,
      timestamp: new Date(),
    });
    return await log.save();
  }

  static async getBotLogs(
    botId: string,
    limit: number = 100
  ): Promise<IMarketMakerLog[]> {
    return await MarketMakerLog.find({ botId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  static async getUserLogs(
    userEmail: string,
    tokenAddress?: string,
    limit: number = 100
  ): Promise<IMarketMakerLog[]> {
    const query: any = { userEmail };
    if (tokenAddress) {
      query.tokenAddress = tokenAddress;
    }

    return await MarketMakerLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  static async getRecentLogs(
    userEmail: string,
    tokenAddress: string,
    hours: number = 24
  ): Promise<IMarketMakerLog[]> {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await MarketMakerLog.find({
      userEmail,
      tokenAddress,
      timestamp: { $gte: since },
    }).sort({ timestamp: -1 });
  }
}
