import {
  IToken,
  TokenCreatedEvent,
  Token,
  ITokenPurchase,
  TokenPurchaseEvent,
  TokenPurchase,
  ITokenSale,
  TokenSaleEvent,
  TokenSale,
} from "../models/token.model";

export class TokenProjection {
  // Cleanup function to clear all collections on server startup
  static async cleanupCollections(): Promise<void> {
    try {
      console.log("Cleaning up MongoDB collections...");

      // Clear all tokens
      const tokensDeleted = await Token.deleteMany({});
      console.log(`Deleted ${tokensDeleted.deletedCount} tokens`);

      // Clear all token purchases
      const purchasesDeleted = await TokenPurchase.deleteMany({});
      console.log(`Deleted ${purchasesDeleted.deletedCount} token purchases`);

      // Clear all token sales
      const salesDeleted = await TokenSale.deleteMany({});
      console.log(`Deleted ${salesDeleted.deletedCount} token sales`);

      console.log("MongoDB collections cleanup completed successfully");
    } catch (error) {
      console.error("Error cleaning up MongoDB collections:", error);
      throw error;
    }
  }

  // Helper function to calculate 24h volume for a token
  private static async calculate24hVolume(tokenAddress: string): Promise<{
    buyVolume: string;
    sellVolume: string;
    totalVolume: string;
  }> {
    try {
      // Calculate timestamp for 24 hours ago
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const twentyFourHoursAgoTimestamp = (
        twentyFourHoursAgo / 1000
      ).toString(); // Convert to seconds as string

      // Get all purchases in the last 24h (fetch raw documents)
      const purchases = await TokenPurchase.find({
        tokenAddress: tokenAddress,
        timestamp: { $gte: twentyFourHoursAgoTimestamp },
      }).lean();

      // Get all sales in the last 24h (fetch raw documents)
      const sales = await TokenSale.find({
        tokenAddress: tokenAddress,
        timestamp: { $gte: twentyFourHoursAgoTimestamp },
      }).lean();

      // Calculate buy volume (sum of amountIn from purchases - USDT spent)
      let buyVolumeSum = BigInt(0);
      for (const purchase of purchases) {
        try {
          buyVolumeSum += BigInt(purchase.amountIn);
        } catch (error) {
          console.error(
            `Error parsing purchase amountIn: ${purchase.amountIn}`,
            error
          );
        }
      }

      // Calculate sell volume (sum of amountOut from sales - USDT received)
      let sellVolumeSum = BigInt(0);
      for (const sale of sales) {
        try {
          sellVolumeSum += BigInt(sale.amountOut);
        } catch (error) {
          console.error(
            `Error parsing sale amountOut: ${sale.amountOut}`,
            error
          );
        }
      }

      const buyVolume = buyVolumeSum.toString();
      const sellVolume = sellVolumeSum.toString();
      const totalVolume = (buyVolumeSum + sellVolumeSum).toString();

      return {
        buyVolume,
        sellVolume,
        totalVolume,
      };
    } catch (error) {
      console.error("Error calculating 24h volume:", error);
      return {
        buyVolume: "0",
        sellVolume: "0",
        totalVolume: "0",
      };
    }
  }

  static async handleTokenCreated(event: TokenCreatedEvent): Promise<void> {
    try {
      const tokenData = {
        eventId: event.id,
        tokenAddress: event.tokenAddress,
        creator: event.creator,
        name: event.name,
        symbol: event.symbol,
        decimals: event.decimals,
        description: event.description,
        image: event.image,
        website: event.website,
        twitter: event.twitter,
        telegram: event.telegram,
        discord: event.discord,
        timestamp: event.timestamp.toString(),
        blockNumber: event.blockNumber.toString(),
        totalUsdtRaised: "0",
        volume24hBuy: "0",
        volume24hSell: "0",
        volume24hTotal: "0",
      };

      // Upsert token by tokenAddress (replace if exists)
      await Token.findOneAndUpdate(
        { tokenAddress: tokenData.tokenAddress },
        tokenData,
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      console.log(
        `Token projected to MongoDB: ${tokenData.name} (${tokenData.symbol}) at ${tokenData.tokenAddress}`
      );
    } catch (error) {
      console.error("Error projecting token to MongoDB:", error);
      throw error;
    }
  }

  static async handleTokenPurchase(event: TokenPurchaseEvent): Promise<void> {
    try {
      const purchaseData = {
        eventId: event.id,
        wallet: event.wallet,
        tokenAddress: event.tokenAddress,
        amountIn: event.amountIn.toString(),
        amountOut: event.amountOut.toString(),
        priceBefore: event.priceBefore.toString(),
        priceAfter: event.priceAfter.toString(),
        timestamp: event.timestamp.toString(),
        blockNumber: event.blockNumber.toString(),
      };

      // Create new purchase record
      await TokenPurchase.create(purchaseData);

      // Calculate 24h volume
      const volumeData = await this.calculate24hVolume(event.tokenAddress);

      // Get current token to calculate new totalUsdtRaised
      const currentToken = await Token.findOne({
        tokenAddress: event.tokenAddress,
      });
      const currentUsdtRaised = BigInt(currentToken?.totalUsdtRaised || "0");
      const newUsdtRaised = (currentUsdtRaised + event.amountIn).toString();

      // Update token price, market cap, totalUsdtRaised, and 24h volume using priceAfter
      const priceAfter = event.priceAfter.toString(); // Price in wei
      const totalSupply = BigInt("1000000000"); // 1 billion tokens (count, not wei)
      const marketCap = (event.priceAfter * totalSupply).toString(); // Market cap in wei

      await Token.findOneAndUpdate(
        { tokenAddress: event.tokenAddress },
        {
          price: priceAfter,
          marketCap: marketCap,
          totalUsdtRaised: newUsdtRaised,
          volume24hBuy: volumeData.buyVolume,
          volume24hSell: volumeData.sellVolume,
          volume24hTotal: volumeData.totalVolume,
        },
        { new: true }
      );

      console.log(
        `Token purchase projected to MongoDB: ${
          event.wallet
        } bought ${event.amountOut.toString()} tokens for ${event.amountIn.toString()} USDT`
      );
      console.log(
        `Updated token price to ${priceAfter} wei, market cap to ${marketCap} wei, totalUsdtRaised to ${newUsdtRaised} wei, and 24h volume to ${volumeData.totalVolume} wei`
      );
    } catch (error) {
      console.error("Error projecting token purchase to MongoDB:", error);
      throw error;
    }
  }

  static async handleTokenSale(event: TokenSaleEvent): Promise<void> {
    try {
      const saleData = {
        eventId: event.id,
        wallet: event.wallet,
        tokenAddress: event.tokenAddress,
        amountIn: event.amountIn.toString(),
        amountOut: event.amountOut.toString(),
        priceBefore: event.priceBefore.toString(),
        priceAfter: event.priceAfter.toString(),
        timestamp: event.timestamp.toString(),
        blockNumber: event.blockNumber.toString(),
      };

      // Create new sale record
      await TokenSale.create(saleData);

      // Calculate 24h volume
      const volumeData = await this.calculate24hVolume(event.tokenAddress);

      // Get current token to calculate new totalUsdtRaised (subtract on sale)
      const currentToken = await Token.findOne({
        tokenAddress: event.tokenAddress,
      });
      const currentUsdtRaised = BigInt(currentToken?.totalUsdtRaised || "0");
      const newUsdtRaised = (currentUsdtRaised - event.amountOut).toString();

      // Update token price, market cap, totalUsdtRaised, and 24h volume using priceAfter
      const priceAfter = event.priceAfter.toString(); // Price in wei
      const totalSupply = BigInt("1000000000"); // 1 billion tokens (count, not wei)
      const marketCap = (event.priceAfter * totalSupply).toString(); // Market cap in wei

      await Token.findOneAndUpdate(
        { tokenAddress: event.tokenAddress },
        {
          price: priceAfter,
          marketCap: marketCap,
          totalUsdtRaised: newUsdtRaised,
          volume24hBuy: volumeData.buyVolume,
          volume24hSell: volumeData.sellVolume,
          volume24hTotal: volumeData.totalVolume,
        },
        { new: true }
      );

      console.log(
        `Token sale projected to MongoDB: ${
          event.wallet
        } sold ${event.amountIn.toString()} tokens for ${event.amountOut.toString()} USDT`
      );
      console.log(
        `Updated token price to ${priceAfter} wei, market cap to ${marketCap} wei, totalUsdtRaised to ${newUsdtRaised} wei, and 24h volume to ${volumeData.totalVolume} wei`
      );
    } catch (error) {
      console.error("Error projecting token sale to MongoDB:", error);
      throw error;
    }
  }

  static async getAllTokens(): Promise<IToken[]> {
    try {
      return await Token.find({}).sort({ createdAt: -1 }).lean();
    } catch (error) {
      console.error("Error getting all tokens from MongoDB:", error);
      throw error;
    }
  }

  static async getTokenByAddress(address: string): Promise<IToken | null> {
    try {
      return await Token.findOne({
        tokenAddress: { $regex: new RegExp(`^${address}$`, "i") },
      }).lean();
    } catch (error) {
      console.error("Error getting token by address from MongoDB:", error);
      throw error;
    }
  }

  static async getTokensByCreator(creator: string): Promise<IToken[]> {
    try {
      return await Token.find({
        creator: { $regex: new RegExp(`^${creator}$`, "i") },
      })
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      console.error("Error getting tokens by creator from MongoDB:", error);
      throw error;
    }
  }

  static async getRecentTokens(limit: number = 10): Promise<IToken[]> {
    try {
      return await Token.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    } catch (error) {
      console.error("Error getting recent tokens from MongoDB:", error);
      throw error;
    }
  }
}
