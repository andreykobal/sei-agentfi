// Export all types and interfaces
export * from "./config";

// Import all functions
import { createBot, startBot, stopBot, deleteBot } from "./bot-management";

import { executeTrade } from "./trading";

import {
  analyzePriceImpact,
  calculateGrowthProgress,
  adjustTradingStrategy,
} from "./analysis";

import {
  scheduleNextTrade,
  stopBotTimer,
  initializeBots,
  cleanup,
} from "./scheduling";

import { getBotStatus } from "./status";

// Export all functions
export {
  createBot,
  startBot,
  stopBot,
  deleteBot,
  executeTrade,
  analyzePriceImpact,
  calculateGrowthProgress,
  adjustTradingStrategy,
  scheduleNextTrade,
  stopBotTimer,
  initializeBots,
  cleanup,
  getBotStatus,
};

// Create MarketMakerService class for backward compatibility
export class MarketMakerService {
  // Bot management
  static createBot = createBot;
  static startBot = startBot;
  static stopBot = stopBot;
  static deleteBot = deleteBot;

  // Status
  static getBotStatus = getBotStatus;

  // Initialization and cleanup
  static initializeBots = initializeBots;
  static cleanup = cleanup;
}
