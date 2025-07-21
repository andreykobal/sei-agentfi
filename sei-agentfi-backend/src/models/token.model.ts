import mongoose, { Schema, Document } from "mongoose";

export interface IToken extends Document {
  // Event data from TokenFactory
  eventId: string; // Event ID
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  timestamp: string; // Store as string to handle bigint
  blockNumber: string; // Store as string to handle bigint

  // Computed fields for API
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenCreatedEvent {
  id: string;
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  timestamp: bigint;
  blockNumber: bigint;
}

export interface ITokenPurchase extends Document {
  eventId: string;
  wallet: string;
  tokenAddress: string;
  amountIn: string; // USDT amount spent (wei as string)
  amountOut: string; // Tokens received (wei as string)
  priceBefore: string; // Token price before purchase (wei as string)
  priceAfter: string; // Token price after purchase (wei as string)
  timestamp: string;
  blockNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenPurchaseEvent {
  id: string;
  wallet: string;
  tokenAddress: string;
  amountIn: bigint;
  amountOut: bigint;
  priceBefore: bigint;
  priceAfter: bigint;
  timestamp: bigint;
  blockNumber: bigint;
}

export interface ITokenSale extends Document {
  eventId: string;
  wallet: string;
  tokenAddress: string;
  amountIn: string; // Tokens sold (wei as string)
  amountOut: string; // USDT received (wei as string)
  priceBefore: string; // Token price before sale (wei as string)
  priceAfter: string; // Token price after sale (wei as string)
  timestamp: string;
  blockNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenSaleEvent {
  id: string;
  wallet: string;
  tokenAddress: string;
  amountIn: bigint;
  amountOut: bigint;
  priceBefore: bigint;
  priceAfter: bigint;
  timestamp: bigint;
  blockNumber: bigint;
}

const tokenSchema = new Schema<IToken>(
  {
    eventId: { type: String, required: true },
    tokenAddress: { type: String, required: true, unique: true, index: true },
    creator: { type: String, required: true, index: true },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    decimals: { type: Number, required: true },
    description: { type: String, required: false },
    image: { type: String, required: false },
    website: { type: String, required: false },
    twitter: { type: String, required: false },
    telegram: { type: String, required: false },
    discord: { type: String, required: false },
    timestamp: { type: String, required: true, index: true },
    blockNumber: { type: String, required: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

const tokenPurchaseSchema = new Schema<ITokenPurchase>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    wallet: { type: String, required: true, index: true },
    tokenAddress: { type: String, required: true, index: true },
    amountIn: { type: String, required: true },
    amountOut: { type: String, required: true },
    priceBefore: { type: String, required: true },
    priceAfter: { type: String, required: true },
    timestamp: { type: String, required: true, index: true },
    blockNumber: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const tokenSaleSchema = new Schema<ITokenSale>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    wallet: { type: String, required: true, index: true },
    tokenAddress: { type: String, required: true, index: true },
    amountIn: { type: String, required: true },
    amountOut: { type: String, required: true },
    priceBefore: { type: String, required: true },
    priceAfter: { type: String, required: true },
    timestamp: { type: String, required: true, index: true },
    blockNumber: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Token = mongoose.model<IToken>("Token", tokenSchema);
export const TokenPurchase = mongoose.model<ITokenPurchase>(
  "TokenPurchase",
  tokenPurchaseSchema
);
export const TokenSale = mongoose.model<ITokenSale>(
  "TokenSale",
  tokenSaleSchema
);
