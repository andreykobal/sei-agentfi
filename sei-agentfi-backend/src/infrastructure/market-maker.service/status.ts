import { MarketMakerModel } from "../../models/market-maker.model";
import { WalletService } from "../wallet.service";
import { BotStatus } from "./config";

/**
 * Get bot status
 */
export async function getBotStatus(
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

    // Get real balances from bot's dedicated wallet (not user's wallet)
    let realUsdtBalance = bot.currentUsdtBalance;
    let realTokenBalance = bot.currentTokenBalance;

    // Get real balances from bot's blockchain wallet
    const realBalances = await WalletService.getUsdtAndTokenBalances(
      bot.botWalletAddress as `0x${string}`,
      tokenAddress as `0x${string}`
    );
    realUsdtBalance = realBalances.usdtBalance;
    realTokenBalance = realBalances.tokenBalance;

    // Update stored balances in database with real ones
    await MarketMakerModel.updateBot((bot._id as any).toString(), {
      currentUsdtBalance: realUsdtBalance,
      currentTokenBalance: realTokenBalance,
    });

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
