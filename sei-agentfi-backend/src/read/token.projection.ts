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
  TokenHolder,
} from "../models/token.model";

// Constants
const BONDING_CURVE_ADDRESS = "0x34F494c5FC1535Bc20DcECa39b6A590C743fc088";
const TOTAL_SUPPLY = BigInt("1000000000000000000000000000"); // 1 billion tokens in wei (18 decimals)

export class TokenProjection {
  // Helper function to calculate holder percentages and sort by descending percentage
  private static calculateHolderPercentages(
    holders: TokenHolder[]
  ): TokenHolder[] {
    console.log("🔍 [HOLDER CALC] Starting percentage calculation...");
    console.log(
      `🔍 [HOLDER CALC] TOTAL_SUPPLY constant: ${TOTAL_SUPPLY.toString()}`
    );
    console.log(
      `🔍 [HOLDER CALC] Total supply in tokens: ${
        Number(TOTAL_SUPPLY) / Math.pow(10, 18)
      }`
    );
    console.log(`🔍 [HOLDER CALC] Input holders count: ${holders.length}`);

    const result = holders
      .map((holder, index) => {
        // Convert BigInt to Number for floating point calculation
        // holder.balance and TOTAL_SUPPLY are both in wei (18 decimals)
        const balanceNum = Number(holder.balance) / Math.pow(10, 18); // Convert wei to tokens
        const totalSupplyNum = Number(TOTAL_SUPPLY) / Math.pow(10, 18); // Convert wei to tokens
        const percentage = (balanceNum / totalSupplyNum) * 100;

        console.log(`🔍 [HOLDER CALC] Holder ${index + 1}:`);
        console.log(`  - Address: ${holder.address}`);
        console.log(`  - Balance (wei): ${holder.balance}`);
        console.log(`  - Balance (tokens): ${balanceNum}`);
        console.log(`  - Calculated percentage: ${percentage}%`);
        console.log(
          `  - Rounded percentage: ${Math.round(percentage * 100) / 100}%`
        );
        console.log(
          `  - Original holder object:`,
          JSON.stringify(holder, null, 2)
        );

        const newHolder = {
          address: holder.address,
          balance: holder.balance,
          percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
        };

        console.log(
          `  - New holder object:`,
          JSON.stringify(newHolder, null, 2)
        );

        return newHolder;
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10); // Keep only top 10 holders

    console.log("🔍 [HOLDER CALC] Final sorted holders:");
    result.forEach((holder, index) => {
      console.log(`  ${index + 1}. ${holder.address}: ${holder.percentage}%`);
    });

    return result;
  }

  // Helper function to update holders when tokens are bought
  private static updateHoldersOnBuy(
    currentHolders: TokenHolder[],
    buyer: string,
    tokensReceived: bigint
  ): TokenHolder[] {
    const holders = [...currentHolders];

    // Find if buyer already exists
    const existingHolderIndex = holders.findIndex(
      (h) => h.address.toLowerCase() === buyer.toLowerCase()
    );

    if (existingHolderIndex >= 0 && holders[existingHolderIndex]) {
      // Update existing holder
      const currentBalance = BigInt(holders[existingHolderIndex].balance);
      holders[existingHolderIndex].balance = (
        currentBalance + tokensReceived
      ).toString();
    } else {
      // Add new holder
      holders.push({
        address: buyer,
        balance: tokensReceived.toString(),
        percentage: 0, // Will be calculated in calculateHolderPercentages
      });
    }

    // Update bonding curve balance (subtract tokens that were bought)
    const bondingCurveIndex = holders.findIndex(
      (h) => h.address.toLowerCase() === BONDING_CURVE_ADDRESS.toLowerCase()
    );
    if (bondingCurveIndex >= 0 && holders[bondingCurveIndex]) {
      const currentBalance = BigInt(holders[bondingCurveIndex].balance);
      holders[bondingCurveIndex].balance = (
        currentBalance - tokensReceived
      ).toString();
    }

    return this.calculateHolderPercentages(holders);
  }

  // Helper function to update holders when tokens are sold
  private static updateHoldersOnSell(
    currentHolders: TokenHolder[],
    seller: string,
    tokensSold: bigint
  ): TokenHolder[] {
    const holders = [...currentHolders];

    // Find seller and update balance
    const sellerIndex = holders.findIndex(
      (h) => h.address.toLowerCase() === seller.toLowerCase()
    );

    if (sellerIndex >= 0 && holders[sellerIndex]) {
      const currentBalance = BigInt(holders[sellerIndex].balance);
      const newBalance = currentBalance - tokensSold;

      if (newBalance <= 0) {
        // Remove holder if balance is 0 or negative
        holders.splice(sellerIndex, 1);
      } else {
        holders[sellerIndex].balance = newBalance.toString();
      }
    }

    // Update bonding curve balance (add tokens that were sold back)
    const bondingCurveIndex = holders.findIndex(
      (h) => h.address.toLowerCase() === BONDING_CURVE_ADDRESS.toLowerCase()
    );
    if (bondingCurveIndex >= 0 && holders[bondingCurveIndex]) {
      const currentBalance = BigInt(holders[bondingCurveIndex].balance);
      holders[bondingCurveIndex].balance = (
        currentBalance + tokensSold
      ).toString();
    } else {
      // Add bonding curve if it doesn't exist (shouldn't happen but safety check)
      holders.push({
        address: BONDING_CURVE_ADDRESS,
        balance: tokensSold.toString(),
        percentage: 0,
      });
    }

    return this.calculateHolderPercentages(holders);
  }

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
      // Initialize holders with bonding curve owning all tokens
      const initialHolders: TokenHolder[] = [
        {
          address: BONDING_CURVE_ADDRESS,
          balance: TOTAL_SUPPLY.toString(),
          percentage: 100.0,
        },
      ];

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
        holders: initialHolders,
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

      // Get current token to calculate new totalUsdtRaised and update holders
      const currentToken = await Token.findOne({
        tokenAddress: event.tokenAddress,
      });
      const currentUsdtRaised = BigInt(currentToken?.totalUsdtRaised || "0");
      const newUsdtRaised = (currentUsdtRaised + event.amountIn).toString();

      // Update holders on purchase
      const currentHolders = currentToken?.holders || [];
      console.log(
        "🔍 [TOKEN PURCHASE] Current holders before update:",
        currentHolders.length
      );
      currentHolders.forEach((holder, index) => {
        console.log(
          `  ${index + 1}. ${holder.address}: ${holder.balance} wei (${
            holder.percentage
          }%)`
        );
      });
      console.log(
        `🔍 [TOKEN PURCHASE] Buyer: ${
          event.wallet
        }, Tokens received: ${event.amountOut.toString()} wei`
      );

      const updatedHolders = this.updateHoldersOnBuy(
        currentHolders,
        event.wallet,
        event.amountOut
      );

      console.log(
        "🔍 [TOKEN PURCHASE] Updated holders after purchase:",
        updatedHolders.length
      );

      // Update token price, market cap, totalUsdtRaised, holders, and 24h volume using priceAfter
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
          holders: updatedHolders,
        },
        { new: true }
      );

      console.log(
        `Token purchase projected to MongoDB: ${
          event.wallet
        } bought ${event.amountOut.toString()} tokens for ${event.amountIn.toString()} USDT`
      );
      console.log(
        `Updated token price to ${priceAfter} wei, market cap to ${marketCap} wei, totalUsdtRaised to ${newUsdtRaised} wei, 24h volume to ${volumeData.totalVolume} wei, and ${updatedHolders.length} holders`
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

      // Get current token to calculate new totalUsdtRaised (subtract on sale) and update holders
      const currentToken = await Token.findOne({
        tokenAddress: event.tokenAddress,
      });
      const currentUsdtRaised = BigInt(currentToken?.totalUsdtRaised || "0");
      const newUsdtRaised = (currentUsdtRaised - event.amountOut).toString();

      // Update holders on sale
      const currentHolders = currentToken?.holders || [];
      console.log(
        "🔍 [TOKEN SALE] Current holders before update:",
        currentHolders.length
      );
      currentHolders.forEach((holder, index) => {
        console.log(
          `  ${index + 1}. ${holder.address}: ${holder.balance} wei (${
            holder.percentage
          }%)`
        );
      });
      console.log(
        `🔍 [TOKEN SALE] Seller: ${
          event.wallet
        }, Tokens sold: ${event.amountIn.toString()} wei`
      );

      const updatedHolders = this.updateHoldersOnSell(
        currentHolders,
        event.wallet,
        event.amountIn
      );

      console.log(
        "🔍 [TOKEN SALE] Updated holders after sale:",
        updatedHolders.length
      );

      // Update token price, market cap, totalUsdtRaised, holders, and 24h volume using priceAfter
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
          holders: updatedHolders,
        },
        { new: true }
      );

      console.log(
        `Token sale projected to MongoDB: ${
          event.wallet
        } sold ${event.amountIn.toString()} tokens for ${event.amountOut.toString()} USDT`
      );
      console.log(
        `Updated token price to ${priceAfter} wei, market cap to ${marketCap} wei, totalUsdtRaised to ${newUsdtRaised} wei, 24h volume to ${volumeData.totalVolume} wei, and ${updatedHolders.length} holders`
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
