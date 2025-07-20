import { ponder } from "ponder:registry";
import { tokenCreated } from "ponder:schema";
import { TokenProjection } from "../read/token.projection";
import { TokenCreatedEvent, Token } from "../models/token.model";
import { connectToMongoDB } from "../config/database";

// Ensure MongoDB connection is established
connectToMongoDB().catch(console.error);

// BondingCurve Events
ponder.on("BondingCurve:TokenCreated", async ({ event, context }) => {
  // Note: TypeScript types will need to be updated after regenerating ABIs
  // with the new BondingCurve contract that includes metadata fields
  const eventArgs = event.args as any;

  await context.db.insert(tokenCreated).values({
    id: event.id,
    tokenAddress: eventArgs.tokenAddress,
    creator: eventArgs.creator,
    name: eventArgs.name,
    symbol: eventArgs.symbol,
    decimals: eventArgs.decimals,
    initialSupply: eventArgs.initialSupply,
    description: eventArgs.description,
    image: eventArgs.image,
    website: eventArgs.website,
    twitter: eventArgs.twitter,
    telegram: eventArgs.telegram,
    discord: eventArgs.discord,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });

  // Send event to projection for read model after Ponder indexing
  const tokenCreatedEvent: TokenCreatedEvent = {
    id: event.id,
    tokenAddress: eventArgs.tokenAddress,
    creator: eventArgs.creator,
    name: eventArgs.name,
    symbol: eventArgs.symbol,
    decimals: eventArgs.decimals,
    initialSupply: eventArgs.initialSupply,
    description: eventArgs.description,
    image: eventArgs.image,
    website: eventArgs.website,
    twitter: eventArgs.twitter,
    telegram: eventArgs.telegram,
    discord: eventArgs.discord,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  };

  console.log("Token created event:", tokenCreatedEvent);

  try {
    await TokenProjection.handleTokenCreated(tokenCreatedEvent);
  } catch (error) {
    console.error("Error in token projection:", error);
    // Don't throw here to avoid breaking the indexer
  }
});
