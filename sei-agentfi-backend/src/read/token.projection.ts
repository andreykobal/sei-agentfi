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

      // Update token price and market cap using priceAfter
      const priceAfter = event.priceAfter.toString(); // Price in wei
      const totalSupply = BigInt("1000000000"); // 1 billion tokens (count, not wei)
      const marketCap = (event.priceAfter * totalSupply).toString(); // Market cap in wei

      await Token.findOneAndUpdate(
        { tokenAddress: event.tokenAddress },
        {
          price: priceAfter,
          marketCap: marketCap,
        },
        { new: true }
      );

      console.log(
        `Token purchase projected to MongoDB: ${
          event.wallet
        } bought ${event.amountOut.toString()} tokens for ${event.amountIn.toString()} USDT`
      );
      console.log(
        `Updated token price to ${priceAfter} wei and market cap to ${marketCap} wei`
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

      // Update token price and market cap using priceAfter
      const priceAfter = event.priceAfter.toString(); // Price in wei
      const totalSupply = BigInt("1000000000"); // 1 billion tokens (count, not wei)
      const marketCap = (event.priceAfter * totalSupply).toString(); // Market cap in wei

      await Token.findOneAndUpdate(
        { tokenAddress: event.tokenAddress },
        {
          price: priceAfter,
          marketCap: marketCap,
        },
        { new: true }
      );

      console.log(
        `Token sale projected to MongoDB: ${
          event.wallet
        } sold ${event.amountIn.toString()} tokens for ${event.amountOut.toString()} USDT`
      );
      console.log(
        `Updated token price to ${priceAfter} wei and market cap to ${marketCap} wei`
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
