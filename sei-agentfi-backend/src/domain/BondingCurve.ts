import { ponder } from "ponder:registry";
import { tokenCreated, tokenPurchase, tokenSale } from "ponder:schema";
import { TokenProjection } from "../projections/token.projection";
import {
  TokenCreatedEvent,
  TokenPurchaseEvent,
  TokenSaleEvent,
  Token,
} from "../models/token.model";
import { connectToMongoDB } from "../config/database.config";

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

ponder.on("BondingCurve:TokenPurchase", async ({ event, context }) => {
  const eventArgs = event.args as any;

  await context.db.insert(tokenPurchase).values({
    id: event.id,
    wallet: eventArgs.wallet,
    tokenAddress: eventArgs.tokenAddress,
    amountIn: eventArgs.amountIn,
    amountOut: eventArgs.amountOut,
    priceBefore: eventArgs.priceBefore,
    priceAfter: eventArgs.priceAfter,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });

  // Send event to projection for read model after Ponder indexing
  const tokenPurchaseEvent: TokenPurchaseEvent = {
    id: event.id,
    wallet: eventArgs.wallet,
    tokenAddress: eventArgs.tokenAddress,
    amountIn: eventArgs.amountIn,
    amountOut: eventArgs.amountOut,
    priceBefore: eventArgs.priceBefore,
    priceAfter: eventArgs.priceAfter,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  };

  console.log("Token purchase event:", tokenPurchaseEvent);

  try {
    await TokenProjection.handleTokenPurchase(tokenPurchaseEvent);
  } catch (error) {
    console.error("Error in token purchase projection:", error);
    // Don't throw here to avoid breaking the indexer
  }
});

ponder.on("BondingCurve:TokenSale", async ({ event, context }) => {
  const eventArgs = event.args as any;

  await context.db.insert(tokenSale).values({
    id: event.id,
    wallet: eventArgs.wallet,
    tokenAddress: eventArgs.tokenAddress,
    amountIn: eventArgs.amountIn,
    amountOut: eventArgs.amountOut,
    priceBefore: eventArgs.priceBefore,
    priceAfter: eventArgs.priceAfter,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  });

  // Send event to projection for read model after Ponder indexing
  const tokenSaleEvent: TokenSaleEvent = {
    id: event.id,
    wallet: eventArgs.wallet,
    tokenAddress: eventArgs.tokenAddress,
    amountIn: eventArgs.amountIn,
    amountOut: eventArgs.amountOut,
    priceBefore: eventArgs.priceBefore,
    priceAfter: eventArgs.priceAfter,
    timestamp: event.block.timestamp,
    blockNumber: event.block.number,
  };

  console.log("Token sale event:", tokenSaleEvent);

  try {
    await TokenProjection.handleTokenSale(tokenSaleEvent);
  } catch (error) {
    console.error("Error in token sale projection:", error);
    // Don't throw here to avoid breaking the indexer
  }
});
