import { MarketMakerModel } from "../../models/market-maker.model";
import { executeTrade } from "./trading";

// Static properties to hold active bot timers
const activeBotTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Get random pause between trades
 */
function getRandomPause(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

/**
 * Schedule the next trade for a bot
 */
export async function scheduleNextTrade(botId: string): Promise<void> {
  try {
    // Get bot by ID using a findById equivalent with updateBot
    const botDoc = await MarketMakerModel.updateBot(botId, {}); // Get bot by ID

    if (!botDoc || !botDoc.isActive) {
      return;
    }

    // Calculate random pause between trades
    const pauseSeconds = getRandomPause(
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
      await executeTrade(botId);
    }, pauseSeconds * 1000);

    activeBotTimers.set(botKey, timer);

    console.log(
      `⏰ [MARKET MAKER] Scheduled next trade for bot ${botId} in ${pauseSeconds} seconds`
    );
  } catch (error) {
    console.error(`❌ [MARKET MAKER] Error scheduling next trade:`, error);
  }
}

/**
 * Stop timer for a specific bot
 */
export function stopBotTimer(userEmail: string, tokenAddress: string): void {
  const botKey = `${userEmail}-${tokenAddress}`;
  const timer = activeBotTimers.get(botKey);
  if (timer) {
    clearTimeout(timer);
    activeBotTimers.delete(botKey);
    console.log(`⏰ [MARKET MAKER] Cleared timer for bot: ${botKey}`);
  }
}

/**
 * Initialize bots on server startup
 */
export async function initializeBots(): Promise<void> {
  try {
    console.log(`🔄 [MARKET MAKER] Initializing active bots on startup...`);

    const activeBots = await MarketMakerModel.findActiveBots();
    console.log(`🔄 [MARKET MAKER] Found ${activeBots.length} active bots`);

    for (const bot of activeBots) {
      try {
        await scheduleNextTrade((bot._id as any).toString());
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
 * Clean up all bot timers (for shutdown)
 */
export function cleanup(): void {
  console.log(
    `🧹 [MARKET MAKER] Cleaning up ${activeBotTimers.size} active bot timers`
  );

  for (const [key, timer] of activeBotTimers) {
    clearTimeout(timer);
  }

  activeBotTimers.clear();
}
