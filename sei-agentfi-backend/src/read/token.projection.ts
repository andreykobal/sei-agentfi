import { IToken, TokenCreatedEvent, Token } from "../models/token.model";

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
        initialSupply: event.initialSupply.toString(),
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
