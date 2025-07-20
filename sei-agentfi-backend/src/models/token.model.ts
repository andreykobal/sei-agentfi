import mongoose, { Schema, Document } from "mongoose";

export interface IToken extends Document {
  // Event data from TokenFactory
  eventId: string; // Event ID
  tokenAddress: string;
  creator: string;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: string; // Store as string to handle bigint
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
  initialSupply: bigint;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
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
    initialSupply: { type: String, required: true },
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

export const Token = mongoose.model<IToken>("Token", tokenSchema);
