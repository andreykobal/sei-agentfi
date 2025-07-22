import OpenAI from "openai";

export interface TokenFinancials {
  price: string;
  marketCap: string;
  totalUsdtRaised: string;
  volume24hBuy: string;
  volume24hSell: string;
  volume24hTotal: string;
}

export interface FormattedToken {
  name: string;
  symbol: string;
  tokenAddress: string;
  creator: string;
  description: string;
  image: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  decimals: number;
  price: string;
  marketCap: string;
  totalUsdtRaised: string;
  volume24hBuy: string;
  volume24hSell: string;
  volume24hTotal: string;
  timestamp: Date;
  blockNumber: number;
  createdAt: Date;
}

export interface FunctionResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export interface ChatServiceConfig {
  MAX_CONTEXT_MESSAGES: number;
}

export interface TokenContextData {
  name?: string;
  symbol?: string;
  description?: string;
  [key: string]: any;
}

export type OpenAIMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;
export type OpenAITool = OpenAI.Chat.Completions.ChatCompletionTool;
