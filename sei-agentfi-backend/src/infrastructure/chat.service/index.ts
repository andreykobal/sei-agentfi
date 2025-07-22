// Export all types
export * from "./types";

// Export utility functions and helpers
export * from "./helpers";

// Export tools
export * from "./tools";

// Export tool executor
export * from "./tool-executor";

// Export chat handler
export * from "./chat-handler";

// Export main service
export { OpenAIService } from "./openai-service";

// Create and export singleton instance
import { OpenAIService } from "./openai-service";
export const openAIService = new OpenAIService();
